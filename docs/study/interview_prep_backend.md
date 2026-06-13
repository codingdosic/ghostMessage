# 기술 면접 대비: 백엔드 & 인프라 상세 정리

본 문서는 `ghostMessage` 프로젝트의 기술적 의사결정과 구현 원리를 면접 관점에서 정리한 문서입니다. 

> 💡 **안내:** 본 문서의 내용과 매칭되는 상세 기술 설명이 아래 소스 코드 내에 **`[면접 대비 포인트]`** 주석으로 포함되어 있습니다. 문서를 읽으실 때 해당 파일들을 함께 참고하시면 코드 레벨의 구현 근거를 더 깊이 이해하실 수 있습니다.

### 🔍 소스 코드 내 기술 주석 가이드
| 기술 영역 | 주석이 포함된 주요 파일 | 핵심 주석 내용 |
|:---|:---|:---|
| **Framework** | `MessageController.java`, `UserController.java` | @RestController, 계층 분리 근거, CORS 설정 이유 |
| **Design Pattern** | `MessageRequestDTO.java`, `MessageResponseDTO.java` | DTO 사용 이유, 엔티티 보호, 빌더 패턴의 이점 |
| **Persistence** | `MessageRepository.java`, `User.java` | 비관적 락 vs 낙관적 락 적용 근거, JPA 생명주기(@PrePersist) |
| **Performance** | `RedisConfig.java`, `MessageService.java` | Cache-Aside 패턴, 직렬화 선택 이유, 캐시 정합성 유지 전략 |
| **Infra/DevOps** | `Dockerfile`, `docker-compose.yml` | 멀티 스테이지 빌드 원리, JVM 메모리 최적화, 자원 격리 전략 |
| **Security** | `UserService.java` | 보안 코드(securityCode)를 통한 무설정 인증 검증 로직 |

---

## Part 1. Framework & Architecture (Spring Boot)

### 1. 계층형 아키텍처 (Layered Architecture)
본 프로젝트는 관심사 분리(SoC, Separation of Concerns)를 위해 전형적인 계층형 아키텍처를 채택했습니다.

- **Presentation Layer (`Controller`):** 
    - 역할: HTTP 요청 매핑, 파라미터 바인딩, 입력 값 검증 및 응답 반환.
    - 구현 예시: `MessageController`, `UserController`
    - 면접 답변 포인트: "왜 계층을 나누었나?" -> "각 계층의 책임을 명확히 하여 유지보수성을 높이고, 비즈니스 로직이 외부 환경(HTTP, DB 등)에 직접 의존하지 않게 하기 위함입니다."

- **Business Layer (`Service`):**
    - 역할: 핵심 비즈니스 로직 처리, 트랜잭션(`@Transactional`) 관리.
    - 구현 예시: `MessageService`
    - 면접 답변 포인트: "서비스 계층에서 트랜잭션을 관리하는 이유?" -> "하나의 비즈니스 유닛(예: 메시지 작성 + 작성 횟수 증가)이 원자적(Atomic)으로 처리되어야 하므로 서비스 계층이 트랜잭션의 경계가 됩니다."

- **Data Access Layer (`Repository`):**
    - 역할: DB 인터페이스 제공 및 데이터 영속화.
    - 구현 예시: `MessageRepository` (Spring Data JPA 활용)

### 2. DTO (Data Transfer Object) 패턴 활용
엔티티(`Entity`)를 직접 API 응답으로 노출하지 않고 `RequestDTO`, `ResponseDTO`로 분리하여 관리합니다.

- **분리 이유:**
    1. **보안 및 캡슐화:** 엔티티 내부의 모든 필드(예: `securityCode`, `version` 등)가 외부에 노출되는 것을 방지합니다.
    2. **유연한 API 설계:** API 스펙 요구사항이 변하더라도 엔티티 구조를 변경하지 않고 DTO만 수정하여 대응할 수 있습니다.
    3. **순환 참조 방지:** JPA 양방향 연관관계 시 발생할 수 있는 JSON 직렬화 무한 루프 문제를 원천 차단합니다.

### 3. API 명세 (Major Endpoints)

