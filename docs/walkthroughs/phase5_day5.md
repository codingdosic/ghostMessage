# Phase 5 가이드: 통합 및 최종 검증 (매뉴얼)

본 가이드는 백엔드 API와 크롬 익스텐션을 연결하여, 실제 웹페이지에서 유령 메시지를 주고받는 기능을 완성하는 최종 단계입니다.

---

## 1. 백엔드 통신 구현 (Background Script)

### [Step 1-1] background.js 작성
보안 및 네트워크 성능을 위해 API 호출은 Background에서 전담합니다.

```javascript
const API_BASE_URL = "http://localhost:8080/api/messages";

// Content Script로부터 요청을 받으면 실행됨
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "fetchMessages") {
        const { pageUrl, anchorKey } = request;
        
        // 백엔드 서버 호출
        fetch(`${API_BASE_URL}?pageUrl=${encodeURIComponent(pageUrl)}&anchorKey=${encodeURIComponent(anchorKey)}`)
            .then(res => res.json())
            .then(data => sendResponse({ success: true, data }))
            .catch(err => sendResponse({ success: false, error: err.message }));
            
        return true; // 비동기 응답을 위해 true 반환 필수
    }
});
```

---

## 2. 툴팁 노출 및 연동 (Content Script 업데이트)

### [Step 2-1] content.js 수정
마우스 Hover 시 Background에 데이터를 요청하고 툴팁을 띄웁니다.

```javascript
let currentTooltip = null;

document.querySelectorAll('a').forEach(link => {
    link.addEventListener('mouseenter', (e) => {
        const pageUrl = window.location.href;
        const anchorKey = link.getAttribute('href');

        // Background에 데이터 요청
        chrome.runtime.sendMessage({
            action: "fetchMessages",
            pageUrl, anchorKey
        }, (response) => {
            if (response.success && response.data.length > 0) {
                showTooltip(e, response.data[0].content); // 첫 번째 메시지 노출
            }
        });
    });

    link.addEventListener('mouseleave', hideTooltip);
});

function showTooltip(event, text) {
    if (currentTooltip) hideTooltip();
    
    currentTooltip = document.createElement('div');
    currentTooltip.className = 'ghost-tooltip';
    currentTooltip.innerText = text;
    document.body.appendChild(currentTooltip);

    // 마우스 위치 근처에 배치
    currentTooltip.style.left = event.pageX + 10 + 'px';
    currentTooltip.style.top = event.pageY + 10 + 'px';
}

function hideTooltip() {
    if (currentTooltip) {
        currentTooltip.remove();
        currentTooltip = null;
    }
}
```

---

## 3. 최종 테스트 및 확장 프로그램 로드

### [Step 3-1] 크롬에 익스텐션 등록
1. 크롬 브라우저에서 `chrome://extensions/` 접속.
2. 우측 상단 '개발자 모드' 활성화.
3. '압축해제된 확장 프로그램을 로드합니다' 클릭 -> `extension` 폴더 선택.

### [Step 3-2] 동작 확인
1. 백엔드 서버 실행 확인.
2. 아무 웹사이트나 접속하여 링크에 마우스를 올려봅니다.
3. (미리 DB에 데이터를 넣어두었다면) 유령 툴팁이 뜨는 것을 확인합니다!

---

## 💡 학습 포인트
- **chrome.runtime.sendMessage:** Content Script와 Background Script 간의 통신 채널입니다.
- **Service Worker Persistence:** Background Script는 필요할 때만 깨어나서 동작하므로 매우 효율적입니다.
- **encodeURIComponent:** URL에 특수문자가 포함되어도 API 요청이 깨지지 않도록 안전하게 변환해줍니다.
- **최종 검증:** 백엔드와 프론트엔드가 유기적으로 연결되는 이 순간이 개발의 가장 큰 즐거움입니다.
