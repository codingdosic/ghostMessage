# Phase 13 가이드: 익스텐션 설정 페이지 및 사용자 환경설정

본 가이드는 툴팁의 정렬 기준(최신순/오래된순)을 사용자가 직접 선택할 수 있도록 익스텐션의 **설정(Options) 페이지**를 구축하고, 이를 실제 기능에 연동하는 과정을 다룹니다.

---

## 1. 설정 페이지 UI 구축

### [Step 1-1] manifest.json에 설정 페이지 및 권한 등록
`extensions/manifest.json`에 `options_ui`를 등록하고, 설정 저장을 위한 `storage` 권한을 추가합니다. (기존 권한을 유지하며 추가하세요.)

```json
{
  "manifest_version": 3,
  "name": "Web Ghost Message",
  // ... 중략 ...
  "options_ui": {
    "page": "options.html",
    "open_in_tab": true
  },
  "permissions": ["storage", "activeTab", "contextMenus"]
}
```

### [Step 1-2] options.html 작성
설정 화면의 레이아웃을 만듭니다. `extensions/options.html` 파일을 생성합니다.

```html
<!DOCTYPE html>
<html>
<head>
    <title>Ghost Message Settings</title>
    <style>
        body { padding: 20px; font-family: sans-serif; }
        .section { margin-bottom: 20px; }
        label { display: block; margin-bottom: 8px; font-weight: bold; }
    </style>
</head>
<body>
    <h2>👻 유령 메시지 설정</h2>
    <div class="section">
        <label>메시지 정렬 기준</label>
        <select id="sortOrder">
            <option value="DESC">최신순 (최신 흔적이 맨 위)</option>
            <option value="ASC">오래된순 (옛날 흔적이 맨 위)</option>
        </select>
    </div>
    <button id="save">설정 저장</button>
    <script src="options.js"></script>
</body>
</html>
```

### [Step 1-3] options.js 작성 (저장 로직)
사용자가 선택한 값을 `chrome.storage`에 저장합니다. `extensions/options.js` 파일을 생성합니다.

```javascript
// 설정 불러오기
chrome.storage.sync.get({ sortOrder: 'DESC' }, (items) => {
    document.getElementById('sortOrder').value = items.sortOrder;
});

// 설정 저장하기
document.getElementById('save').onclick = () => {
    const sortOrder = document.getElementById('sortOrder').value;
    chrome.storage.sync.set({ sortOrder }, () => {
        alert('설정이 저장되었습니다!');
    });
};
```

---

## 2. content.js에서 설정값 연동 (캐시 기반 최적화)

이미 Phase 12에서 페이지의 모든 메시지를 `messageMap`에 저장해 두었습니다. 이제 마우스를 올릴 때마다 서버에 요청하는 대신, 캐시된 데이터를 정렬 옵션에 맞춰 보여주도록 수정합니다.

### [Step 2-1] mouseover 리스너 고도화
`extensions/content.js`의 `mouseover` 이벤트 리스너 내부를 다음과 같이 수정합니다. 서버 요청(`fetchMessages`) 로직을 제거하고 `messageMap`을 활용합니다.

```javascript
// extensions/content.js 내부 수정
document.addEventListener('mouseover', (e) => {
    const link = e.target.closest('a');
    if (!link) return;

    const anchorKey = normalizeUrl(link.href);
    const messages = messageMap.get(anchorKey); // 캐시된 데이터 확인

    // 메시지가 있는 경우에만 처리
    if (messages && messages.length > 0) {
        if (link.dataset.ghostProcessed) return;

        // 1. chrome.storage에서 사용자의 정렬 설정을 가져옴
        chrome.storage.sync.get({ sortOrder: 'DESC' }, (items) => {
            // 2. 설정에 따라 메시지 정렬 (원본 훼손 방지를 위해 복사본 사용)
            const sorted = [...messages].sort((a, b) => {
                const dateA = new Date(a.createdAt);
                const dateB = new Date(b.createdAt);
                return items.sortOrder === 'ASC' ? dateA - dateB : dateB - dateA;
            });

            // 3. 정렬된 리스트로 툴팁 표시
            showTooltip(e, sorted);
        });

        link.dataset.ghostProcessed = "true";
    }
}, true);
```

---

## 💡 학습 포인트
- **Options UI**: 익스텐션 아이콘 우클릭 > '옵션'을 눌렀을 때 나타나는 페이지입니다. 복잡한 설정을 담기에 적합합니다.
- **chrome.storage.sync**: 사용자의 설정값을 브라우저에 저장하고, 마우스를 올리는 순간 실시간으로 읽어와 반영합니다.
- **캐시 우선 전략 (Cache-First)**: 이미 `init()`에서 데이터를 다 가져왔으므로, 개별 링크마다 서버에 또 물어볼 필요가 없습니다. 이는 서버 부하를 줄이고 반응 속도를 극대화합니다.
- **Array Spread (`[...]`)**: 원본 배열을 직접 정렬(`sort`)하면 `messageMap`의 순서가 계속 바뀔 수 있습니다. 복사본을 만들어 정렬하는 습관이 중요합니다.
