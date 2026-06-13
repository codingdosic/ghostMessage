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
import com.ghostMessage.repository.UserRepository;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private UserService userService;

    @Test
    @DisplayName("사용자 검증 성공 - 유효한 보안 코드")
    void validateUser_Success() {
        // given
        UUID userId = UUID.randomUUID();
        String securityCode = "correct-code";
        User user = new User();
        user.setUuid(userId);
        user.setSecurityCode(securityCode);

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        // when & then
        assertDoesNotThrow(() -> {
            userService.validateUser(userId, securityCode);
        });
    }

    @Test
    @DisplayName("사용자 검증 실패 - 잘못된 보안 코드")
    void validateUser_Fail_InvalidCode() {
        // given
        UUID userId = UUID.randomUUID();
        User user = new User();
        user.setUuid(userId);
        user.setSecurityCode("correct-code");

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        // when & then
        RuntimeException exception = assertThrows(RuntimeException.class, () -> {
            userService.validateUser(userId, "wrong-code");
        });

        assertEquals("Unauthorized: Invalid security code.", exception.getMessage());
    }

    @Test
    @DisplayName("사용자 검증 실패 - 존재하지 않는 사용자")
    void validateUser_Fail_UserNotFound() {
        // given
        UUID userId = UUID.randomUUID();
        when(userRepository.findById(userId)).thenReturn(Optional.empty());

        // when & then
        RuntimeException exception = assertThrows(RuntimeException.class, () -> {
            userService.validateUser(userId, "any-code");
        });

        assertEquals("User not found.", exception.getMessage());
    }
}
