// 초기 기본값 정의
const DEFAULTS = {
    sortOrder: 'DESC',
    enableHighlight: true,
    highlightColor: '#6200ee',
    highlightOpacity: 0.15,
    tooltipBgColor: '#1e1e2e',
    tooltipTextColor: '#cdd6f4',
    tooltipOpacity: 0.9
};

// 설정값 엘리먼트 참조
const sortOrderEl = document.getElementById('sortOrder');
const enableHighlightEl = document.getElementById('enableHighlight');
const highlightColorEl = document.getElementById('highlightColor');
const highlightOpacityEl = document.getElementById('highlightOpacity');
const opacityValueEl = document.getElementById('opacityValue');
const previewLinkEl = document.getElementById('previewLink');
const previewTooltipEl = document.getElementById('previewTooltip');

// 툴팁 커스텀 엘리먼트 참조
const tooltipBgColorEl = document.getElementById('tooltipBgColor');
const tooltipTextColorEl = document.getElementById('tooltipTextColor');
const tooltipOpacityEl = document.getElementById('tooltipOpacity');
const tooltipOpacityValueEl = document.getElementById('tooltipOpacityValue');

// 버튼 엘리먼트 참조
const resetHighlightBtn = document.getElementById('resetHighlight');
const resetTooltipBtn = document.getElementById('resetTooltip');
const saveBtn = document.getElementById('save');

// 1. 설정 불러오기
chrome.storage.sync.get(DEFAULTS, (items) => {
    sortOrderEl.value = items.sortOrder;
    enableHighlightEl.checked = items.enableHighlight;
    highlightColorEl.value = items.highlightColor;
    highlightOpacityEl.value = items.highlightOpacity;
    
    tooltipBgColorEl.value = items.tooltipBgColor;
    tooltipTextColorEl.value = items.tooltipTextColor;
    tooltipOpacityEl.value = items.tooltipOpacity;
    
    updatePreview(); // 불러온 값으로 미리보기 업데이트
});

// 2. 실시간 미리보기 업데이트 함수
function updatePreview() {
    // 하이라이트 미리보기
    const isEnabled = enableHighlightEl.checked;
    const highlightColor = highlightColorEl.value;
    const hOpacity = highlightOpacityEl.value;
    
    opacityValueEl.innerText = Math.round(hOpacity * 100) + "%";

    if (isEnabled) {
        previewLinkEl.style.borderBottom = `3px solid ${highlightColor}`;
        const hr = parseInt(highlightColor.slice(1, 3), 16);
        const hg = parseInt(highlightColor.slice(3, 5), 16);
        const hb = parseInt(highlightColor.slice(5, 7), 16);
        previewLinkEl.style.backgroundColor = `rgba(${hr}, ${hg}, ${hb}, ${hOpacity})`;
    } else {
        previewLinkEl.style.borderBottom = "none";
        previewLinkEl.style.backgroundColor = "transparent";
    }

    // 툴팁 미리보기
    const bgColor = tooltipBgColorEl.value;
    const tOpacity = tooltipOpacityEl.value;
    tooltipOpacityValueEl.innerText = Math.round(tOpacity * 100) + "%";

    const tr = parseInt(bgColor.slice(1, 3), 16);
    const tg = parseInt(bgColor.slice(3, 5), 16);
    const tb = parseInt(bgColor.slice(5, 7), 16);
    
    previewTooltipEl.style.backgroundColor = `rgba(${tr}, ${tg}, ${tb}, ${tOpacity})`;
    previewTooltipEl.style.color = tooltipTextColorEl.value;
}

// 3. 이벤트 리스너 등록
[enableHighlightEl, highlightColorEl, highlightOpacityEl, tooltipBgColorEl, tooltipTextColorEl, tooltipOpacityEl].forEach(el => {
    el.addEventListener('input', updatePreview);
});

// 초기화 버튼 로직
resetHighlightBtn.onclick = () => {
    if (confirm("하이라이트 설정을 초기값으로 되돌리시겠습니까?")) {
        enableHighlightEl.checked = DEFAULTS.enableHighlight;
        highlightColorEl.value = DEFAULTS.highlightColor;
        highlightOpacityEl.value = DEFAULTS.highlightOpacity;
        updatePreview();
    }
};

resetTooltipBtn.onclick = () => {
    if (confirm("툴팁 스타일 설정을 초기값으로 되돌리시겠습니까?")) {
        tooltipBgColorEl.value = DEFAULTS.tooltipBgColor;
        tooltipTextColorEl.value = DEFAULTS.tooltipTextColor;
        tooltipOpacityEl.value = DEFAULTS.tooltipOpacity;
        updatePreview();
    }
};

// 4. 설정 저장하기
saveBtn.onclick = () => {
    chrome.storage.sync.set({
        sortOrder: sortOrderEl.value,
        enableHighlight: enableHighlightEl.checked,
        highlightColor: highlightColorEl.value,
        highlightOpacity: parseFloat(highlightOpacityEl.value),
        tooltipBgColor: tooltipBgColorEl.value,
        tooltipTextColor: tooltipTextColorEl.value,
        tooltipOpacity: parseFloat(tooltipOpacityEl.value)
    }, () => {
        alert('설정이 저장되었습니다!');
    });
};
