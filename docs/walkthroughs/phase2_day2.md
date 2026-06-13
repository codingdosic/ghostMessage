# Phase 2 - Day 2: 서비스 운영 고도화 및 테스트 자동화 (Walkthrough)

이 문서는 `research.md`에서 도출된 우선순위 과제들을 바탕으로, Ghost Message 프로젝트를 실제 운영 가능한 수준의 S급 프로젝트로 격상시키기 위한 상세 가이드입니다.

## 📅 목표
1. **신뢰성 확보**: JUnit 5 + Mockito를 활용한 핵심 로직 검증.
2. **배포 자동화**: GitHub Actions를 이용한 CI/CD 파이프라인 구축.
3. **데이터 정합성**: Flyway를 이용한 DB 마이그레이션 관리.

---

## 🛠 Step 1: JUnit 5 + Mockito 기반 테스트 환경 구축
최신 Spring Boot 3.4 환경에서는 `spring-boot-starter-test`에 JUnit 5와 Mockito가 기본 포함되어 있습니다.

### 1.1 의존성 확인 (build.gradle)
```gradle
dependencies {
    testImplementation 'org.springframework.boot:spring-boot-starter-test'
    testRuntimeOnly 'org.junit.platform:junit-platform-launcher'
}
```

### 1.2 핵심 테스트 시나리오 작성
* **MessageServiceTest**: 
    * `createMessage`: 하루 10회 제한 초과 시 `RuntimeException` 발생 여부.
    * `vote`: 동일인 중복 투표 차단 및 점수 합산 로직 검증.
* **UserServiceTest**:
    * `validateUser`: 잘못된 `securityCode` 입력 시 인증 실패 검증.

### 1.3 Best Practice 2025
* **@WebMvcTest** 보다는 비즈니스 로직에 집중하는 **@ExtendWith(MockitoExtension.class)** 를 사용한 단위 테스트 위주로 구성하여 테스트 속도를 최적화합니다.
* 테스트 데이터는 `EasyRandom` 등을 고려할 수 있으나, 명확한 검증을 위해 직접 생성하는 방식을 우선합니다.

---

## 🚀 Step 2: GitHub Actions CI/CD 파이프라인 (2025 Standard)
현재의 수동 Docker 빌드 및 배포를 자동화합니다.

### 2.1 Workflow 설정 (`.github/workflows/deploy.yml`)
```yaml
name: GhostMessage CI/CD

on:
  push:
    branches: [ main ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up JDK 17
        uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'temurin'
          cache: gradle

      - name: Build with Gradle
        run: ./gradlew build -x test  # 우선 테스트 제외 후 점진적 포함

      - name: Docker Build & Push
        run: |
          docker build -t ${{ secrets.DOCKER_IMAGE_NAME }} .
          echo "${{ secrets.DOCKER_PASSWORD }}" | docker login -u "${{ secrets.DOCKER_USERNAME }}" --password-stdin
          docker push ${{ secrets.DOCKER_IMAGE_NAME }}

      - name: Deploy to Oracle Cloud
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.SERVER_IP }}
          username: ubuntu
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd ~/app/ghostMessage_server
            docker-compose pull
            docker-compose up -d
```

### 2.2 보안 설정
* GitHub Repository -> Settings -> Secrets and variables -> Actions에 다음 항목 등록:
    * `DOCKER_USERNAME`, `DOCKER_PASSWORD`, `DOCKER_IMAGE_NAME`
    * `SERVER_IP`, `SSH_PRIVATE_KEY`

---

## 🗃 Step 3: Flyway DB 마이그레이션 (v10.22.0)
`schema.sql` 방식에서 버전 관리 방식으로 전환합니다.

### 3.1 의존성 추가
```gradle
dependencies {
    implementation 'org.flywaydb:flyway-core'
    implementation 'org.flywaydb:flyway-database-postgresql' // Flyway 10+ 필수
}
```

### 3.2 디렉토리 구조 설정
* `src/main/resources/db/migration/` 폴더 생성.
* **V1__init_schema.sql**: 현재의 테이블 구조 생성 쿼리.
* **V2__add_index_to_message.sql**: 성능 개선을 위한 인덱스 추가 등.

### 3.3 application.yml 설정
```yaml
spring:
  flyway:
    enabled: true
    baseline-on-migrate: true # 기존 데이터가 있는 경우 필수
    locations: classpath:db/migration
```

---

## 📈 Step 4: 다음 단계로의 연결 (Prometheus & Grafana)
Phase 2의 마지막에는 모니터링 환경을 구축합니다.
* **Spring Boot Actuator** 활성화.
* **Micrometer Prometheus Registry** 추가.
* Docker Compose에 Prometheus 및 Grafana 컨테이너 추가.

---

## 📝 가이드라인
1. **Atomic Commits**: 각 단계(Step)가 완료될 때마다 커밋하여 이력을 남깁니다.
2. **Validation**: CI/CD 구축 후 실제 Push를 통해 배포 성공 여부를 반드시 확인합니다.
3. **Rollback**: Flyway 도입 시 기존 데이터 백업(pg_dump)을 반드시 선행합니다.
