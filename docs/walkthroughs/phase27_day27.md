# Phase 27 가이드: 마이 메시지 내비게이션 기능

본 가이드는 설정 페이지의 메시지 리스트에서 특정 메시지를 클릭했을 때, 해당 페이지가 원래 위치했던 웹사이트로 새 탭을 열어 이동하는 기능을 구현합니다.

---

## 1. 페이지 이동 로직

### [Step 27-1] URL 이동 처리
1. `options.js`에서 메시지 리스트의 아이템에 클릭 이벤트를 추가합니다.
2. `chrome.tabs.create({ url: ... })`를 사용하여 새로운 탭에서 해당 `pageUrl`을 엽니다.

```javascript
function openPage(url) {
    chrome.tabs.create({ url: url });
}
```

---

## 💡 학습 포인트
- **Chrome Tabs API:** 익스텐션 환경에서 브라우저 탭을 조작하고 제어하는 방법을 배웁니다.
- **Deep Linking:** 저장된 URL 정보를 활용하여 웹 서비스 내 특정 페이지로 사용자를 유도하는 UX를 이해합니다.
