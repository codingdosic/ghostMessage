최종 목표

현재 ghostMessage

Java
Spring Boot
JPA
PostgreSQL
Redis
Docker
Oracle Cloud
Cloudflare Tunnel
Chrome Extension
동시성 제어
성능 개선

여기서

운영
테스트
유지보수
배포 자동화

를 보강하면 됨.

S급 (반드시 추천)
1. JUnit + Mockito 테스트 추가
이유

현재 가장 부족한 부분

채용담당자 입장

이 기능이 제대로 동작하는 건 어떻게 검증했지?

에 대한 답이 없음.

구현 추천
작성 제한 테스트
하루 5회 작성 가능

6회째 예외 발생
Redis 캐시 테스트
첫 요청

DB 조회

캐시 저장

↓

두 번째 요청

캐시 조회
투표 중복 테스트
이미 투표한 사용자

재투표 불가
포트폴리오 추가 가능

JUnit5와 Mockito를 활용하여 핵심 비즈니스 로직에 대한 단위 테스트를 작성하고 작성 제한, 캐시 동작, 투표 검증 로직을 자동화된 방식으로 검증했습니다.

2. GitHub Actions CI/CD
이유

운영 경험 강조 가능

현재

코드 수정

↓

Docker Build

↓

수동 배포

개선

GitHub Push

↓

Test

↓

Build

↓

Deploy
포트폴리오 문구

GitHub Actions 기반 CI/CD 파이프라인을 구축하여 테스트, 빌드, 배포 과정을 자동화했습니다.

3. Flyway 도입
이유

생각보다 엄청 강력함

실무 느낌 상승

schema.sql

수준

↓

V1
V2
V3
Migration

수준

면접 포인트

운영 중인 DB 변경사항을 버전 관리하기 위해 Flyway를 적용했습니다.

A급 (추천)
4. Prometheus + Grafana
이유

운영 경험 증명

현재

Redis 적용 후 빨라짐

추가

응답시간 모니터링

CPU 사용량

JVM Heap

Redis Hit Rate
효과

운영 직무

시스템관리

전산팀

지원 시 엄청 좋음

단점

구축 시간 조금 있음

5. Rate Limiting
이유

실제 서비스 운영 관점

예

메시지 생성 API

분당 30회 제한
기술

Bucket4j

포트폴리오

API 남용 방지를 위해 Rate Limiting을 적용했습니다.

B급 (시간 남으면)
6. 장애 대응 문서 작성

README

예

Redis 직렬화 오류
원인

LocalDateTime 직렬화 실패

해결

JavaTimeModule 등록

재발방지

테스트 추가

이건 구현보다 작성 비용이 적음.

7. 운영 매뉴얼 작성
배포 절차

장애 대응

Redis 장애 발생 시

유지보수 직무에 좋음

하지 말 것
Kafka

불필요

지원 회사들

LG CNS
태웅로직스
SY동아
패커드코리아
이지홀딩스

거의 안 물어봄

MSA

불필요

현재 규모에서

면접관이

왜 MSA 썼나요?

먼저 물을 확률 높음.

Kubernetes

불필요

Oracle Free Tier 수준에서

오버엔지니어링으로 보일 가능성 높음.

최종 우선순위
1단계 (무조건)

✅ JUnit + Mockito

✅ GitHub Actions

✅ Flyway

2단계

✅ Grafana

✅ Prometheus

3단계

✅ Rate Limiting

✅ 장애 대응 문서

이 작업 완료 후 이력서에 추가될 문장

현재

Redis Cache-Aside 적용으로 평균 응답시간 1.18초 → 437ms 개선

수준인데,

추가 후에는

Redis Cache-Aside 패턴 적용을 통해 응답시간을 개선하고, JUnit·Mockito 기반 테스트 코드 작성, GitHub Actions 기반 CI/CD 구축, Flyway를 활용한 DB 마이그레이션 관리, Prometheus·Grafana 모니터링 환경 구축을 통해 운영 중인 서비스를 지속적으로 개선하였습니다.

까지 올라갈 수 있음.

이 정도면 ghostMessage 하나만으로도 "Java/Spring 프로젝트 경험"이 아니라 "실제 운영 서비스 개발 및 유지보수 경험"으로 포지셔닝할 수 있고, 지금까지 지원한 1번(SI/DX/IT개발)과 2번(전산·시스템운영) 유형 공고 대부분에 가장 강한 대표 프로젝트가 될 거야.