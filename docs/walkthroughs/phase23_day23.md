# Phase 23 가이드: 플로팅 정보 대시보드 (HUD) 구축

본 가이드는 현재 페이지의 총 메시지 수와 사용자의 일일 활동 잔여량을 화면 구석에 작게 표시하여, 앱의 상태를 한눈에 파악할 수 있는 HUD(Heads-Up Display) 기능을 추가합니다.

---

## 1. HUD 구조 설계 (HTML/CSS)

### [Step 23-1] 대시보드 엘리먼트 생성
1. `content.js` 하단에 `createHUD` 함수를 추가합니다.

```javascript
function createHUD() {
    const hud = document.createElement('div');
    hud.id = 'ghost-hud';
    hud.innerHTML = `
        <div class="hud-item">📍 <span id="hud-total-msg">0</span> 흔적</div>
        <div class="hud-item">✍️ <span id="hud-remain-msg">10</span>/10</div>
        <div class="hud-item">👍 <span id="hud-remain-vote">20</span>/20</div>
    `;
    document.body.appendChild(hud);
}
```

2. `style.css`에 작고 세련된 플로팅 스타일을 추가합니다. (오른쪽 하단 고정, 반투명 배경)

---

## 2. 실시간 데이터 연동

### [Step 23-2] 데이터 업데이트 로직
1. `init` 함수 완료 시점 및 메시지 작성/투표 성공 시점에 HUD의 숫자를 갱신합니다.
2. `chrome.storage.local`에서 유저의 활동 카운트 정보를 실시간으로 읽어와 반영합니다.

---

## 💡 학습 포인트
- **Persistent UI:** 특정 요소에 귀속되지 않고 브라우저 뷰포트에 고정되어 정보를 제공하는 UI 설계법을 배웁니다.
- **Data Binding:** 내부 상태(`messageMap`, `storage`)의 변화를 감지하여 UI 숫자값에 투영하는 흐름을 익힙니다.
