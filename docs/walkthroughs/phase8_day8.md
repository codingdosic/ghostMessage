# Phase 8 가이드: 추천/비추천 소셜 기능

본 가이드는 유령 메시지에 추천(Upvote)과 비추천(Downvote) 기능을 추가하여, 좋은 정보가 더 돋보이게 만드는 과정입니다.

---

## 1. 도메인 확장 (Entity & Repository)

메시지의 점수를 관리할 수 있도록 백엔드를 수정합니다. (간단한 구현을 위해 메시지 엔티티의 점수 필드를 직접 업데이트합니다.)

### [Step 1-1] MessageController에 투표 API 추가
`com.ghostMessage.controller.MessageController.java`에 아래 메서드를 추가합니다.

```java
// 특정 메시지 추천/비추천 처리
@PostMapping("/{id}/vote")
public ResponseEntity<MessageResponseDTO> vote(
        @PathVariable(name = "id") Long id,
        @RequestParam(name = "type") String type) { // type: "UP" 또는 "DOWN"
    MessageResponseDTO updated = messageService.vote(id, type);
    return ResponseEntity.ok(updated);
}
```

### [Step 1-2] MessageService에 투표 로직 구현
`MessageService.java`에 `vote` 메서드를 추가합니다.

```java
@Transactional
public MessageResponseDTO vote(Long id, String type) {
    Message message = messageRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("메시지를 찾을 수 없습니다."));

    if ("UP".equals(type)) {
        message.setUpVoteScore(message.getUpVoteScore() + 1);
    } else if ("DOWN".equals(type)) {
        message.setDownVoteScore(message.getDownVoteScore() + 1);
    }

    // 결과 반환 (이전 Step에서 만든 builder 사용)
    return MessageResponseDTO.builder()
            .id(message.getId())
            .score(message.getUpVoteScore() - message.getDownVoteScore())
            .content(message.getContent())
            .build();
}
```

---

## 2. 툴팁에 버튼 추가 (Extension)

사용자가 툴팁에서 바로 추천을 누를 수 있도록 UI를 개선합니다.

### [Step 2-1] content.js의 showTooltip 수정
텍스트 옆에 작은 버튼들을 추가합니다.

```javascript
function showTooltip(event, message) {
    if (currentTooltip) hideTooltip();
    
    currentTooltip = document.createElement('div');
    currentTooltip.className = 'ghost-tooltip';
    
    // 내용 구성 (텍스트 + 점수 + 버튼)
    currentTooltip.innerHTML = `
        <div style="margin-bottom: 5px;">${message.content}</div>
        <div style="font-size: 11px; opacity: 0.8;">
            Score: ${message.score} 
            <button id="ghost-up" style="cursor:pointer; margin-left:10px;">👍</button>
            <button id="ghost-down" style="cursor:pointer;">👎</button>
        </div>
    `;
    
    document.body.appendChild(currentTooltip);

    // 버튼 이벤트 리스너 (이벤트 버블링 방지 위해 stopPropagation 사용 권장하지만 여기선 간단히)
    document.getElementById('ghost-up').onclick = () => castVote(message.id, 'UP');
    document.getElementById('ghost-down').onclick = () => castVote(message.id, 'DOWN');

    currentTooltip.style.left = event.pageX + 10 + 'px';
    currentTooltip.style.top = event.pageY + 10 + 'px';
    
    // 툴팁 위로 마우스가 가도 사라지지 않게 하려면 pointer-events 수정이 필요하지만 
    // MVP에서는 클릭 후 새로고침으로 처리합니다.
    currentTooltip.style.pointerEvents = 'auto'; 
}

function castVote(messageId, type) {
    chrome.runtime.sendMessage({
        action: "voteMessage",
        messageId, type
    }, (response) => {
        if (response.success) {
            alert("투표가 반영되었습니다!");
            location.reload();
        }
    });
}
```

### [Step 2-2] background.js에 투표 통신 추가
```javascript
// background.js의 onMessage 리스너 내부에 추가
if (request.action === "voteMessage") {
    fetch(`${API_BASE_URL}/${request.messageId}/vote?type=${request.type}`, {
        method: "POST"
    })
    .then(res => res.json())
    .then(data => sendResponse({ success: true, data }))
    .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
}
```

---

## 💡 학습 포인트
- **@PathVariable**: URL 경로에 포함된 값(id)을 변수로 받을 때 사용합니다.
- **innerHTML**: HTML 태그를 문자열로 직접 삽입할 때 사용하며, 동적인 UI를 빠르게 만들 때 유용합니다.
- **Transactional**: DB 값을 수정할 때 데이터의 일관성을 보장하기 위해 서비스 메서드에 반드시 붙여야 합니다.
