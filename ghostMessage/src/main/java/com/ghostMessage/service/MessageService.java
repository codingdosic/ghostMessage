package com.ghostMessage.service;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.ghostMessage.domain.Message;
import com.ghostMessage.domain.User;
import com.ghostMessage.domain.Vote;
import com.ghostMessage.dto.MessageRequestDTO;
import com.ghostMessage.dto.MessageResponseDTO;
import com.ghostMessage.repository.MessageRepository;
import com.ghostMessage.repository.UserRepository;
import com.ghostMessage.repository.VoteRepository;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor // final이 붙은 필드를 생성자로 자동 주입
public class MessageService {
	
	// db와 동작하는 레포지토리 객체 
	private final MessageRepository messageRepository;
    private final UserRepository userRepository;
    private final VoteRepository voteRepository;

    // 메시지 작성 (제한 로직 포함)
    @Transactional // 하나의 작업을 DB 트랙잭션으로 묶음
    public MessageResponseDTO createMessage(MessageRequestDTO dto) {
    	
    	// 사용자 존재 여부 확인
    	User user = userRepository.findById(dto.getAuthorId()) 
    			.orElseThrow(() -> new RuntimeException("User not found.")); 
    	
    	resetLimitsIfNewDay(user);
    	 
    	// 일일 작성 제한 체크
    	if(user.getDailyMessageCount() >= 10) {
    		throw new RuntimeException("Daily message limit exceeded.");
    	}

    	// 메시지 객체 생성 및 초기화 
        Message message = new Message(); 
        
        // 저장 전 URL 정규화 (소문자화 및 끝 슬래시 제거)
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
        
        // 작성 카운트 증가
        user.setDailyMessageCount(user.getDailyMessageCount() + 1);
        
        // 메시지 DB에 저장
        Message saved = messageRepository.save(message); 
        
        return convertToResponseDTO(saved);
    }

    // 특정 위치의 메시지 목록 조회
    public List<MessageResponseDTO> getMessages(String pageUrl, String anchorKey) {
    	
    	// 조회 파라미터 정규화
        String normPageUrl = pageUrl.toLowerCase().replaceAll("/$", "");
        String normAnchorKey = anchorKey.toLowerCase().replaceAll("/$", "");
        
    	// 쿼리 메소드의 결과 리스트 저장
    	List<Message> messages = messageRepository.findByPageUrlAndAnchorKeyOrderByCreatedAtDesc(normPageUrl, normAnchorKey);
    	
    	return messages.stream()
    			.map(this::convertToResponseDTO)
    			.collect(Collectors.toList());
    }
    
    // 메시지 투표 
    @Transactional
    public MessageResponseDTO vote(Long id, String type, UUID userId) {
    	
        // 1. 유저 정보 조회 및 일일 제한 확인
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found."));
        
        resetLimitsIfNewDay(user); // 날짜 바뀌었으면 카운트 리셋

        // 2. 일일 투표 제한 체크 (예: 하루 20회)
        if (user.getDailyVoteCount() >= 20) {
            throw new RuntimeException("Daily vote limit exceeded.");
        }

        // 3. 메시지 존재 확인
        Message message = messageRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Message not found."));

        // 4. 기존 투표 내역 확인
        Optional<Vote> existingVote = voteRepository.findByMessageIdAndUserId(id, userId);

        if (existingVote.isEmpty()) {
            // [Case 1] 처음 투표하는 경우
            applyVoteScore(message, type, 1); // 점수 +1
            voteRepository.save(new Vote(id, userId, type)); // 투표 기록 저장
            user.setDailyVoteCount(user.getDailyVoteCount() + 1); // 일일 카운트 증가
        } else {
            Vote vote = existingVote.get();
            if (vote.getVoteType().equals(type)) {
                // [Case 2] 이미 같은 버튼을 누른 경우 (추천 중인데 또 추천) -> 무시하거나 취소(선택)
                throw new RuntimeException("You have already voted.");
            } else {
                // [Case 3] 반대 버튼을 누른 경우 (추천 -> 비추천 등 전환)
            	// 기존 점수 취소 (-1)
                applyVoteScore(message, vote.getVoteType(), -1); 
                // 새로운 점수 반영 (+1)
                applyVoteScore(message, type, 1);  
                // 기록 업데이트
                vote.setVoteType(type); 
            }
        }
        
        return convertToResponseDTO(message);
    }

