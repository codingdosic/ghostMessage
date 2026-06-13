# Phase 25 가이드: 메시지 삭제 권한 제어 고도화

본 가이드는 현재 화면에 노출되는 삭제 버튼의 접근 제어를 강화하여, 메시지 작성자 본인만 삭제 버튼을 볼 수 있도록 로직을 고도화하는 과정을 다룹니다.

---

## 1. 프론트엔드 노출 제어 강화

### [Step 25-1] 툴팁 렌더링 로직 확인 및 수정
이미 작성자 ID(`authorId`)를 기반으로 버튼을 생성하고 있으나, 보안적으로 더욱 확실하게 보장하기 위해 렌더링 시점에 추가 체크를 수행합니다.

1. `extensions/content.js`의 `generateMessagesHtml` 함수를 확인합니다.
2. 현재 `msg.authorId === MY_ID`를 통해 클라이언트 측에서 제어하고 있습니다.
3. 이를 보완하기 위해 삭제 요청(`confirmDelete`) 발생 시, 서버 측에서도 해당 메시지의 작성자와 요청자의 ID가 일치하는지 다시 한 번 검증하는 로직이 있는지 확인합니다.

---

## 2. 백엔드 권한 검증 확인

### [Step 25-2] 서비스 레이어 검증 강화
1. `MessageService.java`의 `deleteMessage` 메서드를 확인합니다.
2. 현재 구현된 권한 체크 로직을 검증합니다.

```java
    @Transactional
    public void deleteMessage(Long id, UUID authorId) {
        Message message = messageRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("메시지를 찾을 수 없습니다."));
        
        // 작성자 확인 (서버 측 핵심 보안)
        if (!message.getAuthorId().equals(authorId)) {
            throw new RuntimeException("삭제 권한이 없습니다.");
        }
        
        messageRepository.delete(message);
    }
```

---

## 💡 학습 포인트
- **Client-side vs Server-side Security:** UI에서 삭제 버튼을 숨기는 것은 사용자 경험(UX)을 위한 것이며, 실제 보안은 반드시 서버에서 `authorId`를 확인하여 처리해야 함을 배웁니다.
