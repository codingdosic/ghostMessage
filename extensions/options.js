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