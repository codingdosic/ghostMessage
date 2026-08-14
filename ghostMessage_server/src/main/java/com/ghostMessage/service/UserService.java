package com.ghostMessage.service;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import com.ghostMessage.domain.User;
import com.ghostMessage.dto.UserResponseDTO;
import com.ghostMessage.exception.ApiException;
import com.ghostMessage.repository.UserRepository;
import com.ghostMessage.util.SecurityCodeHasher;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserService {
    private final UserRepository userRepository;

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
        User user = userRepository.findById(uuid)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found."));

        if (!SecurityCodeHasher.matches(securityCode, user.getSecurityCode())) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid security code.");
        }

        migrateLegacySecurityCodeIfNeeded(user, securityCode);
        return UserResponseDTO.from(user);
    }

    public void validateUser(UUID uuid, String securityCode) {
        User user = userRepository.findById(uuid)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "User not found."));

        if (securityCode == null || !SecurityCodeHasher.matches(securityCode, user.getSecurityCode())) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Unauthorized: Invalid security code.");
        }

        migrateLegacySecurityCodeIfNeeded(user, securityCode);
    }

    private void migrateLegacySecurityCodeIfNeeded(User user, String plainSecurityCode) {
        if (SecurityCodeHasher.isLegacyPlainText(user.getSecurityCode())) {
            user.setSecurityCode(SecurityCodeHasher.hash(plainSecurityCode));
            userRepository.save(user);
        }
    }
}
