# Phase 18 가이드: 하이라이트 커스텀 및 실시간 미리보기 (Live Preview)

본 가이드는 하이라이트 표시 여부와 색상을 사용자가 직접 고르고, 설정 창에서 이를 즉시 확인할 수 있는 '미리보기(Live Preview)' UI를 구축하는 상세 매뉴얼입니다.

---

## 1. 설정 페이지 UI 구성 (options.html)

### [Step 18-1] 하이라이트 설정 섹션 및 미리보기 영역 추가
사용자가 색상을 고르고 투명도를 조절할 수 있는 컨트롤러와, 결과를 즉시 볼 수 있는 가짜 링크(Link)를 배치합니다.
1. `extensions/options.html` 파일을 엽니다.
2. `<div class="section">` 아래에 다음 내용을 추가합니다.

```html
    <div class="section">
        <label>하이라이트 설정</label>
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
            <input type="checkbox" id="enableHighlight"> <span>하이라이트 사용</span>
            <input type="color" id="highlightColor" value="#6200ee">
            <input type="range" id="highlightOpacity" min="0" max="1" step="0.1" value="0.15">
            <span id="opacityValue">15%</span>
        </div>
        
        <!-- 실시간 미리보기 영역 -->
        <div id="previewContainer" style="padding: 15px; border: 1px dashed #ccc; border-radius: 5px; background: #f9f9f9;">
            <p style="font-size: 12px; color: #666; margin-bottom: 8px;">실시간 미리보기</p>
            <a id="previewLink" href="#" style="text-decoration: none; color: #000; font-weight: bold; padding: 2px 4px;">
                이것은 유령 메시지가 있는 링크입니다 👻
            </a>
        </div>
    </div>
```

---

## 2. 실시간 미리보기 및 저장 로직 (options.js)

### [Step 18-2] 설정값 불러오기 및 실시간 반영
저장된 설정을 불러와 UI에 세팅하고, 값이 바뀔 때마다 미리보기 스타일을 업데이트합니다.
1. `extensions/options.js` 파일을 열어 기존 코드를 아래와 같이 확장합니다.

```javascript
// 설정값 엘리먼트 참조
const sortOrderEl = document.getElementById('sortOrder');
const enableHighlightEl = document.getElementById('enableHighlight');
const highlightColorEl = document.getElementById('highlightColor');
const highlightOpacityEl = document.getElementById('highlightOpacity');
const opacityValueEl = document.getElementById('opacityValue');
const previewLinkEl = document.getElementById('previewLink');

// 1. 설정 불러오기
chrome.storage.sync.get({
    sortOrder: 'DESC',
    enableHighlight: true,
    highlightColor: '#6200ee',
    highlightOpacity: 0.15
}, (items) => {
    sortOrderEl.value = items.sortOrder;
    enableHighlightEl.checked = items.enableHighlight;
    highlightColorEl.value = items.highlightColor;
    highlightOpacityEl.value = items.highlightOpacity;
    updatePreview(); // 불러온 값으로 미리보기 업데이트
});

// 2. 실시간 미리보기 업데이트 함수
function updatePreview() {
    const isEnabled = enableHighlightEl.checked;
    const color = highlightColorEl.value;
    const opacity = highlightOpacityEl.value;
    
    opacityValueEl.innerText = Math.round(opacity * 100) + "%";

    if (isEnabled) {
        previewLinkEl.style.borderBottom = `3px solid ${color}`;
        // hex 색상을 rgba로 변환하여 투명도 적용 (간단한 방식)
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        previewLinkEl.style.backgroundColor = `rgba(${r}, ${g}, ${b}, ${opacity})`;
    } else {
        previewLinkEl.style.borderBottom = "none";
        previewLinkEl.style.backgroundColor = "transparent";
    }
}

// 3. 이벤트 리스너 등록
[enableHighlightEl, highlightColorEl, highlightOpacityEl].forEach(el => {
    el.addEventListener('input', updatePreview);
});

// 4. 설정 저장하기
document.getElementById('save').onclick = () => {
    chrome.storage.sync.set({
        sortOrder: sortOrderEl.value,
        enableHighlight: enableHighlightEl.checked,
        highlightColor: highlightColorEl.value,
        highlightOpacity: parseFloat(highlightOpacityEl.value)
    }, () => {
        alert('설정이 저장되었습니다!');
    });
};
```

---

## 3. 웹페이지 동적 스타일 적용 (content.js)

### [Step 18-3] 사용자 설정 기반 하이라이트 적용
하드코딩된 보라색 대신 사용자가 설정한 값을 가져와서 적용하도록 `applyHighlights` 함수를 수정합니다.
1. `extensions/content.js`의 `applyHighlights` 함수를 찾습니다.
2. `chrome.storage.sync.get`을 사용하여 설정을 읽어온 후 스타일을 적용하도록 로직을 변경합니다.

```javascript
function applyHighlights() {
    // 사용자 설정 가져오기
    chrome.storage.sync.get({
        enableHighlight: true,
        highlightColor: '#6200ee',
        highlightOpacity: 0.15
    }, (settings) => {
        if (!settings.enableHighlight) {
            // 하이라이트가 꺼져있으면 기존 스타일 초기화 후 종료
            document.querySelectorAll('a[data-ghost-highlighted]').forEach(link => {
                link.style.borderBottom = "";
                link.style.backgroundColor = "";
                delete link.dataset.ghostHighlighted;
            });
            return;
        }

        const links = document.querySelectorAll('a');
        const color = settings.highlightColor;
        const opacity = settings.highlightOpacity;
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        const rgba = `rgba(${r}, ${g}, ${b}, ${opacity})`;

        links.forEach((link) => {
            const key = normalizeUrl(link.href);
            const messages = messageMap.get(key);
            
            if (messages) {
                const hasMatch = messages.some(msg => {
                    return (!msg.selector || link.matches(msg.selector)) &&
                           (!msg.linkText || link.innerText.trim() === msg.linkText.trim());
                });
                
                if (hasMatch) {
                    link.style.borderBottom = `3px solid ${color}`;
                    link.style.backgroundColor = rgba;
                    link.dataset.ghostHighlighted = "true"; // 처리된 링크임을 표시
                }
            }
        });
    });
}
```

---

## 💡 학습 포인트
- **UX Feedback Loop (실시간 미리보기):** 사용자가 `Save` 버튼을 누르기 전에 결과를 미리 보게 함으로써 잘못된 설정을 방지하고 만족도를 높이는 핵심적인 UX 패턴입니다.
- **Chrome Storage API:** `chrome.storage.sync`를 사용하면 사용자의 구글 계정에 설정이 동기화되어 여러 PC에서도 동일한 설정을 유지할 수 있습니다.
- **Dynamic CSS vs Inline Style:** 자바스크립트를 통해 `element.style`을 직접 제어하는 방식은 CSS 파일만으로 해결하기 어려운 '사용자 맞춤형 색상' 적용에 매우 효과적입니다.
- **RGB to Hex & Transparency:** CSS에서는 `#RRGGBBAA` 형식도 지원하지만, 구형 브라우저 호환성을 위해 `rgba()` 함수를 활용하는 법을 익혔습니다.
