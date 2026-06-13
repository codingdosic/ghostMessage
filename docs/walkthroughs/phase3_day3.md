# Phase 3 가이드: 핵심 API 구현 (Eclipse 환경 매뉴얼)

본 가이드는 실제 기능을 수행하는 비즈니스 로직(Service)을 작성하고, 이를 외부(브라우저 익스텐션 등)에서 호출할 수 있도록 엔드포인트(Controller)를 여는 과정을 다룹니다.

---

## 1. 데이터 전송 객체 (DTO) 생성

### [Step 1-1] DTO 패키지 및 클래스 생성
Entity를 직접 주고받는 것은 위험하므로, 통신 전용 가방인 DTO를 만듭니다.
1. `com.ghostmessage.dto` 패키지를 생성합니다.
2. `MessageRequestDTO` (작성용)와 `MessageResponseDTO` (조회용) 클래스를 만듭니다.

**MessageRequestDTO.java:**
```java
@Data // Getter, Setter, toString 등 자동 생성
public class MessageRequestDTO {
    private UUID authorId;
    private String pageUrl;
    private String anchorKey;
    private String type;
    private String content;
}
```

---

## 2. 비즈니스 로직 구현 (Service)

### [Step 2-1] MessageService 클래스 생성
1. `com.ghostmessage.service` 패키지를 생성합니다.
2. `MessageService` 클래스를 만들고 상단에 **`@Service`** 어노테이션을 붙입니다.
3. 아래 기능을 작성합니다.

```java
@Service
@RequiredArgsConstructor // final이 붙은 필드를 생성자로 자동 주입
public class MessageService {
    private final MessageRepository messageRepository;
    private final UserRepository userRepository;

    // 1. 메시지 작성 (제한 로직 포함)
    @Transactional
    public Message createMessage(MessageRequestDTO dto) {
        // [MVP 제약] 실습을 위해 간단히 구현 - 실제로는 작성자 존재 여부 및 카운트 체크 필요
        Message message = new Message();
        message.setAuthorId(dto.getAuthorId());
        message.setPageUrl(dto.getPageUrl());
        message.setAnchorKey(dto.getAnchorKey());
        message.setType(dto.getType());
        message.setContent(dto.getContent());
        
        return messageRepository.save(message);
    }

    // 2. 특정 위치의 메시지 목록 조회
    public List<Message> getMessages(String pageUrl, String anchorKey) {
        return messageRepository.findByPageUrlAndAnchorKeyOrderByCreatedAtDesc(pageUrl, anchorKey);
    }
}
```

---

## 3. API 컨트롤러 구현 (Controller)

### [Step 3-1] MessageController 생성
1. `com.ghostmessage.controller` 패키지를 생성합니다.
2. `MessageController` 클래스를 만들고 아래 내용을 작성합니다.

```java
@RestController // 1. REST API용 컨트롤러임을 선언
@RequestMapping("/api/messages") // 2. 공통 주소 설정
@RequiredArgsConstructor
@CrossOrigin(origins = "*") // 3. 브라우저 익스텐션에서 접근 가능하도록 허용
public class MessageController {
    private final MessageService messageService;

    // 메시지 남기기
    @PostMapping
    public ResponseEntity<Message> create(@RequestBody MessageRequestDTO dto) {
        Message saved = messageService.createMessage(dto);
        return ResponseEntity.ok(saved);
    }

    // 메시지 가져오기
    @GetMapping
    public ResponseEntity<List<Message>> getList(
            @RequestParam String pageUrl, 
            @RequestParam String anchorKey) {
        List<Message> list = messageService.getMessages(pageUrl, anchorKey);
        return ResponseEntity.ok(list);
    }
}
```

---

## 4. API 테스트 (Postman 또는 브라우저)

### [Step 4-1] 조회 테스트
1. 서버를 실행합니다.
2. 브라우저 주소창에 다음을 입력해봅니다 (데이터가 없으므로 `[]`가 나오면 성공):
   `http://localhost:8080/api/messages?pageUrl=test.com&anchorKey=link1`

---

## 💡 학습 포인트
- **@RestController:** 자바 객체를 JSON이라는 데이터 형식으로 자동 변환하여 브라우저에 전달해줍니다.
- **DTO (Data Transfer Object):** 내부 DB 구조(Entity)를 외부에 노출하지 않고 필요한 데이터만 딱 골라서 담는 바구니입니다.
- **@Service:** "이 클래스는 비즈니스 로직을 담당하는 핵심 부품이야"라고 스프링에게 알려주는 마크입니다.
- **@CrossOrigin:** 보안상의 이유로 웹 브라우저는 다른 도메인의 서버 호출을 막는데, 이를 허용해주는 설정입니다 (익스텐션 개발 시 필수).
