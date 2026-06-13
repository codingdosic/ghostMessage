# Phase 24 가이드: 커스텀 입력 모달 (Custom Input Modal)

본 가이드는 웹 브라우저의 투박한 `window.prompt` 알림창을 제거하고, 서비스의 정체성을 담은 세련된 커스텀 입력창(Modal)을 웹페이지 내부에 직접 구현합니다.

---

## 1. 모달 UI 구현

### [Step 24-1] 모달 템플릿 작성
1. `content.js`에 메시지 입력을 위한 HTML 모달 구조를 정의합니다.

```javascript
function openCustomWriteModal(anchorKey, pageUrl) {
    const modal = document.createElement('div');
    modal.className = 'ghost-modal-overlay';
    modal.innerHTML = `
        <div class="ghost-modal-content">
            <h3>👻 새로운 유령 흔적 남기기</h3>
            <textarea id="ghost-msg-input" placeholder="이 링크에 대한 당신의 생각을 남겨주세요..."></textarea>
            <div class="ghost-modal-buttons">
                <button id="ghost-cancel-btn">취소</button>
                <button id="ghost-submit-btn">흔적 남기기</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    // 포커스 자동 이동
    document.getElementById('ghost-msg-input').focus();
}
```

---

## 2. 이벤트 바인딩 및 Alert 대체

### [Step 24-2] 기존 Prompt 로직 교체
1. `chrome.runtime.onMessage` 리스너에서 `window.prompt`를 호출하던 부분을 위에서 만든 `openCustomWriteModal` 호출로 교체합니다.
2. 모달 내 '남기기' 버튼 클릭 시 기존의 `saveMessage` 메시지를 서버로 보내도록 연결합니다.

---

## 💡 학습 포인트
- **DOM Overlay:** 페이지 전체를 덮는 오버레이 레이어를 만들고 그 위에 모달을 띄우는 레이어링 기법을 배웁니다.
- **Event Delegation in Modal:** 모달 내부의 버튼 클릭 이벤트를 캡처하고 처리하는 효율적인 방법을 익힙니다.
- **User Experience (UX):** 브라우저 제어권을 뺏는 `alert/prompt` 대신, 서비스 내부의 흐름을 유지하는 커스텀 UI의 중요성을 이해합니다.
