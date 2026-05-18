package com.ghostMessage.service;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.ghostMessage.domain.Message;
import com.ghostMessage.domain.User;
import com.ghostMessage.dto.MessageRequestDTO;
import com.ghostMessage.dto.MessageResponseDTO;
import com.ghostMessage.repository.MessageRepository;
import com.ghostMessage.repository.UserRepository;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor // final이 붙은 필드를 생성자로 자동 주입
public class MessageService {
	
	// db와 동작하는 레포지토리 객체 
	private final MessageRepository messageRepository;
    private final UserRepository userRepository;

    // 메시지 작성 (제한 로직 포함)
    @Transactional // 하나의 작업을 DB 트랙잭션으로 묶음
    public Message createMessage(MessageRequestDTO dto) { // 메시지 dto 객체를 사용
    	
    	// 사용자 존재 여부 확인
    	User user = userRepository.findById(dto.getAuthorId()) 
    			.orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다.")); // Optional 객체 예외처리
    			
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
        message.setType(dto.getType());
        message.setContent(dto.getContent());
        
        // 작성 카운트 증가
        user.setDailyMessageCount(user.getDailyMessageCount() + 1);
        
        return messageRepository.save(message); // 메시지 DB에 저장
    }

    // 특정 위치의 메시지 목록 조회
    public List<MessageResponseDTO> getMessages(String pageUrl, String anchorKey) {
    	// [추가] 조회 파라미터 정규화
        String normPageUrl = pageUrl.toLowerCase().replaceAll("/$", "");
        String normAnchorKey = anchorKey.toLowerCase().replaceAll("/$", "");
        
    	// 쿼리 메소드의 결과 리스트 저장
    	List<Message> messages = messageRepository.findByPageUrlAndAnchorKeyOrderByCreatedAtDesc(normPageUrl, normAnchorKey);
    	
        
    	return messages.stream().map(msg -> { // messages 내 요소를 dto빌더로 새로 만들어 리스트로 반환
    		
    		// 이름이 존재할 경우 그걸로 저장, 없을 경우 익명으로 설정 
    		String nickname = userRepository.findById(msg.getAuthorId())
    				.map(User::getNickname).orElse("anonymous");
    		
    		return MessageResponseDTO.builder()
    				.id(msg.getId())
                    .authorId(msg.getAuthorId())
                    .nickname(nickname)
                    .content(msg.getContent())
                    .type(msg.getType())
                    .anchorKey(msg.getAnchorKey())
                    .upVoteScore(msg.getUpVoteScore())
                    .downVoteScore(msg.getDownVoteScore())
                    .createdAt(msg.getCreatedAt())
                    .build();
    	}
    	).collect(Collectors.toList());
    }
    
    @Transactional
    public MessageResponseDTO vote(Long id, String type) {
    	
    	Message message = messageRepository.findById(id)
    			.orElseThrow(() -> new RuntimeException("메시지를 찾을 수 없습니다."));
    	
    	if("UP".equals(type)) {
    		message.setUpVoteScore(message.getUpVoteScore() + 1);
    	}else if("DOWN".equals(type)) {
    		message.setDownVoteScore(message.getDownVoteScore() + 1);
    	}
    	
    	return MessageResponseDTO.builder()
    			.id(message.getId())
    			.upVoteScore(message.getUpVoteScore())
    			.downVoteScore(message.getDownVoteScore())
    			.content(message.getContent())
    			.build();
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
    	
    	return messages.stream().map(msg -> {
    		String nickname = userRepository.findById(msg.getAuthorId())
    				.map(User::getNickname).orElse("anonymous");
    		
    		return MessageResponseDTO.builder()
                    .id(msg.getId())
                    .authorId(msg.getAuthorId())
                    .nickname(nickname)
                    .content(msg.getContent())
                    .type(msg.getType())
                    .anchorKey(msg.getAnchorKey())
                    .upVoteScore(msg.getUpVoteScore())
                    .downVoteScore(msg.getDownVoteScore())
                    .createdAt(msg.getCreatedAt())
                    .build();
    		
    	}).collect(Collectors.toList());
    }
}
