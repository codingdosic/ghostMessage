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

import com.ghostMessage.domain.User;
import com.ghostMessage.exception.ApiException;
import com.ghostMessage.repository.UserRepository;
import com.ghostMessage.util.SecurityCodeHasher;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private UserService userService;

    @Test
    @DisplayName("사용자 검증 성공 - 유효한 보안 코드")
    void validateUser_Success() {
        UUID userId = UUID.randomUUID();
        String plainCode = "ABCD1234";
        User user = new User();
        user.setUuid(userId);
        user.setSecurityCode(SecurityCodeHasher.hash(plainCode));

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

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

        ApiException exception = assertThrows(ApiException.class, () -> {
            userService.validateUser(userId, "any-code");
        });

        assertEquals("User not found.", exception.getMessage());
    }
}
