package com.ghostMessage.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.RedisScript;
import org.springframework.http.HttpStatus;

import com.ghostMessage.domain.User;
import com.ghostMessage.exception.ApiException;
import com.ghostMessage.repository.UserRepository;
import com.ghostMessage.util.SecurityCodeHasher;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private StringRedisTemplate redisTemplate;

    @InjectMocks
    private UserService userService;

    @SuppressWarnings("unchecked")
    private void allowAttempt(long count) {
        when(redisTemplate.execute(any(RedisScript.class), anyList(), eq("900"))).thenReturn(count);
    }

    @Test
    @DisplayName("사용자 검증 성공 - 유효한 보안 코드")
    void validateUser_Success() {
        UUID userId = UUID.randomUUID();
        String plainCode = "ABCD1234";
        User user = new User();
        user.setUuid(userId);
        user.setSecurityCode(SecurityCodeHasher.hash(plainCode));

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        allowAttempt(1);

        assertDoesNotThrow(() -> userService.validateUser(userId, plainCode));
    }

    @Test
    @DisplayName("사용자 검증 성공 - 레거시 평문 코드")
    void validateUser_Success_LegacyPlainText() {
        UUID userId = UUID.randomUUID();
        String plainCode = "LEGACY01";
        User user = new User();
        user.setUuid(userId);
        user.setSecurityCode(plainCode);

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        allowAttempt(1);

        assertDoesNotThrow(() -> userService.validateUser(userId, plainCode));
        verify(userRepository, times(1)).save(user);
    }

    @Test
    @DisplayName("사용자 검증 실패 - 잘못된 보안 코드")
    void validateUser_Fail_InvalidCode() {
        UUID userId = UUID.randomUUID();
        User user = new User();
        user.setUuid(userId);
        user.setSecurityCode(SecurityCodeHasher.hash("correct-code"));

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        allowAttempt(1);

        ApiException exception = assertThrows(ApiException.class, () -> {
            userService.validateUser(userId, "wrong-code");
        });

        assertEquals("Unauthorized: Invalid security code.", exception.getMessage());
    }

    @Test
    @DisplayName("사용자 검증 실패 - 존재하지 않는 사용자")
    void validateUser_Fail_UserNotFound() {
        UUID userId = UUID.randomUUID();
        when(userRepository.findById(userId)).thenReturn(Optional.empty());
        allowAttempt(1);

        ApiException exception = assertThrows(ApiException.class, () -> {
            userService.validateUser(userId, "any-code");
        });

        assertEquals("User not found.", exception.getMessage());
    }

    @Test
    void recoverUser_Success() {
        UUID userId = UUID.randomUUID();
        User user = new User();
        user.setUuid(userId);
        user.setSecurityCode(SecurityCodeHasher.hash("ABCD1234"));
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        allowAttempt(1);

        assertEquals(userId, userService.recoverUser(userId, "ABCD1234").getUuid());
        verify(redisTemplate).delete("security-code-attempts:" + userId);
    }

    @Test
    void recoverUser_Fail_InvalidCode() {
        UUID userId = UUID.randomUUID();
        User user = new User();
        user.setSecurityCode(SecurityCodeHasher.hash("ABCD1234"));
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        allowAttempt(5);

        ApiException exception = assertThrows(ApiException.class,
                () -> userService.recoverUser(userId, "WRONG123"));
        assertEquals(HttpStatus.UNAUTHORIZED, exception.getStatus());
        verify(redisTemplate, never()).delete(anyString());
    }

    @Test
    void recoverUser_Fail_TooManyAttempts() {
        UUID userId = UUID.randomUUID();
        allowAttempt(6);

        ApiException exception = assertThrows(ApiException.class,
                () -> userService.recoverUser(userId, "ABCD1234"));
        assertEquals(HttpStatus.TOO_MANY_REQUESTS, exception.getStatus());
        verifyNoInteractions(userRepository);
    }
}
