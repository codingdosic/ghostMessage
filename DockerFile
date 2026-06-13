# 1. Build stage: 빌드 성능을 위해 멀티 스테이지 빌드 적용
FROM eclipse-temurin:17-jdk-alpine AS build
WORKDIR /app
COPY . .
RUN ./gradlew clean bootjar

# 2. Run stage: 최종 이미지는 실행에 필요한 JRE만 포함하여 크기 최소화
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /app/build/libs/*.jar app.jar
ENTRYPOINT ["java", "-jar", "app.jar"]