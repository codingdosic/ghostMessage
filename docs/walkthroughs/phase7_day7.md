# Phase 7 가이드: 메시지 작성 및 저장 (우클릭 메뉴)

본 가이드는 웹페이지의 링크에서 우클릭을 하여 "유령 메시지 남기기" 메뉴를 띄우고, 실제 메시지를 입력받아 백엔드 DB에 저장하는 기능을 구현합니다.

---

## 1. 우클릭 메뉴 추가 (Background Script)

사용자가 링크 위에서 우클릭했을 때 나타날 메뉴를 등록합니다.

### [Step 1-1] background.js 수정
메뉴 생성 코드와 메뉴 클릭 시의 동작을 추가합니다.

```javascript
const API_BASE_URL = "http://localhost:8080/api/messages";

// 1. 익스텐션 설치 시 우클릭 메뉴 생성
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "leaveGhostMessage",
        title: "유령 메시지 남기기...",
        contexts: ["link"] // 링크 위에서 우클릭했을 때만 나타남
    });
});

// 2. 메뉴 클릭 이벤트 처리
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "leaveGhostMessage") {
        // Content Script에 메시지 작성창을 띄우라고 신호를 보냄
        chrome.tabs.sendMessage(tab.id, {
            action: "openWriteModal",
            pageUrl: tab.url,
            anchorKey: info.linkUrl
        });
    }
});

// 3. 메시지 조회 및 저장 처리 (기존 fetchMessages 로직 포함)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "fetchMessages") {
        fetch(`${API_BASE_URL}?pageUrl=${encodeURIComponent(request.pageUrl)}&anchorKey=${encodeURIComponent(request.anchorKey)}`)
            .then(res => res.json())
            .then(data => sendResponse({ success: true, data }))
            .catch(err => sendResponse({ success: false, error: err.message }));
        return true;
    }

    if (request.action === "saveMessage") {
        fetch(API_BASE_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(request.data)
        })
        .then(res => res.json())
        .then(data => sendResponse({ success: true, data }))
        .catch(err => sendResponse({ success: false, error: err.message }));
        return true;
    }
});
```

---

## 2. 입력창 띄우기 (Content Script)

Background로부터 신호를 받으면 사용자에게 메시지를 입력받는 창을 띄웁니다.

### [Step 2-1] content.js 수정
아래 코드를 `content.js` 하단에 추가합니다. (MVP답게 `window.prompt`를 사용해 간단히 구현합니다.)

```javascript
// Background로부터의 메시지 수신
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "openWriteModal") {
        const messageContent = window.prompt("이 링크에 남길 유령 메시지를 입력하세요 (최대 100자):");
        
        if (messageContent && messageContent.trim().length > 0) {
            // 저장 요청 보내기
            chrome.runtime.sendMessage({
                action: "saveMessage",
                data: {
                    authorId: "550e8400-e29b-41d4-a716-446655440000", // 테스트용 고정 ID
                    pageUrl: request.pageUrl,
                    anchorKey: request.anchorKey,
                    type: "Tip",
                    content: messageContent
                }
            }, (response) => {
                if (response.success) {
                    alert("성공적으로 흔적을 남겼습니다!");
                    location.reload(); // 메시지 즉시 확인을 위해 새로고침
                } else {
                    alert("저장 실패: " + response.error);
                }
            });
        }
    }
});
```

---

## 3. 권한 설정 (manifest.json)

우클릭 메뉴 기능을 쓰려면 권한이 필요합니다.

### [Step 3-1] manifest.json 수정
`permissions` 항목에 `"contextMenus"`를 추가합니다.

```json
{
  ...
  "permissions": ["activeTab", "contextMenus"],
  ...
}
```

---

## 💡 테스트 방법
1. 익스텐션 페이지(`chrome://extensions`)에서 **새로고침** 버튼을 누릅니다. (중요: `background.js` 수정 시 필수!)
2. 아무 사이트(예: 구글)에 들어가서 링크를 **마우스 우클릭**합니다.
3. "유령 메시지 남기기..." 메뉴를 클릭하고 내용을 입력해 봅니다.
4. 다시 그 링크에 마우스를 올려 툴팁이 뜨는지 확인합니다.