    // 투표 점수 처리 메서드
    private void applyVoteScore(Message message, String type, int delta) {
    	
    	
        if ("UP".equals(type)) { // 추천일 경우
            message.setUpVoteScore(message.getUpVoteScore() + delta);
        } else if ("DOWN".equals(type)) { // 비추천일 경우
            message.setDownVoteScore(message.getDownVoteScore() + delta);
        }
    }
    
    // 메시지 삭제 
    @Transactional
    public void deleteMessage(Long id, UUID authorId) {
    	
    	// 메시지 존재 체크
    	Message message = messageRepository.findById(id)
    			.orElseThrow(() -> new RuntimeException("Message not found."));
    	
    	// 작성자 체크
    	if(!message.getAuthorId().equals(authorId)) {
    		throw new RuntimeException("Permission denied.");
    	}
    	
    	// 삭제 처리
    	messageRepository.delete(message);
    }
    
    // 페이지 내 모든 메시지 가져오기
    public List<MessageResponseDTO> getAllMessagesInPage(String pageUrl){
    	
    	// url 정규화
    	String normPageUrl = pageUrl.toLowerCase().replaceAll("/$", "");
    	
    	// db에서 가져오기
    	List<Message> messages = messageRepository.findByPageUrl(normPageUrl);
    	
    	return messages.stream()
    			.map(this::convertToResponseDTO)
    			.collect(Collectors.toList());
    }
    
    // 작성한 모든 메시지 가져오기
    public List<MessageResponseDTO> getMessagesByAuthor(UUID authorId){
    	
    	// db에서 가져오기
    	List<Message> messages = messageRepository.findByAuthorIdOrderByCreatedAtDesc(authorId);
    
    	return messages.stream()
    			.map(this::convertToResponseDTO)
    			.collect(Collectors.toList());
    }

    // 엔티티를 DTO로 변환하는 메서드
    private MessageResponseDTO convertToResponseDTO(Message msg) {
    	
    	// 이름 존재 시 그대로 사용, 없을 시 익명
        String nickname = userRepository.findById(msg.getAuthorId())
                .map(User::getNickname).orElse("anonymous");
        
        // dto 객체 생성 후 반환
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
    
    // 날짜가 지나면 한도를 초기화하는 메서드
    private void resetLimitsIfNewDay(User user) {
    	
    	// 현재 시간
        ZonedDateTime nowUtc = ZonedDateTime.now(ZoneId.of("UTC"));
        
        // 현 시간 기준 자정
        ZonedDateTime todayMidnightUtc = nowUtc.toLocalDate().atStartOfDay(ZoneId.of("UTC"));

        // 초기화 시간이 없거나, todayMidnight 이  lastMessageResetAt 을 지났다면 초기화
        if (user.getLastMessageResetAt() == null || 
            user.getLastMessageResetAt().atZone(ZoneId.of("UTC")).isBefore(todayMidnightUtc)) {
            user.setDailyMessageCount(0);
            user.setLastMessageResetAt(nowUtc.toLocalDateTime()); // DB에는 로컬타임으로 저장되더라도 기준은 UTC
        }
        if (user.getLastVoteResetAt() == null || 
            user.getLastVoteResetAt().atZone(ZoneId.of("UTC")).isBefore(todayMidnightUtc)) {
            user.setDailyVoteCount(0);
            user.setLastVoteResetAt(nowUtc.toLocalDateTime());
        }
    }
    
   
}
