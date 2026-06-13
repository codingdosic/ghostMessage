# Phase 17 가이드: 추천수 기반 정렬 옵션 추가 (Sorting by Score)

본 가이드는 많은 추천을 받은 유용한 '흔적'을 상단에 노출하기 위해 설정 페이지에 정렬 옵션을 추가하고 적용합니다.

---

## 1. 설정 페이지 UI 확장 (VS Code)

### [Step 17-1] 정렬 옵션 추가
1. `extensions/options.html`에 `SCORE`(추천순) 옵션을 추가합니다.

---

## 2. 정렬 로직 구현 (JS)

### [Step 17-2] 순수 점수 계산 및 정렬
1. `extensions/content.js`에서 툴팁 렌더링 전 메시지 리스트를 `(추천 - 비추천)` 점수 기준으로 정렬합니다.
   ```javascript
   if (items.sortOrder === 'SCORE') {
       sorted.sort((a, b) => (b.upVoteScore - b.downVoteScore) - (a.upVoteScore - a.downVoteScore));
   }
   ```

---

## 💡 학습 포인트
- **Client-side Sorting**: 서버 부하를 줄이기 위해 클라이언트에서 데이터를 가공하여 보여주는 방식을 이해합니다.
- **Net Score**: 긍정적 반응과 부정적 반응을 종합하여 콘텐츠의 가치를 평가하는 방식을 익힙니다.
