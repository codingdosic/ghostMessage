// 초기 기본값 정의
const DEFAULTS = {
    sortOrder: 'SCORE', 
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
    if (confirm("Reset highlight settings to default?")) {
        enableHighlightEl.checked = DEFAULTS.enableHighlight;
        highlightColorEl.value = DEFAULTS.highlightColor;
        highlightOpacityEl.value = DEFAULTS.highlightOpacity;
        updatePreview();
    }
};

resetTooltipBtn.onclick = () => {
    if (confirm("Reset tooltip style settings to default?")) {
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
        alert('Settings saved!');
    });
};

// ---------------------------------------------------------
// 5. 내가 작성한 메시지 관리 로직 (Phase 26-2)
// ---------------------------------------------------------
const searchContentEl = document.getElementById('searchContent');
const myMessageSortEl = document.getElementById('myMessageSort');
const myMessageListEl = document.getElementById('myMessageList');

let myMessagesData = []; // 백엔드에서 가져온 원본 데이터

// const SERVER_URL = "http://168.107.12.18:8080"; // 운영 서버
const SERVER_URL = "http://localhost:8080"; // 로컬 서버

// [추가] 내 메시지 목록 불러오기
function loadMyMessages() {
    chrome.storage.local.get(['userId'], (result) => {
        const userId = result.userId;
        if (!userId) {
            myMessageListEl.innerHTML = '<p style="text-align: center; color: #ff5252; font-size: 13px; margin-top: 60px;">User information not found.</p>';
            return;
        }

        fetch(`${SERVER_URL}/api/messages/user/${userId}`)
            .then(res => res.json())
            .then(data => {
                myMessagesData = data;
                renderMyMessages();
            })
            .catch(err => {
                console.error("Failed to load messages:", err);
                myMessageListEl.innerHTML = '<p style="text-align: center; color: #ff5252; font-size: 13px; margin-top: 60px;">An error occurred while loading data.</p>';
            });
    });
}

// 메시지 렌더링 함수
function renderMyMessages() {
    const searchTerm = searchContentEl.value.toLowerCase();
    const sortType = myMessageSortEl.value;

    // 1. 필터링 (내용 검색)
    let filtered = myMessagesData.filter(msg => 
        msg.content.toLowerCase().includes(searchTerm)
    );

    // 2. 정렬
    filtered.sort((a, b) => {
        if (sortType === 'score') {
            return (b.upVoteScore - b.downVoteScore) - (a.upVoteScore - a.downVoteScore);
        } else if (sortType === 'desc') {
            return new Date(b.createdAt) - new Date(a.createdAt);
        } else if (sortType === 'asc') {
            return new Date(a.createdAt) - new Date(b.createdAt);
        }
        return 0;
    });

    // 3. HTML 생성 및 삽입
    if (filtered.length === 0) {
        myMessageListEl.innerHTML = '<p style="text-align: center; color: #aaa; font-size: 13px; margin-top: 60px;">No messages found.</p>';
        return;
    }

    myMessageListEl.innerHTML = filtered.map(msg => `
        <div class="message-item" data-url="${msg.pageUrl}" style="border-bottom: 1px solid #eee; padding: 12px 0; color: #333; cursor: pointer; transition: background 0.2s;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px; pointer-events: none;">
                <span style="font-size: 11px; font-weight: bold; color: #6200ee; background: #f0e6ff; padding: 2px 6px; border-radius: 4px;">
                    ${msg.type || 'Normal'}
                </span>
                <span style="font-size: 11px; color: #999;">${new Date(msg.createdAt).toLocaleString()}</span>
            </div>
            <div style="font-size: 14px; margin-bottom: 8px; line-height: 1.4; pointer-events: none;">${msg.content}</div>
            <div style="display: flex; align-items: center; gap: 12px; font-size: 12px; color: #666; pointer-events: none;">
                <span>👍 ${msg.upVoteScore}</span>
                <span>👎 ${msg.downVoteScore}</span>
                <span style="margin-left: auto; font-size: 10px; color: #aaa; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${msg.pageUrl}">
                    📍 ${new URL(msg.pageUrl).hostname}
                </span>
            </div>
        </div>
    `).join('');
}

// 이벤트 리스너 등록
searchContentEl.addEventListener('input', renderMyMessages);
myMessageSortEl.addEventListener('change', renderMyMessages);

// [추가] 메시지 클릭 시 해당 페이지 이동
myMessageListEl.addEventListener('click', (e) => {
    const item = e.target.closest('.message-item');
    if (item && item.dataset.url) {
        window.open(item.dataset.url, '_blank');
    }
});

// 호버 시 배경색 변경 (CSS 없이 JS로 간단히 처리)
myMessageListEl.addEventListener('mouseover', (e) => {
    const item = e.target.closest('.message-item');
    if (item) item.style.backgroundColor = '#f8f8f8';
});
myMessageListEl.addEventListener('mouseout', (e) => {
    const item = e.target.closest('.message-item');
    if (item) item.style.backgroundColor = 'transparent';
});

// 초기 로드 실행
loadMyMessages();
