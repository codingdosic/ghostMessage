# Phase 21 가이드: 하이라이트 디테일 개선 (Rounding & Glow)

본 가이드는 투박한 사각형 하이라이트를 부드러운 라운딩 처리가 된 현대적인 스타일로 개선하고, 줄바꿈 시에도 끊김 없이 아름답게 표시되도록 최적화하는 과정을 다룹니다.

---

## 1. 하이라이트 스타일 리팩토링

### [Step 21-1] 테두리 라운딩 및 그림자 효과 추가
1. `extensions/content.js`의 `applyHighlights` 함수 내 스타일 적용 부분을 수정합니다.

```javascript
// ... (기존 코드 내 link 루프 내부)
if (hasMatch) {
    link.style.borderBottom = `2px solid ${color}`;
    link.style.backgroundColor = rgba;
    
    // [추가] 라운딩 및 여백 처리
    link.style.borderRadius = "4px";
    link.style.padding = "1px 4px";
    link.style.margin = "0 -2px"; // 패딩으로 인한 텍스트 밀림 방지
    
    // [추가] 박스 장식 복제 (줄바꿈 대응)
    link.style.boxDecorationBreak = "clone";
    link.style.webkitBoxDecorationBreak = "clone";
    
    // [추가] 은은한 글로우 효과 (선택 사항)
    link.style.boxShadow = `0 2px 8px ${rgba}`;
    
    link.dataset.ghostHighlighted = "true";
}
```

---

## 2. 설정 페이지 연동

### [Step 21-2] 라운딩 강도 조절 옵션 추가
1. `options.html`에 하이라이트의 모서리 둥글기(`border-radius`)를 조절할 수 있는 슬라이더를 추가합니다.
2. `options.js` 및 `content.js`에서 해당 값을 연동합니다.

---

## 💡 학습 포인트
- **Box Decoration Break:** 인라인 요소(`<a>` 등)가 두 줄 이상으로 넘어갈 때, 각 줄의 시작과 끝에 패딩/테두리를 각각 적용해주는 마법 같은 CSS 속성을 배웁니다.
- **Negative Margin:** 패딩을 주었을 때 주변 텍스트 레이아웃이 미세하게 틀어지는 것을 음수 마진으로 보정하는 실무 UI 테크닉을 익힙니다.
