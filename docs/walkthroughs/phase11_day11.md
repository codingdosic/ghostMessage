# Phase 11 가이드: 툴팁 인터랙션 개선 및 다중 메시지 대응

본 가이드는 유령 메시지 툴팁을 더 편리하게 조작할 수 있도록 개선하고, 하나의 링크에 여러 명의 유령이 흔적을 남겼을 때 이를 모두 보여주는 기능을 구현합니다.

---

## 1. 툴팁 조작성 개선 (Interaction Fix)

현재 툴팁은 마우스를 링크에서 떼는 순간 바로 사라져서 버튼을 누르기가 어렵습니다. 이를 해결하기 위해 150ms의 유예 시간을 줍니다.

### [Step 1-1] content.js의 hideTooltip 호출 로직 수정
`extensions/content.js`의 `mouseover` 이벤트 리스너 하단에 있는 `mouseleave` 부분을 다음과 같이 수정합니다.

```javascript
// extensions/content.js 내부 수정
link.addEventListener('mouseleave', () => {
    // [수정] 즉시 지우지 않고 아주 잠깐 기다림
    setTimeout(() => {
        // 마우스가 툴팁 위로 옮겨갔다면 지우지 않음
        if (currentTooltip && currentTooltip.matches(':hover')) {
            return; 
        }
        hideTooltip();
    }, 150); // 0.15초의 여유 시간

    delete link.dataset.ghostProcessed;
}, { once: true });
```

### [Step 1-2] 툴팁 영역을 벗어날 때 사라지는 기능 추가
`showTooltip` 함수 안에서 툴팁 자체에 이벤트 리스너를 추가합니다.

```javascript
function showTooltip(event, messageList) {
    // ... 기존 생성 코드 ...

    // [추가] 툴팁 자체에서 마우스가 나가면 삭제
    currentTooltip.addEventListener('mouseleave', () => {
        hideTooltip();
    });
}
```

---

## 2. 다중 메시지 리스트 UI 구현

백엔드는 이미 리스트(`List<MessageResponseDTO>`)를 반환하고 있습니다. 프론트엔드에서 이를 모두 렌더링하도록 변경합니다.

### [Step 2-1] content.js 데이터 요청부 수정
배열 전체를 전달하도록 `response.data[0]`을 `response.data`로 수정합니다.

```javascript
// extensions/content.js 내부 수정
chrome.runtime.sendMessage({
    action: "fetchMessages",
    pageUrl, anchorKey
}, (response) => {
    if (response.success && response.data && response.data.length > 0) {
        // [수정] 첫 번째 요소([0])가 아닌 배열 전체(data)를 넘깁니다.
        showTooltip(e, response.data); 
    } else {
        console.log("[GhostMessage] No message for this link.");
    }
});
```

### [Step 2-2] showTooltip 함수 구조 변경
단일 객체가 아닌 **배열(List)**을 받도록 수정하고, `map()`을 사용하여 여러 개의 메시지 아이템을 생성합니다. 또한 기존의 단일 메시지용 이벤트 리스너(ghost-up, ghost-down 등)는 제거합니다.

```javascript
function showTooltip(event, messageList) { // messageObj 대신 messageList를 받음
    if (currentTooltip) hideTooltip();
    
    currentTooltip = document.createElement('div');
    currentTooltip.className = 'ghost-tooltip';
    
    // [수정] 리스트 내의 모든 메시지를 HTML로 변환
    const messagesHtml = messageList.map(msg => `
        <div class="message-item" style="border-bottom: 1px solid #eee; padding: 8px 0; margin-bottom: 5px;">
            <div style="font-weight: bold; font-size: 11px; color: #6200ee;">👻 ${msg.nickname || '익명'}</div>
            <div style="margin: 3px 0; font-size: 13px;">${msg.content}</div>
            <div style="font-size: 11px; display: flex; align-items: center; gap: 10px;">
                <span>👍 ${msg.upVoteScore} 👎 ${msg.downVoteScore}</span>
                <div style="margin-left: auto;">
                    <button onclick="event.stopPropagation(); castVote(${msg.id}, 'UP')" style="cursor:pointer; font-size: 10px;">추천</button>
                    <button onclick="event.stopPropagation(); castVote(${msg.id}, 'DOWN')" style="cursor:pointer; font-size: 10px;">비추천</button>
                    ${msg.authorId === '550e8400-e29b-41d4-a716-446655440000' ? `<button onclick="event.stopPropagation(); confirmDelete(${msg.id})" style="cursor:pointer; font-size: 10px; color: red;">삭제</button>` : ''}
                </div>
            </div>
        </div>
    `).join('');

    currentTooltip.innerHTML = `
        <div style="max-height: 300px; overflow-y: auto; padding-right: 5px;">
            ${messagesHtml}
        </div>
    `;

    document.body.appendChild(currentTooltip);

    // [중요] 기존의 단일 ID 기반 리스너(ghost-up 등)는 
    // 이제 HTML 내부의 onclick 속성으로 대체되었으므로 삭제합니다.

    currentTooltip.style.left = event.pageX + 10 + 'px';
    currentTooltip.style.top = event.pageY + 10 + 'px';
    currentTooltip.style.pointerEvents = 'auto'; 

    // [추가] 툴팁 자체에서 마우스가 나가면 삭제
    currentTooltip.addEventListener('mouseleave', () => {
        hideTooltip();
    });
}
```

---

## 💡 학습 포인트
- **setTimeout 유예 시간**: 사용자의 마우스 이동 속도를 고려한 UX 기법입니다. 링크에서 툴팁으로 마우스가 이동하는 찰나의 시간을 벌어줍니다.
- **Element.matches(':hover')**: 자바스크립트에서 현재 해당 요소에 마우스가 올라가 있는지 여부를 CSS 상태를 통해 확인하는 강력한 방법입니다.
- **Array.map().join('')**: 서버에서 받은 데이터 목록을 HTML 문자열 하나로 합쳐서 화면에 한 번에 그려낼 때 사용하는 가장 대중적인 방식입니다.
- **event.stopPropagation()**: 버튼 클릭 이벤트가 부모 요소(툴팁 등)로 전달되어 의도치 않은 동작을 일으키는 것을 방지합니다.
