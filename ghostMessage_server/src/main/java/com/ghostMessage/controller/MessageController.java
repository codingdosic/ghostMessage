package com.ghostMessage.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.ghostMessage.domain.Message;
import com.ghostMessage.dto.MessageRequestDTO;
import com.ghostMessage.dto.MessageResponseDTO;
import com.ghostMessage.service.MessageService;
import com.ghostMessage.service.UserService;

import lombok.RequiredArgsConstructor;

@RestController // 1. REST API용 컨트롤러임을 선언 -> http 요청을 처리하고, json 응답을 반환 (Trigger CI/CD)
@RequestMapping("/api/messages") // 2. 공통 주소 설정
@RequiredArgsConstructor
@CrossOrigin(origins = "chrome-extension://pmenhmekdcfeglgkicljlogcacogdalk") // 3. 브라우저 익스텐션에서 접근 가능하도록 허용(CORS 허용, 브라우저는 다른 도메인 요청을 차단하기 때문)
public class MessageController {
	
	// 비즈니스 로직을 처리할 서비스 객체
    private final MessageService messageService;
    private final UserService userService;
    
    // ----------------------------- POST ----------------------------- 
    
    // 메시지 남기기
    @PostMapping // post 요청
    public ResponseEntity<MessageResponseDTO> create(
    		@RequestBody MessageRequestDTO dto,
    		@RequestParam String securityCode) {

    	userService.validateUser(dto.getAuthorId(), securityCode);
        MessageResponseDTO saved = messageService.createMessage(dto);
        
        return ResponseEntity.ok(saved); 
    }
    
    // 메시지 추천
    @PostMapping("/{id}/vote") // {id}/vote?type={투표 타입}&userId={사용자 Id}
    public ResponseEntity<MessageResponseDTO> vote(
    		@PathVariable(name = "id") Long id, // 투표할 메시지 id
    		@RequestParam(name = "type") String type, // 투표 타입(추천 / 비추천)
    		@RequestParam(name = "userId") UUID userId,
    		@RequestParam String securityCode) { // [추가] 누가 투표했는지 정보
    	
    	userService.validateUser(userId, securityCode);
    	MessageResponseDTO updated = messageService.vote(id, type, userId);
    	
    	return ResponseEntity.ok(updated);
    };

    // ----------------------------- GET ----------------------------- 

    // 메시지 가져오기
    @GetMapping
    public ResponseEntity<List<MessageResponseDTO>> getList(
            @RequestParam(name = "pageUrl") String pageUrl, 
            @RequestParam(name = "anchorKey") String anchorKey) {
    	
        List<MessageResponseDTO> list = messageService.getMessages(pageUrl, anchorKey);
        
        return ResponseEntity.ok(list); // 200 상태코드 + 리스트 데이터
    }
    
    // 페이지 내 모든 메시지 가져오기
    @GetMapping("/all")
    public ResponseEntity<List<MessageResponseDTO>> getAllInPage(@RequestParam(name = "pageUrl") String pageUrl){
    	
    	List<MessageResponseDTO> list = messageService.getAllMessagesInPage(pageUrl);
    	
    	return ResponseEntity.ok(list);
    }
    
    // 사용자가 작성한 모든 메시지 가져오기
    @GetMapping("/user/{uuid}")
    public ResponseEntity<List<MessageResponseDTO>> getMessagesByAuthor(
    		@PathVariable(name = "uuid") UUID uuid){
    	
    	List<MessageResponseDTO> list = messageService.getMessagesByAuthor(uuid);
    	
    	return ResponseEntity.ok(list);
    }
    
    // ----------------------------- DELETE ----------------------------- 
    
    // 메시지 삭제
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
    		@PathVariable(name = "id") Long id, // 투표할 메시지 id
    		@RequestParam(name = "authorId") UUID authorId,
    		@RequestParam String securityCode){
    	
    	userService.validateUser(authorId, securityCode);
    	messageService.deleteMessage(id, authorId);
    	
    	return ResponseEntity.noContent().build();
    }
    
    
}
