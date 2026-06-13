# Phase 1 - Day 1: 컨테이너 기반 아키텍처 설계와 IaC의 시작

이 단계에서는 `ghostMessage` 서비스를 도커(Docker) 컨테이너로 추상화하고, 여러 개의 컨테이너(App, DB, Redis)를 유기적으로 관리하기 위한 오케스트레이션 설정을 진행합니다.

---

## 1. 전략적 선택: 왜 도커(Docker)인가?

### 면접 대비: "왜 굳이 도커를 사용했나요?"
> **답변 핵심**: "환경의 일관성(Consistency)과 인프라의 코드화(IaC)를 위해서입니다. 개발 환경, 테스트 환경, 그리고 최종 오라클 클라우드 환경이 서로 달라 발생할 수 있는 '내 컴퓨터에선 되는데 서버에선 안 돼요'라는 문제를 근본적으로 해결하고 싶었습니다. 또한, 도커 컴포즈를 통해 애플리케이션뿐만 아니라 DB와 Redis까지 하나의 코드로 정의함으로써 인프라 자체를 버전 관리할 수 있는 환경을 구축했습니다."

### 핵심 이점
1.  **격리성 (Isolation)**: 호스트 OS에 다양한 라이브러리를 직접 설치하지 않고, 각 서비스에 최적화된 독립적인 환경을 제공합니다.
2.  **이식성 (Portability)**: 작성된 도커 이미지는 오라클 클라우드뿐만 아니라 AWS, Azure 등 어떤 환경에서도 동일하게 동작합니다.
3.  **빠른 확장성**: 필요에 따라 동일한 앱 컨테이너를 여러 개 띄워 부하를 분산하기 매우 용이합니다.

---

## 2. 기술적 메커니즘: 어떻게 동작하는가?

### 이미지(Image) vs 컨테이너(Container)
*   **이미지**: 앱 실행에 필요한 모든 파일(소스 코드, 런타임, 설정)이 담긴 읽기 전용 템플릿입니다. (클래스 역할)
*   **컨테이너**: 이미지를 실행한 상태입니다. 각 컨테이너는 독립적인 프로세스로 동작하며 자신만의 파일 시스템을 가집니다. (인스턴스 역할)

### 도커 컴포즈 (Docker Compose)
단일 컨테이너가 아닌, **다중 컨테이너 애플리케이션**을 정의하고 실행하기 위한 도구입니다. `docker-compose.yml` 파일에 서비스 간의 네트워크, 볼륨(데이터 유지), 의존 관계를 기술합니다.

---

## 3. 실무 워크스루 (Step-by-Step)

### Step 1: Spring Boot Dockerfile 작성
프로젝트 루트(`ghostMessage/`)에 `Dockerfile`을 생성합니다.

```dockerfile
# 1. Build stage: 빌드 성능을 위해 멀티 스테이지 빌드 적용
FROM eclipse-temurin:17-jdk-alpine AS build
WORKDIR /app
COPY . .
RUN ./gradlew clean bootJar

# 2. Run stage: 최종 이미지는 실행에 필요한 JRE만 포함하여 크기 최소화
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /app/build/libs/*.jar app.jar
ENTRYPOINT ["java", "-jar", "app.jar"]
```

### Step 2: 전역 docker-compose.yml 작성
전체 프로젝트 루트에 작성하여 App, PostgreSQL, Redis를 한 번에 띄웁니다.

```yaml
version: '3.8'

services:
  # 1. API Application
  app:
    build: ./ghostMessage
    container_name: ghost-app
    ports:
      - "8080:8080"
    environment:
      - SPRING_DATASOURCE_URL=jdbc:postgresql://db:5432/ghost_db
      - SPRING_REDIS_HOST=redis
    depends_on:
      - db
      - redis
    restart: always

  # 2. Database
  db:
    image: postgres:15-alpine
    container_name: ghost-db
    environment:
      - POSTGRES_DB=ghost_db
      - POSTGRES_USER=ghost_user
      - POSTGRES_PASSWORD=password
    volumes:
      - ./data/postgres:/var/lib/postgresql/data # 데이터 영속성 유지
    ports:
      - "5432:5432"

  # 3. Cache & Lock
  redis:
    image: redis:7-alpine
    container_name: ghost-redis
    ports:
      - "6379:6379"
```

---

## 4. 기술 면접 예상 질문

**Q: 도커 이미지 빌드 시 '멀티 스테이지 빌드'를 사용한 이유는 무엇인가요?**
**A**: "빌드 과정에서만 필요한 JDK와 소스 코드 등을 최종 이미지에서 제외하기 위해서입니다. 실행 시에는 가벼운 JRE 환경만 포함함으로써 이미지 크기를 획기적으로 줄일 수 있고, 이는 네트워크 전송 속도 향상과 보안 취약점 감소라는 결과로 이어집니다."

**Q: 컨테이너가 삭제되면 DB에 저장된 데이터도 사라지나요? 어떻게 해결했나요?**
**A**: "기본적으로 컨테이너 내부는 휘발성입니다. 이를 해결하기 위해 '도커 볼륨(Docker Volume)' 기능을 사용했습니다. 호스트 컴퓨터의 특정 디렉토리를 컨테이너 내부의 DB 저장 경로와 매핑하여, 컨테이너가 삭제되거나 재시작되어도 데이터는 안전하게 보존되도록 설계했습니다."

---
*다음 단계(Day 2)에서는 이 환경을 그대로 오라클 클라우드로 옮기기 위한 가상 서버 인프라를 구축합니다.*
