package com.ghostMessage.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import java.time.Instant;
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
import com.ghostMessage.domain.Vote;
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
        user.setLastMessageResetAt(Instant.now()); // 자동 리셋 방지

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
        user.setLastMessageResetAt(Instant.now()); // 자동 리셋 방지

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

    @Test
    @DisplayName("투표 성공 - 첫 투표 (추천)")
    void vote_Success_FirstTime() {
        // given
        Long messageId = 1L;
        UUID userId = UUID.randomUUID();
        User user = new User();
        user.setDailyVoteCount(0);
        user.setLastVoteResetAt(Instant.now());

        Message message = new Message();
        message.setId(messageId);
        message.setUpVoteScore(0);
        message.setDownVoteScore(0);

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(messageRepository.findByIdWithLock(messageId)).thenReturn(Optional.of(message));
        when(voteRepository.findByMessageIdAndUserId(messageId, userId)).thenReturn(Optional.empty());

        // when
        MessageResponseDTO response = messageService.vote(messageId, "UP", userId);

        // then
        assertEquals(1, response.getUpVoteScore());
        assertEquals(1, user.getDailyVoteCount());
        verify(voteRepository, times(1)).save(any(Vote.class));
    }

    @Test
    @DisplayName("투표 실패 - 일일 제한(20회) 초과")
    void vote_Fail_LimitExceeded() {
        // given
        Long messageId = 1L;
        UUID userId = UUID.randomUUID();
        User user = new User();
        user.setDailyVoteCount(20);
        user.setLastVoteResetAt(Instant.now());

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        // when & then
        RuntimeException exception = assertThrows(RuntimeException.class, () -> {
            messageService.vote(messageId, "UP", userId);
        });

        assertEquals("Daily vote limit exceeded.", exception.getMessage());
    }

    @Test
    @DisplayName("투표 실패 - 동일한 타입 중복 투표")
    void vote_Fail_Duplicate() {
        // given
        Long messageId = 1L;
        UUID userId = UUID.randomUUID();
        User user = new User();
        user.setDailyVoteCount(5);
        user.setLastVoteResetAt(Instant.now());

        Message message = new Message();
        message.setId(messageId);

        Vote existingVote = new Vote(messageId, userId, "UP");

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(messageRepository.findByIdWithLock(messageId)).thenReturn(Optional.of(message));
        when(voteRepository.findByMessageIdAndUserId(messageId, userId)).thenReturn(Optional.of(existingVote));

        // when & then
        RuntimeException exception = assertThrows(RuntimeException.class, () -> {
            messageService.vote(messageId, "UP", userId);
        });

        assertEquals("You have already voted.", exception.getMessage());
    }

    @Test
    @DisplayName("투표 변경 성공 - 추천 -> 비추천")
    void vote_Success_ChangeVote() {
        // given
        Long messageId = 1L;
        UUID userId = UUID.randomUUID();
        User user = new User();
        user.setDailyVoteCount(5);
        user.setLastVoteResetAt(Instant.now());

        Message message = new Message();
        message.setId(messageId);
        message.setUpVoteScore(1);
        message.setDownVoteScore(0);

        Vote existingVote = new Vote(messageId, userId, "UP");

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(messageRepository.findByIdWithLock(messageId)).thenReturn(Optional.of(message));
        when(voteRepository.findByMessageIdAndUserId(messageId, userId)).thenReturn(Optional.of(existingVote));

        // when
        MessageResponseDTO response = messageService.vote(messageId, "DOWN", userId);

        // then
        assertEquals(0, response.getUpVoteScore()); // 추천 취소
        assertEquals(1, response.getDownVoteScore()); // 비추천 반영
        assertEquals("DOWN", existingVote.getVoteType()); // 투표 기록 업데이트 확인
    }
}
