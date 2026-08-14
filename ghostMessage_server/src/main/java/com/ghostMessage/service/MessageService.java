package com.ghostMessage.service;

import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import com.ghostMessage.domain.Message;
import com.ghostMessage.domain.User;
import com.ghostMessage.domain.Vote;
import com.ghostMessage.dto.MessageRequestDTO;
import com.ghostMessage.dto.MessageResponseDTO;
import com.ghostMessage.exception.ApiException;
import com.ghostMessage.repository.MessageRepository;
import com.ghostMessage.repository.UserRepository;
import com.ghostMessage.repository.VoteRepository;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class MessageService {

    private final MessageRepository messageRepository;
    private final UserRepository userRepository;
    private final VoteRepository voteRepository;
    private final MessageCacheService messageCacheService;

    @Transactional
    @Caching(evict = {
        @CacheEvict(value = "pageMessages", key = "#dto.pageUrl.toLowerCase().replaceAll('/$', '')"),
        @CacheEvict(value = "tooltipMessages", key = "#dto.pageUrl.toLowerCase().replaceAll('/$', '') + ':' + #dto.anchorKey.toLowerCase().replaceAll('/$', '')"),
        @CacheEvict(value = "userInfo", key = "#dto.authorId")
    })
    public MessageResponseDTO createMessage(MessageRequestDTO dto) {
        User user = userRepository.findById(dto.getAuthorId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found."));

        resetLimitsIfNewDay(user);

        if (user.getDailyMessageCount() >= 10) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "Daily message limit exceeded.");
        }

        Message message = new Message();

        String normalizedPageUrl = dto.getPageUrl().toLowerCase().replaceAll("/$", "");
        String normalizedAnchorKey = dto.getAnchorKey().toLowerCase().replaceAll("/$", "");

        message.setAuthorId(user.getUuid());
        message.setPageUrl(normalizedPageUrl);
        message.setAnchorKey(normalizedAnchorKey);
        message.setSelector(dto.getSelector());
        message.setLinkText(dto.getLinkText());
        message.setImgSrc(dto.getImgSrc());
        message.setType(dto.getType());
        message.setContent(dto.getContent());

        user.setDailyMessageCount(user.getDailyMessageCount() + 1);

        Message saved = messageRepository.save(message);
        return convertToResponseDTO(saved, resolveNicknames(List.of(saved)));
    }

    @Cacheable(
            value = "tooltipMessages",
            key = "#pageUrl.toLowerCase().replaceAll('/$', '') + ':' + #anchorKey.toLowerCase().replaceAll('/$', '')",
            sync = true
    )
    public List<MessageResponseDTO> getMessages(String pageUrl, String anchorKey) {
        String normPageUrl = pageUrl.toLowerCase().replaceAll("/$", "");
        String normAnchorKey = anchorKey.toLowerCase().replaceAll("/$", "");

        List<Message> messages = messageRepository.findByPageUrlAndAnchorKeyOrderByCreatedAtDesc(normPageUrl, normAnchorKey);
        return convertToResponseDTOs(messages);
    }

    @Transactional
    @CacheEvict(value = "userInfo", key = "#userId")
    public MessageResponseDTO vote(Long id, String type, UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found."));

        resetLimitsIfNewDay(user);

        if (user.getDailyVoteCount() >= 20) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "Daily vote limit exceeded.");
        }

        Message message = messageRepository.findByIdWithLock(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Message not found."));

        Optional<Vote> existingVote = voteRepository.findByMessageIdAndUserId(id, userId);

        if (existingVote.isEmpty()) {
            applyVoteScore(message, type, 1);
            voteRepository.save(new Vote(id, userId, type));
            user.setDailyVoteCount(user.getDailyVoteCount() + 1);
        } else {
            Vote vote = existingVote.get();
            if (vote.getVoteType().equals(type)) {
                throw new ApiException(HttpStatus.CONFLICT, "You have already voted.");
            } else {
                applyVoteScore(message, vote.getVoteType(), -1);
                applyVoteScore(message, type, 1);
                vote.setVoteType(type);
            }
        }

        messageCacheService.evictPageCaches(message.getPageUrl(), message.getAnchorKey());
        return convertToResponseDTO(message, resolveNicknames(List.of(message)));
    }

    private void applyVoteScore(Message message, String type, int delta) {
        if ("UP".equals(type)) {
            message.setUpVoteScore(message.getUpVoteScore() + delta);
        } else if ("DOWN".equals(type)) {
            message.setDownVoteScore(message.getDownVoteScore() + delta);
        }
    }

    @Transactional
    public void deleteMessage(Long id, UUID authorId) {
        Message message = messageRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Message not found."));

        if (!message.getAuthorId().equals(authorId)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Permission denied.");
        }

        voteRepository.deleteByMessageId(id);
        messageRepository.delete(message);
        messageCacheService.evictPageCaches(message.getPageUrl(), message.getAnchorKey());
    }

    @Cacheable(
            value = "pageMessages",
            key = "#pageUrl.toLowerCase().replaceAll('/$', '')",
            sync = true
    )
    public List<MessageResponseDTO> getAllMessagesInPage(String pageUrl) {
        String normPageUrl = pageUrl.toLowerCase().replaceAll("/$", "");
        List<Message> messages = messageRepository.findByPageUrl(normPageUrl);
        return convertToResponseDTOs(messages);
    }

    public List<MessageResponseDTO> getMessagesByAuthor(UUID authorId) {
        List<Message> messages = messageRepository.findByAuthorIdOrderByCreatedAtDesc(authorId);
        return convertToResponseDTOs(messages);
    }

    private List<MessageResponseDTO> convertToResponseDTOs(List<Message> messages) {
        Map<UUID, String> nicknameMap = resolveNicknames(messages);
        return messages.stream()
                .map(msg -> convertToResponseDTO(msg, nicknameMap))
                .collect(Collectors.toList());
    }

    private Map<UUID, String> resolveNicknames(List<Message> messages) {
        Set<UUID> authorIds = messages.stream()
                .map(Message::getAuthorId)
                .collect(Collectors.toSet());

        if (authorIds.isEmpty()) {
            return Map.of();
        }

        return userRepository.findByUuidIn(authorIds).stream()
                .collect(Collectors.toMap(
                        User::getUuid,
                        user -> user.getNickname() != null ? user.getNickname() : "anonymous"
                ));
    }

    private MessageResponseDTO convertToResponseDTO(Message msg, Map<UUID, String> nicknameMap) {
        String nickname = nicknameMap.getOrDefault(msg.getAuthorId(), "anonymous");
        return buildResponseDTO(msg, nickname);
    }

    private MessageResponseDTO buildResponseDTO(Message msg, String nickname) {
        return MessageResponseDTO.builder()
                .id(msg.getId())
                .authorId(msg.getAuthorId())
                .nickname(nickname)
                .content(msg.getContent())
                .type(msg.getType())
                .pageUrl(msg.getPageUrl())
                .anchorKey(msg.getAnchorKey())
                .selector(msg.getSelector())
                .linkText(msg.getLinkText())
                .imgSrc(msg.getImgSrc())
                .upVoteScore(msg.getUpVoteScore())
                .downVoteScore(msg.getDownVoteScore())
                .createdAt(msg.getCreatedAt())
                .build();
    }

    private void resetLimitsIfNewDay(User user) {
        Instant now = Instant.now();
        ZonedDateTime nowUtc = now.atZone(ZoneId.of("UTC"));
        Instant todayMidnightUtc = nowUtc.toLocalDate().atStartOfDay(ZoneId.of("UTC")).toInstant();

        if (user.getLastMessageResetAt() == null ||
            user.getLastMessageResetAt().isBefore(todayMidnightUtc)) {
            user.setDailyMessageCount(0);
            user.setLastMessageResetAt(now);
        }
        if (user.getLastVoteResetAt() == null ||
            user.getLastVoteResetAt().isBefore(todayMidnightUtc)) {
            user.setDailyVoteCount(0);
            user.setLastVoteResetAt(now);
        }
    }
}
