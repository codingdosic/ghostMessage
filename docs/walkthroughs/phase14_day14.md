# Phase 14 가이드: 멀티 팩터 앵커링 (Text & Image Anchoring)

본 가이드는 URL과 Selector 외에도 링크 내의 텍스트와 이미지 정보를 활용하여 앵커링을 더욱 정교하고 유연하게 고도화하는 과정을 다룹니다.

---

## 1. 백엔드 데이터 모델 확장 (Eclipse)

### [Step 14-1] Message 엔티티 수정
1. `ghostMessage/src/main/java/com/ghostMessage/domain/Message.java`에 `linkText`와 `imgSrc` 필드를 추가합니다.

### [Step 14-2] DTO 및 서비스 수정
1. `MessageRequestDTO`, `MessageResponseDTO`에 동일한 필드를 추가합니다.
2. `MessageService`에서 저장 및 조회 시 해당 필드들이 누락되지 않도록 매핑 로직을 업데이트합니다.

---

## 2. 프론트엔드 정보 추출 및 매칭 (VS Code)

### [Step 14-3] 정교한 정보 추출
1. `extensions/content.js`의 메시지 저장 로직에서 `innerText`와 `img src`를 함께 추출하도록 수정합니다.
   ```javascript
   const linkText = targetLink.innerText.trim();
   const imgSrc = targetLink.querySelector('img')?.src || null;
   ```

### [Step 14-4] 유연한 매칭 알고리즘 적용
1. `applyHighlights`와 `mouseover` 필터링 로직에서 아래 우선순위에 따라 매칭 여부를 판단합니다.
   - Selector가 일치하거나,
   - 텍스트가 일치하거나,
   - 이미지 주소가 일치하면 동일 링크로 간주.

---

## 💡 학습 포인트
- **Fallback Matching**: 사이트 구조가 바뀌어 Selector가 깨지더라도, 텍스트나 이미지가 같다면 메시지를 복구해낼 수 있는 유연성을 확보합니다.
- **Fingerprinting**: 요소가 가진 여러 특징을 조합하여 고유한 '지문'을 만드는 개념을 익힙니다.
