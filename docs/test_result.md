# Test Results - Step 1: 핵심 로직 단위 테스트

본 문서는 Ghost Message 프로젝트의 서비스 운영 고도화(Phase 2) 중 Step 1에서 수행한 단위 테스트 결과를 기록합니다.

## step1_result

### 1. 테스트 코드 (Test Code)

#### 1.1 MessageServiceTest
`MessageService`의 핵심 비즈니스 로직(메시지 작성 제한, 투표 정합성)을 검증합니다.

```java
@ExtendWith(MockitoExtension.class)
class MessageServiceTest {
    // ... (중략: 메시지 작성 제한, 첫 투표, 중복 투표 차단, 투표 전환 테스트 로직)
}
```
*   **주요 시나리오:**
    *   `createMessage_Success`: 일일 10회 이내 메시지 작성 성공 및 카운트 증가.
    *   `createMessage_Fail_LimitExceeded`: 일일 10회 초과 시 작성 차단.
    *   `vote_Success_FirstTime`: 첫 투표 시 점수 반영 및 투표 기록 생성.
    *   `vote_Fail_LimitExceeded`: 일일 20회 초과 투표 차단.
    *   `vote_Fail_Duplicate`: 동일한 타입의 중복 투표 차단.
    *   `vote_Success_ChangeVote`: 추천 -> 비추천 전환 시 이전 점수 취소 및 신규 점수 반영.

#### 1.2 UserServiceTest
`UserService`의 보안 및 사용자 검증 로직을 검증합니다.

```java
@ExtendWith(MockitoExtension.class)
class UserServiceTest {
    // ... (중략: 보안 코드 일치 여부, 사용자 존재 여부 테스트 로직)
}
```
*   **주요 시나리오:**
    *   `validateUser_Success`: 유효한 보안 코드 입력 시 통과.
    *   `validateUser_Fail_InvalidCode`: 잘못된 보안 코드 입력 시 예외 발생.
    *   `validateUser_Fail_UserNotFound`: 존재하지 않는 사용자 ID 조회 시 예외 발생.

### 2. 테스트 결과 (Test Status)

| 테스트 클래스 | 성공 / 전체 | 결과 |
| :--- | :--- | :--- |
| `MessageServiceTest` | 6 / 6 | **PASSED** |
| `UserServiceTest` | 3 / 3 | **PASSED** |
| **합계** | **9 / 9** | **SUCCESS** |

**[실행 로그 요약]**
```text
> Task :test
BUILD SUCCESSFUL in 3s
4 actionable tasks: 1 executed, 3 up-to-date
```

### 3. 결과 분석 및 학습 내용 (Analysis)

1.  **동적 리셋 로직 고려 (resetLimitsIfNewDay):**
    *   `MessageService` 내부에서 날짜 변경 시 한도를 자동 초기화하는 로직이 있어, 테스트 데이터 셋업 시 `lastMessageResetAt` 값을 현재 시간으로 명시해 주어야 의도한 경계값 테스트가 가능함을 확인했습니다.
2.  **투표 전환 로직의 정합성:**
    *   추천에서 비추천으로 전환 시 단순히 +1을 하는 것이 아니라, 이전 투표 타입의 점수를 -1 하고 새로운 타입에 +1 하는 로직이 단위 테스트를 통해 정확히 검증되었습니다.
3.  **단위 테스트의 효율성:**
    *   `Mockito`를 활용하여 DB(PostgreSQL)나 Redis 연결 없이도 3초 내외의 빠른 속도로 비즈니스 로직을 검증할 수 있었습니다. 이는 향후 CI/CD 파이프라인에서 빠른 피드백을 제공하는 기반이 됩니다.
4.  **통합 테스트의 한계 확인:**
    *   `GhostMessageApplicationTests`와 같은 통합 테스트는 실제 인프라(DB 등)가 필요하므로 로컬 환경에서 단독 실행 시 실패할 수 있음을 확인했습니다. 비즈니스 로직 검증은 단위 테스트 위주로 구성하는 것이 효율적입니다.
