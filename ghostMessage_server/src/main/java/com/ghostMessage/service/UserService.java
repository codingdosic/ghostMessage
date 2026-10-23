package com.ghostMessage.service;

import org.springframework.http.HttpStatus;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Service;

import com.ghostMessage.domain.User;
import com.ghostMessage.dto.UserResponseDTO;
import com.ghostMessage.exception.ApiException;
import com.ghostMessage.repository.UserRepository;
import com.ghostMessage.util.SecurityCodeHasher;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserService {
    private static final int MAX_ATTEMPTS = 5;
    private static final String WINDOW_SECONDS = "900";
    private static final DefaultRedisScript<Long> COUNT_ATTEMPT = new DefaultRedisScript<>(
            "local n = redis.call('INCR', KEYS[1]); if n == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end; return n",
            Long.class);

    private final UserRepository userRepository;
    private final StringRedisTemplate redisTemplate;

    @Transactional
    public UserResponseDTO registerNewUser(String nickname) {
        User user = new User();
        user.setNickname(nickname != null ? nickname : "GHOST_" + UUID.randomUUID().toString().substring(0, 7));

        String plainCode = SecurityCodeHasher.generateCode(8);
        user.setSecurityCode(SecurityCodeHasher.hash(plainCode));

        User saved = userRepository.save(user);
        return UserResponseDTO.from(saved, plainCode);
    }

    public UserResponseDTO getUser(UUID uuid) {
        User user = userRepository.findById(uuid)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found."));
        return UserResponseDTO.from(user);
    }

    public UserResponseDTO recoverUser(UUID uuid, String securityCode) {
        String attemptKey = reserveAttempt(uuid);
        User user = userRepository.findById(uuid)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found."));

        if (!SecurityCodeHasher.matches(securityCode, user.getSecurityCode())) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid security code.");
        }

        redisTemplate.delete(attemptKey);
        migrateLegacySecurityCodeIfNeeded(user, securityCode);
        return UserResponseDTO.from(user);
    }

    public void validateUser(UUID uuid, String securityCode) {
        String attemptKey = reserveAttempt(uuid);
        User user = userRepository.findById(uuid)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "User not found."));

        if (securityCode == null || !SecurityCodeHasher.matches(securityCode, user.getSecurityCode())) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Unauthorized: Invalid security code.");
        }

        redisTemplate.delete(attemptKey);
        migrateLegacySecurityCodeIfNeeded(user, securityCode);
    }

    private String reserveAttempt(UUID uuid) {
        String key = "security-code-attempts:" + uuid;
        Long attempts = redisTemplate.execute(COUNT_ATTEMPT, List.of(key), WINDOW_SECONDS);
        if (attempts == null || attempts > MAX_ATTEMPTS) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "Too many security code attempts. Try again in 15 minutes.");
        }
        return key;
    }

    private void migrateLegacySecurityCodeIfNeeded(User user, String plainSecurityCode) {
        if (SecurityCodeHasher.isLegacyPlainText(user.getSecurityCode())) {
            user.setSecurityCode(SecurityCodeHasher.hash(plainSecurityCode));
            userRepository.save(user);
        }
    }
}
