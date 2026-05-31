# 1. Build stage: 빌드 성능을 위해 멀티 스테이지 빌드 적용
/**
 * [면접 대비 포인트: DevOps/Infra]
 * Multi-stage Build를 사용하는 이유:
 * - 빌드에 필요한 JDK와 소스 코드는 최종 이미지에 포함될 필요가 없습니다.
 * - 1단계(build)에서 컴파일을 수행하고, 2단계(run)에서는 실행에 필요한 최소한의 JRE와 결과물(jar)만 복사합니다.
 * - 결과: 최종 이미지 크기를 수백 MB에서 수십 MB로 줄여 배포 속도를 높이고 보안 취약점을 최소화합니다.
 */
FROM eclipse-temurin:17-jdk-alpine AS build
WORKDIR /app
COPY . .
RUN ./gradlew clean bootjar

# 2. Run stage: 최종 이미지는 실행에 필요한 JRE만 포함하여 크기 최소화
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /app/build/libs/*.jar app.jar
ENTRYPOINT ["java", "-jar", "app.jar"]