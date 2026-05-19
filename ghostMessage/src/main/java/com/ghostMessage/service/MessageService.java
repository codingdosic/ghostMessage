package com.ghostMessage.service;

import java.time.LocalDateTime;
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
    public MessageResponseDTO createMessage(MessageRequestDTO dto) { // 메시지 dto 객체를 사용
    	
    	// 사용자 존재 여부 확인
    	User user = userRepository.findById(dto.getAuthorId()) 
    			.orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다.")); // Optional 객체 예외처리
    	
    	resetLimitsIfNewDay(user);
    	 
    	// 일일 작성 제한 체크
    	if(user.getDailyMessageCount() >= 10) {
    		throw new RuntimeException("오늘 작성 가능한 메시지 한도를 초과했습니다.");
    	}

        Message message = new Message(); // 메시지 객체 생성 및 초기화 
        
        // [추가] 저장 전 URL 정규화 (소문자화 및 끝 슬래시 제거)
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
        
        Message saved = messageRepository.save(message); // 메시지 DB에 저장
        return convertToResponseDTO(saved);
    }

    // 특정 위치의 메시지 목록 조회
    public List<MessageResponseDTO> getMessages(String pageUrl, String anchorKey) {
    	// [추가] 조회 파라미터 정규화
        String normPageUrl = pageUrl.toLowerCase().replaceAll("/$", "");
        String normAnchorKey = anchorKey.toLowerCase().replaceAll("/$", "");
        
    	// 쿼리 메소드의 결과 리스트 저장
    	List<Message> messages = messageRepository.findByPageUrlAndAnchorKeyOrderByCreatedAtDesc(normPageUrl, normAnchorKey);
    	
    	return messages.stream().map(this::convertToResponseDTO).collect(Collectors.toList());
    }
    
//    @Transactional
//    public MessageResponseDTO vote(Long id, String type) {
//    	
//    	Message message = messageRepository.findById(id)
//    			.orElseThrow(() -> new RuntimeException("메시지를 찾을 수 없습니다."));
//    	
//    	if("UP".equals(type)) {
//    		message.setUpVoteScore(message.getUpVoteScore() + 1);
//    	}else if("DOWN".equals(type)) {
//    		message.setDownVoteScore(message.getDownVoteScore() + 1);
//    	}
//    	
//    	return convertToResponseDTO(message);
//    }
    
    @Transactional
    public MessageResponseDTO vote(Long id, String type, UUID userId) {
        // 1. 유저 정보 조회 및 일일 제한 확인
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));
        
        resetLimitsIfNewDay(user); // 날짜 바뀌었으면 카운트 리셋

        // 2. 일일 투표 제한 체크 (예: 하루 20회)
        if (user.getDailyVoteCount() >= 20) {
            throw new RuntimeException("오늘 행사할 수 있는 투표 한도를 초과했습니다.");
        }

        // 3. 메시지 존재 확인
        Message message = messageRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("메시지를 찾을 수 없습니다."));

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
                throw new RuntimeException("이미 동일한 투표를 하셨습니다.");
            } else {
                // [Case 3] 반대 버튼을 누른 경우 (추천 -> 비추천 등 전환)
                applyVoteScore(message, vote.getVoteType(), -1); // 기존 점수 취소 (-1)
                applyVoteScore(message, type, 1);               // 새로운 점수 반영 (+1)
                vote.setVoteType(type); // 기록 업데이트
                // 전환 시에는 일일 카운트를 추가로 늘리지 않음 (선택 사항)
            }
        }

        return convertToResponseDTO(message);
    }

    // 투표 점수를 가감하는 내부 헬퍼 메서드
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
    			.orElseThrow(() -> new RuntimeException("메시지를 찾을 수 없습니다."));
    	
    	if(!message.getAuthorId().equals(authorId)) {
    		throw new RuntimeException("삭제 권한이 없습니다.");
    	}
    	
    	messageRepository.delete(message);
    }
    
    public List<MessageResponseDTO> getAllMessagesInPage(String pageUrl){
    	
    	String normPageUrl = pageUrl.toLowerCase().replaceAll("/$", "");
    	
    	List<Message> messages = messageRepository.findByPageUrl(normPageUrl);
    	
    	return messages.stream().map(this::convertToResponseDTO).collect(Collectors.toList());
    }

    // [추가] 엔티티를 DTO로 변환하는 공통 메서드
    private MessageResponseDTO convertToResponseDTO(Message msg) {
        String nickname = userRepository.findById(msg.getAuthorId())
                .map(User::getNickname).orElse("anonymous");

        return MessageResponseDTO.builder()
                .id(msg.getId())
                .authorId(msg.getAuthorId())
                .nickname(nickname)
                .content(msg.getContent())
                .type(msg.getType())
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
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime todayMidnight = now.toLocalDate().atStartOfDay();

        if (user.getLastMessageResetAt() == null || user.getLastMessageResetAt().isBefore(todayMidnight)) {
            user.setDailyMessageCount(0);
            user.setLastMessageResetAt(now);
        }
        if (user.getLastVoteResetAt() == null || user.getLastVoteResetAt().isBefore(todayMidnight)) {
            user.setDailyVoteCount(0);
            user.setLastVoteResetAt(now);
        }
    }
}
