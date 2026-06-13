# Phase 4 가이드: Chrome Extension 기초 및 UI (매뉴얼)

본 가이드는 웹페이지 내의 링크를 찾아내고, 마우스를 올렸을 때 "유령의 흔적"을 보여줄 UI를 구축하는 과정을 다룹니다.

---

## 1. 익스텐션 기본 구조 설정

### [Step 1-1] 폴더 및 파일 생성
백엔드 프로젝트와 별개로, `extension`이라는 폴더를 만들고 아래 파일들을 생성합니다.
1. `manifest.json`: 익스텐션의 설정 파일 (주민등록증 역할)
2. `content.js`: 웹페이지 내부에서 돌아가는 스크립트
3. `background.js`: 뒤에서 서버와 통신하는 비서 스크립트
4. `styles.css`: 툴팁 디자인

---

## 2. Manifest v3 설정

### [Step 2-1] manifest.json 작성
아래 내용을 복사하여 넣으세요. 크롬 익스텐션의 최신 규격(v3)입니다.

```json
{
  "manifest_version": 3,
  "name": "Web Ghost Messages",
  "version": "1.0",
  "description": "웹 위에 남겨진 유령의 메시지를 찾아보세요.",
  "permissions": ["activeTab"],
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "css": ["styles.css"]
    }
  ]
}
```

---

## 3. UI 디자인 (CSS)

### [Step 3-1]styles.css 작성
"유령" 느낌의 희미한 빛과 툴팁 스타일을 정의합니다.

```css
/* 유령 메시지가 있는 링크에 표시할 효과 */
.ghost-indicator {
  outline: 2px dotted rgba(150, 150, 255, 0.5);
  box-shadow: 0 0 8px rgba(100, 100, 255, 0.3);
  transition: all 0.3s ease;
}

/* 툴팁 기본 스타일 */
.ghost-tooltip {
  position: absolute;
  background: rgba(20, 20, 30, 0.9);
  color: #e0e0ff;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 13px;
  z-index: 10000;
  border-left: 3px solid #7a7aff;
  pointer-events: none;
  box-shadow: 0 4px 15px rgba(0,0,0,0.5);
}
```

---

## 4. 링크 감지 로직 (Content Script)

### [Step 4-1] content.js 작성
페이지 내 모든 `<a>` 태그를 찾아 마우스 이벤트를 등록합니다.

```javascript
console.log("👻 Web Ghost Messages 로드됨");

// 모든 링크 찾기
const links = document.querySelectorAll('a');

links.forEach(link => {
    // 1. 마우스를 올렸을 때
    link.addEventListener('mouseenter', (e) => {
        const href = link.getAttribute('href');
        if (!href) return;

        console.log("Hovered on:", href);
        // 여기서 나중에 서버에 메시지를 요청할 예정입니다.
    });

    // 2. 마우스가 나갔을 때
    link.addEventListener('mouseleave', () => {
        // 툴팁 제거 로직 예정
    });
});
```

---

## 💡 학습 포인트
- **Content Script:** 사용자가 접속한 웹사이트의 DOM(HTML 구조)에 직접 접근하여 조작할 수 있는 스크립트입니다.
- **Manifest v3:** 크롬 익스텐션의 최신 보안 표준으로, 서비스 워커를 사용하여 배터리와 메모리를 절약합니다.
- **Z-index:** 툴팁이 다른 웹 요소에 가려지지 않도록 매우 높은 값을 주어 맨 앞으로 끌어올립니다.
