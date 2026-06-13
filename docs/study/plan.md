# Technical Interview Prep Document: Backend & Infra Plan

본 문서는 `ghostMessage` 프로젝트의 백엔드, DB, 인프라 기술 스택을 기술 면접 관점에서 심도 있게 정리하기 위한 구체적인 작성 계획입니다.

## 1. 문서 정보
- **파일명:** `docs/study/interview_prep_backend.md`
- **대상 범위:** Spring Boot, JPA/PostgreSQL, Redis, Docker/Infra
- **핵심 목표:** "무엇을(What), 어떻게(How), 왜(Why)"를 중심으로 기술적 원리와 구현 근거를 면접 답변 형태로 정리

## 2. 상세 목차 및 구성안

### Part 1. Framework & Architecture (Spring Boot)
- **주제:** 계층형 아키텍처(Layered Architecture)와 유연한 API 설계
- **핵심 내용:**
    - Spring Boot의 동작 원리 (IoC/DI, Bean Lifecycle)
    - 프로젝트에서 계층을 분리한 이유 (Controller-Service-Repository) 및 SoC(관심사 분리) 원칙
    - DTO 패턴을 사용한 엔티티 보호 및 API 스펙 관리
    - **API 명세서 정리:** 주요 엔드포인트별 기능, 파라미터, 응답 구조 정리
    - **코드 예시:** `MessageController`, `MessageResponseDTO`

### Part 2. Database & Persistence (JPA/PostgreSQL)
- **주제:** 데이터 정합성 보장과 효율적인 객체-관계 매핑
- **핵심 내용:**
    - JPA의 영속성 컨텍스트(Persistence Context)와 쓰기 지연(Write-Behind)의 이점
    - **동시성 제어 전략:** 
        - 비관적 락(Pessimistic Lock)을 통한 투표 점수 정합성 확보 (Lost Update 방지)
        - 낙관적 락(Optimistic Lock)을 통한 일일 제한 필드 보호
    - 정규화된 DB 설계와 성능 사이의 트레이드오프
    - **코드 예시:** `MessageRepository`의 `@Lock`, `User` 엔티티의 `@Version`

### Part 3. Caching & Performance (Redis)
- **주제:** 저사양 서버에서의 성능 최적화와 캐시 전략
- **핵심 내용:**
    - **Cache-Aside Pattern:** 조회 성능 극대화 및 DB 부하 절감 원리
    - 캐시 정합성 유지 전략 (`@Cacheable`, `@CacheEvict`) 및 무효화 시점 설계
    - **상세 설정 분석:** `RedisConfig`, `application.yml` 설정을 기반으로 한 동작 구조 및 이유 분석
    - Redis의 데이터 구조와 싱글 스레드 모델의 특징
    - **코드 예시:** `MessageService`의 캐싱 애노테이션 적용 사례, `RedisConfig`

### Part 4. Infrastructure & DevOps (Docker)
- **주제:** 컨테이너 환경을 통한 일관된 배포 및 자원 관리
- **핵심 내용:**
    - **Multi-stage Build:** 빌드/런타임 이미지 분리를 통한 이미지 경량화 원리
    - **구조적 분석:** `docker-compose.yml`, `Dockerfile` 설정을 기반으로 서비스 간 의존성 및 자원 할당 구조 분석
    - `docker-compose`를 이용한 서비스 오케스트레이션 및 의존성(`depends_on`) 관리
    - 저사양 서버(1GB RAM)에서의 리소스 제한(`mem_limit`, `JAVA_OPTS`) 설정 근거
    - **코드 예시:** `Dockerfile`, `docker-compose.yml`

### Part 5. Security & API Design
- **주제:** 익명 서비스의 보안 강화와 확장성
- **핵심 내용:**
    - 보안 코드(Security Code) 기반의 자체 인증 로직 설계 근거 (JWT와의 비교)
    - URL 정규화 및 다각도 앵커링 알고리즘의 기술적 도전과 해결책

## 3. 작업 일정 (Todo List)
- [x] Part 1: Spring Boot 아키텍처 및 **API 명세** 정리
- [x] Part 2: JPA 및 동시성 제어(Lock) 심화 정리
- [x] Part 3: Redis 캐싱 전략 및 **상세 설정/동작 구조** 정리
- [x] Part 4: Docker 인프라 및 **자원 최적화/구조** 정리
- [x] Part 5: 보안 및 앵커링 시스템 정리
- [x] **코드 어노테이션:** 관련 소스 파일에 면접 대비용 기술 주석 추가
- [x] 최종 검토 및 면접 예상 질문(Q&A) 추가
---
**피드백 요청 사항:**
- 위 구성 중 특정 기술의 비중을 더 높이거나 추가하고 싶은 상세 주제가 있으신가요?
- 면접 답변용으로 더 구체적인 시나리오(예: "트래픽이 10배로 늘어난다면?")가 필요하신가요?

- 스프링부트의 경우 프로젝트 내 api 명세도 함께 정리 
- redis, docker의 경우 설정 파일(과 주석)들을 바탕으로 어떤 구조로 적용되어 있는지, 단순히 좋아서 사용한 것이 아닌 어떻게 사용되는지 등을 알 수 있도록 자세히 
- 작성 시 관련 파일명이나 링크 달 수 있으면 달고, 해당 파일에 주석으로도 추가 설명 작성해줘.
