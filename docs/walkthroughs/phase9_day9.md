# Phase 9 가이드: 본인 메시지 관리 및 삭제

본 가이드는 본인이 남긴 유령 메시지를 식별하여 삭제할 수 있는 기능을 구현합니다. 익명 기반이지만 UUID를 통해 본인 확인 로직을 추가합니다.

---

## 1. 백엔드 삭제 API 구현

### [Step 1-1] MessageController에 삭제 메서드 추가
```java
// 특정 메시지 삭제 (본인 확인 포함)
@DeleteMapping("/{id}")
public ResponseEntity<Void> delete(
        @PathVariable(name = "id") Long id,
        @RequestParam(name = "authorId") UUID authorId) {
    messageService.deleteMessage(id, authorId);
    return ResponseEntity.noContent().build();
}
```

### [Step 1-2] MessageService에 삭제 로직 구현
```java
@Transactional
public void deleteMessage(Long id, UUID authorId) {
    Message message = messageRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("메시지를 찾을 수 없습니다."));

    // 본인 확인 (메시지에 저장된 authorId와 요청온 authorId 비교)
    if (!message.getAuthorId().equals(authorId)) {
        throw new RuntimeException("삭제 권한이 없습니다.");
    }

    messageRepository.delete(message);
}
```

---

## 2. 익스텐션 UI에 삭제 버튼 추가

현재 로그인 정보(테스트 ID)와 메시지의 `authorId`가 같으면 삭제 버튼을 보여줍니다.

### [Step 2-1] content.js의 showTooltip 수정
```javascript
const MY_ID = "550e8400-e29b-41d4-a716-446655440000"; // 현재 테스트용 고정 ID

function showTooltip(event, messageObj) {
    if (currentTooltip) hideTooltip();

    currentTooltip = document.createElement('div');
    currentTooltip.className = 'ghost-tooltip';

    // 삭제 버튼 추가 (본인일 때만)
    const deleteButton = messageObj.authorId === MY_ID 
        ? `<button id="ghost-delete" style="color:#ff4d4f; cursor:pointer; background:none; border:1px solid #ff4d4f; border-radius:3px; font-size:10px; padding: 2px 5px;">Delete</button>` 
        : "";

    currentTooltip.innerHTML = `
        <div style="font-weight: bold; font-size: 12px; margin-bottom: 3px; color: #555;">
            👻 ${messageObj.nickname || '익명'}
        </div>
        <div style="margin-bottom: 8px; font-size: 14px; line-height: 1.4;">${messageObj.content}</div>
        <div style="font-size: 12px; display: flex; align-items: center; gap: 8px; border-top: 1px solid #eee; padding-top: 5px;">
            <span title="추천">👍 ${messageObj.upVoteScore}</span>
            <span title="비추천">👎 ${messageObj.downVoteScore}</span>
            <div style="margin-left: auto; display: flex; gap: 5px; align-items: center;">
                <button id="ghost-up" style="cursor:pointer; padding: 2px 5px; font-size: 11px;">추천</button>
                <button id="ghost-down" style="cursor:pointer; padding: 2px 5px; font-size: 11px;">비추천</button>
                ${deleteButton}
            </div>
        </div>
    `;

    document.body.appendChild(currentTooltip);

    document.getElementById('ghost-up').onclick = () => castVote(messageObj.id, 'UP');
    document.getElementById('ghost-down').onclick = () => castVote(messageObj.id, 'DOWN');

    // 삭제 버튼 리스너 (버튼이 존재할 때만)
    if (messageObj.authorId === MY_ID) {
        document.getElementById('ghost-delete').onclick = () => confirmDelete(messageObj.id);
    }

    currentTooltip.style.left = event.pageX + 10 + 'px';
    currentTooltip.style.top = event.pageY + 10 + 'px';
    currentTooltip.style.pointerEvents = 'auto'; 
}

function confirmDelete(messageId) {
    if (confirm("정말로 이 흔적을 지우시겠습니까?")) {
        chrome.runtime.sendMessage({
            action: "deleteMessage",
            messageId, authorId: MY_ID
        }, (response) => {
            if (response.success) {
                alert("흔적이 사라졌습니다.");
                location.reload();
            } else {
                alert("삭제 실패: " + response.error);
            }
        });
    }
}
```

### [Step 2-2] background.js에 삭제 통신 추가
```javascript
// background.js 리스너 내부에 추가
if (request.action === "deleteMessage") {
    fetch(`${API_BASE_URL}/${request.messageId}?authorId=${request.authorId}`, {
        method: "DELETE"
    })
    .then(res => {
        if (res.ok) sendResponse({ success: true });
        else sendResponse({ success: false, error: "삭제 권한이 없거나 서버 오류입니다." });
    })
    .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
}
```

---

## 💡 학습 포인트
- **@DeleteMapping**: 데이터를 삭제할 때 사용하는 HTTP 메서드입니다.
- **UUID 비교**: Java에서 객체 간의 비교는 `==` 대신 `.equals()`를 사용해야 정확합니다.
- **confirm()**: 브라우저 기본 확인창을 띄워 실수를 방지합니다.
