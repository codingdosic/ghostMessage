# Phase 16 가이드: 일일 제한 및 초기화 시스템 (Rate Limiting & Reset)

본 가이드는 무분별한 메시지 작성을 방지하고, 매일 정해진 한도를 자동으로 초기화하는 비즈니스 로직을 백엔드에 구현합니다. (Phase 15에서 할당받은 실제 사용자 ID를 기반으로 동작합니다.)

---

## 1. 백엔드 초기화 로직 구현 (Eclipse)

### [Step 16-1] 초기화 메서드 작성
1. `MessageService.java`에 사용자의 횟수를 체크하고 날짜가 지났으면 리셋하는 기능을 추가합니다.
   ```java
   private void resetLimitsIfNewDay(User user) {
       LocalDateTime now = LocalDateTime.now();
       LocalDateTime todayMidnight = now.toLocalDate().atStartOfDay();

       if (user.getLastMessageResetAt() == null || user.getLastMessageResetAt().isBefore(todayMidnight)) {
           user.setDailyMessageCount(0);
           user.setLastMessageResetAt(now);
       }
       if (user.getLastVoteResetAt() == null || user.getLastVoteResetAt().isBefore(todayMidnight)) {
           user.setDailyVoteCount(0);
           user.setLastVoteResetAt(now);
       }
   }
   ```

### [Step 16-2] 서비스 로직에 적용
1. `createMessage`와 `vote` 메서드 시작 시 `resetLimitsIfNewDay(user)`를 호출하여 실시간으로 한도를 관리합니다.

---

## 2. 사용자 알림 고도화

### [Step 16-3] 프론트엔드 에러 대응
1. `content.js`에서 작성 실패 시 서버가 보낸 에러 메시지(예: "한도 초과")를 `alert()`으로 띄워 사용자에게 알립니다.

---

## 💡 학습 포인트
- **Lazy Reset**: 별도의 배치 작업 없이 요청 시점에 데이터를 갱신하는 효율적인 서버 설계를 익힙니다.
- **Resource Management**: 서버 자원을 보호하기 위해 클라이언트별 사용량을 제어하는 기본 원리를 이해합니다.
