# Phase 20 가이드: 툴팁 UI 리팩토링 및 스타일 커스터마이징

본 가이드는 투박했던 툴팁 UI를 현대적으로 개선하고, 스크롤바 스타일링 및 설정 페이지를 통한 툴팁 색상 커스터마이징 기능을 추가하는 과정을 다룹니다.

---

## 1. 툴팁 레이아웃 및 스크롤바 스타일링 (CSS)

### [Step 20-1] 툴팁 디자인 고도화
기존의 답답한 UI를 개선하기 위해 `style.css`에 상세 스타일을 추가합니다.
1. `extensions/style.css` 파일을 열어 아래 스타일을 추가/수정합니다.

```css
/* 툴팁 기본 스타일 개선 */
.ghost-tooltip {
    position: absolute;
    z-index: 10000;
    background: #1e1e2e; /* 딥 다크 테마 */
    color: #cdd6f4;
    padding: 12px;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.1);
    font-family: 'Pretendard', sans-serif;
    min-width: 200px;
    max-width: 350px;
    pointer-events: auto;
}

/* 커스텀 스크롤바 - 메시지 미관을 해치지 않는 깔끔한 디자인 */
.ghost-tooltip div::-webkit-scrollbar {
    width: 5px;
}
.ghost-tooltip div::-webkit-scrollbar-track {
    background: transparent;
}
.ghost-tooltip div::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 10px;
}
.ghost-tooltip div::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.4);
}

/* 메시지 아이템 스타일 */
.message-item {
    padding: 10px 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
}
.message-item:last-child {
    border-bottom: none !important;
}
```

---

## 2. 설정 페이지 확장 (options.html & options.js)

### [Step 20-2] 툴팁 색상 컨트롤러 추가
1. `extensions/options.html`에 툴팁 배경색과 글자색을 고를 수 있는 UI를 추가합니다.

```html
    <div class="section">
        <label>툴팁 스타일 커스텀</label>
        <div style="display: flex; gap: 20px;">
            <div>
                <span>배경색</span>
                <input type="color" id="tooltipBgColor" value="#1e1e2e">
            </div>
            <div>
                <span>글자색</span>
                <input type="color" id="tooltipTextColor" value="#cdd6f4">
            </div>
        </div>
    </div>
```

2. `extensions/options.js`에서 위 값들을 저장하고 미리보기에 반영하도록 업데이트합니다. (Phase 18 로직과 동일하게 확장)

---

## 3. 동적 스타일 적용 (content.js)

### [Step 20-3] showTooltip 함수 수정
사용자가 설정한 색상을 툴팁 생성 시점에 적용합니다.

```javascript
function showTooltip(event, messageList, link) {
    chrome.storage.sync.get({
        tooltipBgColor: '#1e1e2e',
        tooltipTextColor: '#cdd6f4'
    }, (settings) => {
        if (currentTooltip) hideTooltip();
        
        activeLink = link;
        currentTooltip = document.createElement('div');
        currentTooltip.className = 'ghost-tooltip';
        
        // 동적 색상 적용
        currentTooltip.style.backgroundColor = settings.tooltipBgColor;
        currentTooltip.style.color = settings.tooltipTextColor;
        
        // ... (이후 메시지 생성 로직 동일)
    });
}
```

---

## 💡 학습 포인트
- **Webkit Scrollbar:** 브라우저 기본 스크롤바 대신 CSS를 통해 웹 앱 같은 느낌의 슬림한 스크롤바를 만드는 기술을 배웁니다.
- **Glassmorphism 기초:** 반투명 테두리와 그림자를 활용하여 세련된 플로팅 UI를 구성하는 감각을 익힙니다.
