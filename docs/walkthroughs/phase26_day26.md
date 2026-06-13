# Phase 26 가이드: 설정 페이지 - 작성한 메시지 모아보기 (마이 페이지)

본 가이드는 설정 페이지(`options.html`)에 사용자가 지금까지 작성한 모든 유령 메시지를 리스트 형태로 모아보고, 필요 시 관리할 수 있는 '마이 페이지'를 구축합니다.

---

## 1. 데이터 조회 API 확장

### [Step 26-1] 작성자 ID 기준 조회
1. `MessageController.java`에 사용자 UUID를 받아 메시지를 조회하는 API를 추가합니다.

```java
    @GetMapping("/user/{uuid}")
    public ResponseEntity<List<MessageResponseDTO>> getMessagesByAuthor(@PathVariable(name = "uuid") UUID uuid) {
        return ResponseEntity.ok(messageService.getMessagesByAuthor(uuid));
    }
```

## 2. 설정 페이지 UI 구현

### [Step 26-2] 마이 메시지 컨테이너
1. `options.html`에 메시지 리스트가 표시될 영역을 추가합니다.
2. `options.js`에서 페이지 로드 시 해당 API를 호출하여 리스트를 렌더링합니다.

---

## 💡 학습 포인트
- **Data Fetching in Extension:** 설정 페이지와 같이 브라우저 뷰 안에서 백엔드 데이터를 비동기 호출하고 UI를 업데이트하는 패턴을 익힙니다.
- **Filtering Logic:** 데이터 전체를 가져와 프론트엔드에서 검색하거나 서버에서 필터링하는 효율적인 방식을 이해합니다.
