# Web Ghost Messages 운영 가이드라인

본 문서는 현재 운영 중인 도커 기반의 Web Ghost Messages 서비스 운영을 위한 기술 가이드입니다.

## 1. 운영 환경 개요
- **환경**: Docker Compose 기반 컨테이너 환경
- **구성 요소**:
  - `ghost-app`: Spring Boot API Server
  - `ghost-db`: PostgreSQL 15 (데이터 저장)
  - `ghost-redis`: Redis 7 (캐시 및 메시지 브로커)
  - `ghost-pgadmin`: 데이터베이스 관리 GUI
  - `ghost-tunnel`: Cloudflare Tunnel (외부 접속)

## 2. 일상 운영 및 모니터링
서버 상태 확인을 위해 다음 명령어를 활용하십시오.

### 시스템 상태 확인
```bash
# 전체 컨테이너 구동 상태 확인
docker compose ps

# 컨테이너별 자원 사용량 (CPU/메모리) 확인
docker stats --no-stream
```

### 로그 확인
```bash
# 애플리케이션 로그 실시간 확인
docker compose logs -f app

# 특정 컨테이너의 과거 로그 확인 (오류 탐색)
docker compose logs --tail=100 app
```

## 3. 코드 업데이트 및 반영 절차

### A. 확장 프로그램 (Extensions)
1. `manifest.json` 내 `version` 업데이트 (예: 1.0 -> 1.0.1)
2. 폴더 전체를 `.zip`으로 압축
3. 크롬 웹 스토어 대시보드에서 패키지 업로드 후 심사 요청

### B. 백엔드 서버 (Backend)
1. 코드 수정 후 `ghostMessage_server` 디렉토리에서 이미지 빌드:
   ```bash
   docker compose build app
   ```
2. 컨테이너 교체 (무중단 배포):
   ```bash
   docker compose up -d --no-deps app
   ```

## 4. 데이터베이스 및 캐시 관리

### DB 현황 확인
현재 `message`, `users`, `votes` 테이블이 운용 중입니다. 데이터 조회 확인:
```bash
docker compose exec db psql -U ghost_user -d ghost_db -c "SELECT count(*) FROM message;"
```

### 캐시 메모리 확인
```bash
docker compose exec redis redis-cli info memory
```

## 5. 트러블슈팅 가이드
- **서버 오류 발생 시**: `docker compose logs --tail=200 app` 명령어로 최근 200줄의 로그를 확인하여 `Exception` 발생 여부를 먼저 파악하십시오.
- **데이터베이스 연결 오류 시**: `docker compose ps`로 `db` 컨테이너가 `Up` 상태인지 확인하고, `docker compose restart db`로 재시작을 시도하십시오.
- **용량 부족 시**: `docker stats`로 메모리 사용량을 확인하고, 과도한 메모리 점유 시 컨테이너 재시작 또는 로그 파일 정리(호스트 머신 기준)가 필요합니다.

## 6. 호스트 서버 자원 모니터링
호스트 운영체제(Ubuntu) 차원의 자원 확인이 필요할 경우 다음 명령어를 사용하십시오.

### 메모리 사용량 확인
```bash
free -h
```
*   `Total`: 전체 메모리, `Used`: 사용 중인 메모리, `Available`: 사용 가능한 메모리를 보기 쉽게 출력합니다.

### 디스크 저장 공간 확인
```bash
df -h
```
*   전체 디스크 용량, 사용 중인 공간, 남은 공간을 확인합니다. `/` 경로의 `Use%`가 90% 이상일 경우 저장 공간 확보가 필요합니다.