| 기능 | Method | Endpoint | 주요 파라미터 / 바디 | 비고 |
|:---|:---:|:---|:---|:---|
| **메시지 작성** | `POST` | `/api/messages` | `MessageRequestDTO`, `securityCode` | 작성 제한(일 10회) 체크 |
| **메시지 조회** | `GET` | `/api/messages` | `pageUrl`, `anchorKey` | 특정 요소의 메시지 목록 (캐싱 적용) |
| **페이지 전체 조회** | `GET` | `/api/messages/all` | `pageUrl` | HUD 업데이트용 (캐싱 적용) |
| **메시지 투표** | `POST` | `/api/messages/{id}/vote` | `type`, `userId`, `securityCode` | 추천/비추천 (비관적 락 적용) |
| **메시지 삭제** | `DELETE` | `/api/messages/{id}` | `authorId`, `securityCode` | 본인 확인 및 삭제 |
| **사용자 등록** | `POST` | `/api/users/register` | `nickname` (Optional) | 초기 UUID 및 보안코드 발급 |
| **계정 복구** | `GET` | `/api/users/recover` | `uuid`, `securityCode` | 재설치 시 계정 연동용 |

---

## Part 2. Database & Persistence (JPA/PostgreSQL)

### 1. JPA 영속성 컨텍스트 (Persistence Context)
JPA는 엔티티를 영속성 컨텍스트라는 1차 캐시에 저장하여 관리합니다.

- **이점:**
    1. **변경 감지 (Dirty Checking):** 트랜잭션 종료 시 엔티티의 변경 사항을 자동으로 감지하여 `UPDATE` 쿼리를 실행합니다.
    2. **쓰기 지연 (Transactional Write-behind):** 트랜잭션을 커밋할 때까지 쿼리를 모았다가 한 번에 DB로 전송하여 네트워크 비용을 절감합니다.

### 2. 동시성 제어 전략 (Concurrency Control)
다중 사용자 환경에서 데이터 정합성을 보장하기 위해 두 가지 락 전략을 상황에 맞게 적용했습니다.

#### 2.1 비관적 락 (Pessimistic Lock)
- **적용 지점:** 메시지 추천/비추천 (투표 수 업데이트)
- **선택 이유:** 투표는 동일한 행(Row)에 대해 수많은 사용자가 동시에 수정할 가능성이 높은 **High-Contention** 작업입니다. 조회 시점부터 락을 선점하여 갱신 유실(Lost Update) 문제를 완벽히 방지하고자 했습니다.
- **구현:** `MessageRepository`에서 `@Lock(LockModeType.PESSIMISTIC_WRITE)` 사용.

#### 2.2 낙관적 락 (Optimistic Lock)
- **적용 지점:** 사용자별 일일 메시지 작성/투표 제한 횟수 업데이트
- **선택 이유:** 한 사용자가 여러 기기에서 동시에 메시지를 작성할 확률은 매우 낮습니다. 충돌 가능성이 낮으므로 DB 자원을 점유하는 비관적 락 대신, `@Version`을 활용한 애플리케이션 레벨의 체크로 성능을 최적화했습니다.
- **구현:** `User` 엔티티에 `@Version` 필드 추가.

### 3. DB 설계 및 URL 정규화
- **정규화:** 사용자의 UUID와 보안 코드를 분리하여 저장하고, `Vote` 테이블에는 `(messageId, userId)` 유니크 제약 조건을 걸어 중복 투표를 방지했습니다.
- **일관성:** `pageUrl`과 `anchorKey`는 대소문자 구분 및 트레일링 슬래시(`/`) 유무에 따라 다른 데이터로 인식될 수 있습니다. 이를 방지하기 위해 저장 및 조회 시점에 소문자 변환 및 슬래시 제거 로직을 거치는 **정규화(Normalization)** 과정을 거칩니다.

---

## Part 3. Caching & Performance (Redis)

### 1. Redis 도입 배경: 저사양 서버의 한계 극복
본 프로젝트의 서버는 1GB RAM이라는 매우 제한된 자원을 사용합니다. 부하 테스트(`k6`) 결과, 동시 접속자가 늘어남에 따라 DB I/O 병목으로 인해 응답 지연(Tail Latency)이 수 초까지 발생하는 문제를 확인했습니다. 이를 해결하기 위해 **Redis를 통한 캐싱 레이어**를 도입했습니다.

