# Phase 6 가이드: 백엔드 고도화 (DTO 및 제약 로직)

본 가이드는 백엔드의 안정성을 높이기 위해 엔티티 대신 DTO를 사용하고, 메시지 작성 시 사용자를 검증하는 필수 비즈니스 로직을 추가하는 과정입니다.

---

## 1. 응답용 DTO 완성하기 (MessageResponseDTO)

엔티티를 직접 반환하면 DB 구조가 노출될 위험이 있습니다. 필요한 데이터만 골라서 보내주는 DTO를 완성합시다.

### [Step 1-1] MessageResponseDTO 수정
`com.ghostMessage.dto` 패키지의 `MessageResponseDTO.java`를 엽니다.

```java
package com.ghostMessage.dto;

import lombok.Builder;
import lombok.Getter;
import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Builder // 빌더 패턴을 사용하여 객체 생성을 편리하게 함
public class MessageResponseDTO {
    private Long id;
    private UUID authorId;   // 작성자 식별용
    private String nickname; // 작성자의 닉네임
    private String content;  // 메시지 내용
    private String type;     // 메시지 타입
    private int score;       // 추천 점수 (up - down)
    private LocalDateTime createdAt;
}
```

---

## 2. 서비스 로직 강화 (사용자 검증 및 제한)

이제 메시지를 저장하기 전에 "진짜 존재하는 유저인지", "오늘 너무 많이 쓰지는 않았는지" 체크하는 로직을 추가합니다.

### [Step 2-1] MessageService 수정
`com.ghostMessage.service` 패키지의 `MessageService.java`를 수정합니다.

```java
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
@RequiredArgsConstructor
public class MessageService {
    private final MessageRepository messageRepository;
    private final UserRepository userRepository;

    @Transactional
    public Message createMessage(MessageRequestDTO dto) {
        // 1. 사용자 존재 여부 확인
        User user = userRepository.findById(dto.getAuthorId())
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

        // 2. 일일 작성 제한 체크 (예: 하루 10개)
        if (user.getDailyMessageCount() >= 10) {
            throw new RuntimeException("오늘 작성 가능한 메시지 한도를 초과했습니다.");
        }

        // 3. 메시지 생성 및 저장
        Message message = new Message();
        message.setAuthorId(user.getUuid());
        message.setPageUrl(dto.getPageUrl());
        message.setAnchorKey(dto.getAnchorKey());
        message.setType(dto.getType());
        message.setContent(dto.getContent());
        
        // 4. 사용자의 작성 카운트 증가
        user.setDailyMessageCount(user.getDailyMessageCount() + 1);
        
        return messageRepository.save(message);
    }

    public List<MessageResponseDTO> getMessages(String pageUrl, String anchorKey) {
        List<Message> messages = messageRepository.findByPageUrlAndAnchorKeyOrderByCreatedAtDesc(pageUrl, anchorKey);
        
        // Entity 리스트를 DTO 리스트로 변환하여 반환
        return messages.stream().map(msg -> {
            // 작성자 닉네임 가져오기 (없으면 익명)
            String nickname = userRepository.findById(msg.getAuthorId())
                    .map(User::getNickname).orElse("익명 유령");
                    
            return MessageResponseDTO.builder()
                    .id(msg.getId())
                    .authorId(msg.getAuthorId())
                    .nickname(nickname)
                    .content(msg.getContent())
                    .type(msg.getType())
                    .score(msg.getUpVoteScore() - msg.getDownVoteScore())
                    .createdAt(msg.getCreatedAt())
                    .build();
        }).collect(Collectors.toList());
    }
}
```

---

## 3. 컨트롤러 반환 타입 변경

### [Step 3-1] MessageController 수정
이제 컨트롤러가 `Message` 대신 `MessageResponseDTO`를 반환하도록 바꿉니다.

```java
// MessageController.java 내부 수정

@GetMapping
public ResponseEntity<List<MessageResponseDTO>> getList(
        @RequestParam(name = "pageUrl") String pageUrl, 
        @RequestParam(name = "anchorKey") String anchorKey) {
    List<MessageResponseDTO> list = messageService.getMessages(pageUrl, anchorKey);
    return ResponseEntity.ok(list);
}
```
