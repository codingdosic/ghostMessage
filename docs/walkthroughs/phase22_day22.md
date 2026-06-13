# Phase 22 가이드: 비동기 UI 업데이트 (No-Reload UX)

본 가이드는 메시지 작성, 삭제, 투표 시 페이지 전체가 새로고침되어 사용자 경험을 해치는 문제를 해결하고, 부분적인 데이터 업데이트만으로 UI를 갱신하는 'Modern Web' 방식을 구축합니다.

---

## 1. 새로고침 제거 (Location.reload 삭제)

### [Step 22-1] 기존 코드의 reload 로직 제거
1. `extensions/content.js` 내의 모든 `location.reload()` 호출을 주석 처리하거나 삭제합니다.
   - `castVote` 함수 내부
   - `confirmDelete` 함수 내부
   - 메시지 저장 완료 콜백 내부

---

## 2. 실시간 상태 업데이트 (Local Map Update)

### [Step 22-2] 로컬 데이터 즉시 갱신 로직 추가
서버 응답이 성공하면, 새로고침 대신 메모리상의 `messageMap`을 직접 수정합니다.

```javascript
// 예: 투표 성공 시 로직 (castVote 내부)
if (response.success) {
    // 1. 로컬 맵 데이터 업데이트
    const messages = messageMap.get(currentAnchorKey);
    const targetMsg = messages.find(m => m.id === messageId);
    if (targetMsg) {
        if (type === 'UP') targetMsg.upVoteScore++;
        else targetMsg.downVoteScore++;
    }
    
    // 2. 현재 열려있는 툴팁만 다시 그리기 (화면 갱신)
    const sorted = sortMessages(messages); // 기존 정렬 로직 재사용
    renderTooltipContents(sorted); 
}
```

### [Step 22-3] UI 리렌더링 함수 분리
`showTooltip` 내부의 HTML 생성 로직을 `renderTooltipContents` 함수로 분리하여, 데이터만 바뀌었을 때 호출할 수 있게 합니다.

---

## 💡 학습 포인트
- **Optimistic UI:** 서버의 응답을 기다리지 않거나, 응답 즉시 부분 화면만 갱신하여 사용자에게 "즉각적"인 피드백을 주는 설계를 익힙니다.
- **Single Source of Truth:** 메모리상의 `messageMap`이 항상 최신 상태를 유지하게 관리하는 법을 배웁니다.
