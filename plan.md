# Plan: HUD Collapsible & Draggable Feature

HUD를 클릭하여 접고 펼칠 수 있으며, 드래그하여 원하는 위치로 이동시킬 수 있는 기능을 추가합니다.

## Proposed Changes

### 1. `extensions/style.css`
- `#ghost-hud`의 `transition` 속성을 조정 (드래그 시 자연스럽게 반응하도록).
- `bottom: 15px; left: 15px;`를 기본값으로 하되, 인라인 스타일로 덮어씌울 수 있도록 구조 유지.
- 드래그 중임을 나타내는 클래스(예: `.dragging`) 추가 시 `transition: none;` 처리.

### 2. `extensions/ui-components.js`
- `createHUD()` 내부에 드래그 로직 추가:
    - `mousedown`: 시작 위치 저장, `mousemove` 및 `mouseup` 리스너 등록.
    - `mousemove`: HUD 위치 실시간 업데이트.
    - `mouseup`: 최종 위치 저장 및 리스너 제거.
- **클릭 vs 드래그 구분**: 이동 거리가 일정 픽셀(예: 5px) 미만인 경우에만 접기/펴기 토글 수행.
- 위치 정보(`hudPos: {top, left}`)를 `chrome.storage.local`에 저장 및 복구.

## Todo List
- [x] `extensions/style.css` 수정: 클릭 가능하도록 설정 및 `.collapsed` 스타일 추가.
- [x] `extensions/ui-components.js` 수정: `createHUD` 내부에 토글 로직 추가.
- [x] `extensions/style.css` 수정: 드래그 관련 스타일 추가 (dragging 클래스 등).
- [x] `extensions/ui-components.js` 수정: 드래그 로직 구현 및 위치 저장 기능 추가.
- [x] `extensions/ui-components.js` 수정: 화면 경계 제한 및 위치 복구 로직 추가.
- [ ] 기능 확인: 드래그 시 화면 밖으로 나가지 않는지, 초기화 시 안전한 위치에 표시되는지 확인.
