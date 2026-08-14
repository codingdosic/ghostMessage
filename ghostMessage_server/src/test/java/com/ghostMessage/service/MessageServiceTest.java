package com.ghostMessage.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;
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
import com.ghostMessage.exception.ApiException;
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

    @Mock
    private MessageCacheService messageCacheService;

    @InjectMocks
    private MessageService messageService;

    @Test
    @DisplayName("메시지 작성 성공 - 일일 제한(10회) 이내")
    void createMessage_Success() {
        UUID userId = UUID.randomUUID();
        User user = new User();
        user.setUuid(userId);
        user.setDailyMessageCount(9);
        user.setLastMessageResetAt(Instant.now());

        MessageRequestDTO dto = new MessageRequestDTO();
        dto.setAuthorId(userId);
        dto.setPageUrl("https://example.com");
        dto.setAnchorKey("key");
        dto.setContent("Hello World");

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(messageRepository.save(any(Message.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(userRepository.findByUuidIn(any())).thenReturn(List.of(user));

        MessageResponseDTO response = messageService.createMessage(dto);

        assertNotNull(response);
        assertEquals(10, user.getDailyMessageCount());
        verify(messageRepository, times(1)).save(any(Message.class));
    }

    @Test
    @DisplayName("메시지 작성 실패 - 일일 제한(10회) 초과")
    void createMessage_Fail_LimitExceeded() {
        UUID userId = UUID.randomUUID();
        User user = new User();
        user.setUuid(userId);
        user.setDailyMessageCount(10);
        user.setLastMessageResetAt(Instant.now());

        MessageRequestDTO dto = new MessageRequestDTO();
        dto.setAuthorId(userId);
        dto.setPageUrl("https://example.com");
        dto.setAnchorKey("key");

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        ApiException exception = assertThrows(ApiException.class, () -> messageService.createMessage(dto));

        assertEquals("Daily message limit exceeded.", exception.getMessage());
        verify(messageRepository, never()).save(any(Message.class));
    }

    @Test
    @DisplayName("투표 성공 - 첫 투표 (추천)")
    void vote_Success_FirstTime() {
        Long messageId = 1L;
        UUID userId = UUID.randomUUID();
        User user = new User();
        user.setDailyVoteCount(0);
        user.setLastVoteResetAt(Instant.now());

        Message message = new Message();
        message.setId(messageId);
        message.setPageUrl("https://example.com");
        message.setAnchorKey("key");
        message.setUpVoteScore(0);
        message.setDownVoteScore(0);

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(messageRepository.findByIdWithLock(messageId)).thenReturn(Optional.of(message));
        when(voteRepository.findByMessageIdAndUserId(messageId, userId)).thenReturn(Optional.empty());
        when(userRepository.findByUuidIn(any())).thenReturn(List.of(user));

        MessageResponseDTO response = messageService.vote(messageId, "UP", userId);

        assertEquals(1, response.getUpVoteScore());
        assertEquals(1, user.getDailyVoteCount());
        verify(voteRepository, times(1)).save(any(Vote.class));
        verify(messageCacheService, times(1)).evictPageCaches("https://example.com", "key");
    }

    @Test
    @DisplayName("투표 실패 - 일일 제한(20회) 초과")
    void vote_Fail_LimitExceeded() {
        Long messageId = 1L;
        UUID userId = UUID.randomUUID();
        User user = new User();
        user.setDailyVoteCount(20);
        user.setLastVoteResetAt(Instant.now());

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        ApiException exception = assertThrows(ApiException.class, () -> messageService.vote(messageId, "UP", userId));

        assertEquals("Daily vote limit exceeded.", exception.getMessage());
    }

    @Test
    @DisplayName("투표 실패 - 동일한 타입 중복 투표")
    void vote_Fail_Duplicate() {
        Long messageId = 1L;
        UUID userId = UUID.randomUUID();
        User user = new User();
        user.setDailyVoteCount(5);
        user.setLastVoteResetAt(Instant.now());

        Message message = new Message();
        message.setId(messageId);
        message.setPageUrl("https://example.com");
        message.setAnchorKey("key");

        Vote existingVote = new Vote(messageId, userId, "UP");

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(messageRepository.findByIdWithLock(messageId)).thenReturn(Optional.of(message));
        when(voteRepository.findByMessageIdAndUserId(messageId, userId)).thenReturn(Optional.of(existingVote));

        ApiException exception = assertThrows(ApiException.class, () -> messageService.vote(messageId, "UP", userId));

        assertEquals("You have already voted.", exception.getMessage());
    }

    @Test
    @DisplayName("투표 변경 성공 - 추천 -> 비추천")
    void vote_Success_ChangeVote() {
        Long messageId = 1L;
        UUID userId = UUID.randomUUID();
        User user = new User();
        user.setDailyVoteCount(5);
        user.setLastVoteResetAt(Instant.now());

        Message message = new Message();
        message.setId(messageId);
        message.setPageUrl("https://example.com");
        message.setAnchorKey("key");
        message.setUpVoteScore(1);
        message.setDownVoteScore(0);

        Vote existingVote = new Vote(messageId, userId, "UP");

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(messageRepository.findByIdWithLock(messageId)).thenReturn(Optional.of(message));
        when(voteRepository.findByMessageIdAndUserId(messageId, userId)).thenReturn(Optional.of(existingVote));
        when(userRepository.findByUuidIn(any())).thenReturn(List.of(user));

        MessageResponseDTO response = messageService.vote(messageId, "DOWN", userId);

        assertEquals(0, response.getUpVoteScore());
        assertEquals(1, response.getDownVoteScore());
        assertEquals("DOWN", existingVote.getVoteType());
        verify(messageCacheService, times(1)).evictPageCaches("https://example.com", "key");
    }

    @Test
    @DisplayName("메시지 목록 조회 - nickname N+1 방지 batch 조회")
    void getAllMessagesInPage_UsesBatchNicknameLookup() {
        UUID authorId = UUID.randomUUID();
        User author = new User();
        author.setUuid(authorId);
        author.setNickname("tester");

        Message message = new Message();
        message.setId(1L);
        message.setAuthorId(authorId);
        message.setPageUrl("https://example.com");
        message.setAnchorKey("key");
        message.setContent("hello");

        when(messageRepository.findByPageUrl("https://example.com")).thenReturn(List.of(message));
        when(userRepository.findByUuidIn(any())).thenReturn(List.of(author));

        List<MessageResponseDTO> responses = messageService.getAllMessagesInPage("https://example.com");

        assertEquals(1, responses.size());
        assertEquals("tester", responses.get(0).getNickname());
        verify(userRepository, times(1)).findByUuidIn(any());
        verify(userRepository, never()).findById(any());
    }
}
