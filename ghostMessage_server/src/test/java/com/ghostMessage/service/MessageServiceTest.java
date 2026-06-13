package com.ghostMessage.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.ghostMessage.domain.Message;
import com.ghostMessage.domain.User;
import com.ghostMessage.dto.MessageRequestDTO;
import com.ghostMessage.dto.MessageResponseDTO;
import com.ghostMessage.repository.MessageRepository;
import com.ghostMessage.repository.UserRepository;
import com.ghostMessage.repository.VoteRepository;

@ExtendWith(MockitoExtension.class)
class MessageServiceTest {

    @Mock
    private MessageRepository messageRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private VoteRepository voteRepository;

    @InjectMocks
    private MessageService messageService;

    @Test
    @DisplayName("메시지 작성 성공 - 일일 제한(10회) 이내")
    void createMessage_Success() {
        // given
        UUID userId = UUID.randomUUID();
        User user = new User();
        user.setUuid(userId);
        user.setDailyMessageCount(9); // 현재 9회 작성 상태

        MessageRequestDTO dto = new MessageRequestDTO();
        dto.setAuthorId(userId);
        dto.setPageUrl("https://example.com");
        dto.setAnchorKey("key");
        dto.setContent("Hello World");

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(messageRepository.save(any(Message.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // when
        MessageResponseDTO response = messageService.createMessage(dto);

        // then
        assertNotNull(response);
        assertEquals(10, user.getDailyMessageCount()); // 카운트가 10으로 증가했는지 확인
        verify(messageRepository, times(1)).save(any(Message.class));
    }

    @Test
    @DisplayName("메시지 작성 실패 - 일일 제한(10회) 초과")
    void createMessage_Fail_LimitExceeded() {
        // given
        UUID userId = UUID.randomUUID();
        User user = new User();
        user.setUuid(userId);
        user.setDailyMessageCount(10); // 이미 10회 작성 상태

        MessageRequestDTO dto = new MessageRequestDTO();
        dto.setAuthorId(userId);
        dto.setPageUrl("https://example.com");
        dto.setAnchorKey("key");

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        // when & then
        RuntimeException exception = assertThrows(RuntimeException.class, () -> {
            messageService.createMessage(dto);
        });

        assertEquals("Daily message limit exceeded.", exception.getMessage());
        verify(messageRepository, never()).save(any(Message.class));
    }
}