### 2. Cache-Aside 패턴 전략
애플리케이션에서 데이터를 읽을 때 항상 캐시를 먼저 확인하는 **Cache-Aside (Look-aside)** 패턴을 적용했습니다.

- **동작 방식:**
    1. 클라이언트 요청 시 Redis 캐시 확인.
    2. Cache Hit: 캐시 데이터 반환 (응답 시간 ~10ms).
    3. Cache Miss: DB 조회 후 결과를 캐시에 저장하고 반환.
- **장점:** 
    - 캐시 장애 시에도 시스템이 다운되지 않고 DB를 통해 정상 서비스 가능.
    - 실제 자주 사용되는 데이터만 캐시에 적재하여 메모리 낭비 최소화.

### 3. 캐시 정합성과 무효화 (Invalidation)
데이터 변경 시 캐시와 DB의 데이터 불일치 문제를 방지하기 위해 `Spring Cache` 어노테이션을 활용했습니다.

- **조회 (`@Cacheable`):** `pageUrl`과 `anchorKey` 조합을 키로 활용하여 결과 캐싱.
- **무효화 (`@CacheEvict`):** 새로운 메시지가 작성되거나 추천 점수가 변경될 때, 해당 페이지와 관련된 캐시를 즉시 삭제합니다. 
    - *면접 답변 포인트:* "왜 삭제(Evict)인가?" -> "수정(Update) 방식은 구현이 복잡하고 데이터 정합성을 맞추기 더 까다롭습니다. 삭제 후 재조회 방식이 단순하면서도 확실한 정합성을 보장합니다."

### 4. Redis 상세 설정 분석 (`RedisConfig.java`)
면접에서 설정 파일의 근거를 물을 때 다음과 같이 답변할 수 있습니다.

- **직렬화 방식:** `GenericJackson2JsonRedisSerializer`를 사용하여 데이터를 JSON 형태로 저장합니다. 이는 Binary 방식보다 가독성이 좋고 외부 도구(Redis-cli 등)에서 모니터링하기 용이합니다.
- **TTL (Time To Live) 차등 적용:**
    - `userInfo`: 1분 (자주 변할 수 있는 활동 한도 정보)
    - `pageMessages`, `tooltipMessages`: 5분 (상대적으로 정적인 메시지 목록)
    - *이유:* 모든 데이터에 동일한 TTL을 주지 않고, 데이터의 휘발성과 중요도에 따라 차등을 두어 메모리 효율을 높였습니다.

---

## Part 4. Infrastructure & DevOps (Docker)

### 1. Docker 멀티 스테이지 빌드 (Multi-stage Build)
이미지 크기를 최소화하고 배포 효율을 높이기 위해 `Dockerfile`에서 멀티 스테이지 빌드를 적용했습니다.

- **1단계 (Build):** JDK 17 환경에서 Gradle 빌드를 수행하여 실행 가능한 `jar` 파일을 생성합니다.
- **2단계 (Run):** 빌드 단계의 결과물인 `jar` 파일만 복사하고, 실행에 필요한 최소한의 JRE 17 이미지 위에서 구동합니다.
- **이점:** 최종 이미지 용량을 크게 줄여(약 400MB -> 150MB) 네트워크 대역폭을 절약하고, 빌드 도구와 소스 코드가 최종 이미지에 포함되지 않아 보안성을 향상시킵니다.

### 2. 자원 제한 및 최적화 (Resource Management)
1GB RAM의 제한된 서버 환경에서 시스템 안정성을 확보하기 위해 Docker Compose와 JVM 옵션을 세밀하게 조정했습니다.

- **`mem_limit` 설정:** 각 컨테이너(App, DB, Redis)가 사용할 수 있는 물리 메모리의 최대치를 하드웨어 한계의 50~80% 수준으로 제한했습니다. 이는 특정 서비스의 메모리 누수가 전체 OS 마비로 이어지는 것을 방지하는 **격리(Isolation)** 역할을 합니다.
- **JVM 힙 메모리 조절 (`JAVA_OPTS`):** `-Xms`와 `-Xmx`를 컨테이너 메모리 제한보다 낮게 설정하여, JVM 내부 메모리와 컨테이너 외부 메모리 사이의 완충 지대를 두었습니다. (예: `mem_limit: 512m` 일 때 `-Xmx384m`)

### 3. 데이터 영속성 및 서비스 의존성
- **볼륨 마운트 (Volume Mounting):** DB와 Redis 데이터를 컨테이너 외부의 호스트 디렉토리에 저장하여, 컨테이너가 재시작되거나 삭제되어도 데이터가 유실되지 않도록 설계했습니다.
- **`depends_on`을 통한 순서 제어:** API 서버가 DB와 Redis보다 먼저 실행되어 연결 오류가 발생하는 것을 방지하기 위해 서비스 간의 시작 순서를 명시했습니다.

---

## Part 5. Security & API Design

### 1. 보안 코드(Security Code) 기반 인증 전략
익명성 보장과 보안 사이의 균형을 맞추기 위해 JWT 대신 **UUID + Security Code** 조합의 자체 인증 방식을 채택했습니다.

- **설계 근거:**
    - **UX 최우선:** 가입/로그인 절차 없이 즉시 사용 가능한 "Zero-config" 경험을 유지해야 합니다.
    - **영구 세션:** 익스텐션 특성상 토큰 만료 및 재로그인이 번거로움으로 작용합니다.
- **검증 로직:** 메시지 작성/삭제/투표 등 서버의 상태를 변경하는 API 호출 시, 클라이언트는 저장된 `securityCode`를 함께 전송합니다. 서버는 DB의 값과 일치 여부를 확인하여 권한을 부여합니다.

### 2. URL 정규화 및 다각도 앵커링 (Anchoring)
웹페이지의 동적인 특성(리렌더링, 광고 삽입 등)에 대응하기 위해 견고한 앵커링 알고리즘을 설계했습니다.

- **URL Normalization:** `https://example.com/page/`와 `http://example.com/page`를 동일하게 인식하도록 소문자 처리 및 프로토콜/슬래시 정규화를 수행합니다.
- **다각도 매칭:** 단순 Selector뿐만 아니라 링크의 텍스트, 이미지 경로(`imgSrc`) 등을 복합적으로 저장하여 사이트 구조가 소폭 변경되어도 메시지를 유실하지 않도록 구현했습니다.

---

## Part 6. 면접 예상 질문 & 답변 (Q&A)

**Q1. 트래픽이 평소보다 10배 이상 폭증한다면 어떻게 대응하시겠습니까?**
> **A1.** 우선 Redis 캐시 히트율을 점검하여 DB 부하를 차단하겠습니다. 서버 자원이 부족할 경우 Docker Compose의 `replicas`를 늘려 API 서버를 수평 확장(Scale-out)하고, 앞단에 Nginx와 같은 로드 밸런서를 배치하여 트래픽을 분산시키겠습니다. 또한, 중요도가 낮은 기능(예: HUD 실시간 업데이트 주기 등)에 대해 서킷 브레이커를 적용하여 핵심 기능(메시지 읽기/쓰기)을 보호하겠습니다.

**Q2. Redis 캐시와 DB 데이터 사이의 정합성이 깨진다면 어떻게 해결하시겠습니까?**
> **A2.** 현재 `@CacheEvict`를 통해 쓰기 시점에 캐시를 삭제하는 전략을 사용하고 있어 정합성 오류 확률이 낮습니다. 하지만 만약 불일치가 발생한다면, Redis의 해당 키를 수동으로 삭제(Flush)하여 DB로부터 최신 데이터를 다시 읽어오도록 유도하겠습니다. 근본적으로는 TTL을 짧게 설정하여 정합성 오류가 지속되는 시간을 제한하고 있습니다.

**Q3. 비관적 락(Pessimistic Lock) 사용 시 데드락(Deadlock) 위험은 없나요?**
> **A3.** 현재 투표 기능은 단일 행(Row)에 대해서만 락을 걸고 트랜잭션이 매우 짧게 유지되므로 데드락 위험이 낮습니다. 하지만 트래픽이 극도로 몰릴 경우 대기 시간이 길어질 수 있으므로, 락 타임아웃(Lock Timeout)을 설정하거나 점수 업데이트와 같은 작업은 Redis의 원자적 연산(INCR)을 활용하는 방향으로 개선을 검토할 수 있습니다.

---
**문서 작성 완료.** 본 자료는 `docs/study/plan.md`에 근거하여 작성되었습니다.
