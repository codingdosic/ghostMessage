# Phase 1 - Day 3(sub): x86_64 서버 최적화 및 자동화 배포(CI/CD)

이 문서는 **1GB RAM**이라는 제한된 자원을 가진 `E2.1.Micro` 인스턴스(x86_64) 환경에 특화된 가이드입니다. 메모리 부족(OOM) 현상을 방지하기 위한 **SWAP 설정**과 **리소스 제어**를 중심으로 CI/CD를 구축합니다.

---

## 1. 전략적 선택: 왜 x86_64와 SWAP 메모리인가?

### 면접 대비: "1GB RAM 서버에서 Spring, DB, Redis를 모두 돌리는 게 가능한가요?"
> **답변 핵심**: "가장 큰 도전 과제는 메모리 부족(OOM) 문제였습니다. 이를 해결하기 위해 두 가지 전략을 사용했습니다. 첫째, **SWAP 메모리(2GB)**를 설정하여 물리적 RAM의 한계를 가상 메모리로 보완했습니다. 둘째, **Docker 리소스 제한**을 통해 각 컨테이너가 점유할 수 있는 메모리 최대치를 명시적으로 제어했습니다. 아키텍처 측면에서는 **x86_64** 표준을 따르므로 빌드 호환성 문제를 최소화하고 안정적인 배포에 집중했습니다."

---

## 2. 실무 워크스루 (Step-by-Step)

### Step 1: [필수] 서버 메모리 최적화 (SWAP 설정)
물리 메모리가 1GB뿐이므로, 하드디스크의 일부를 메모리처럼 사용하는 SWAP 설정이 반드시 필요합니다.

1.  **스왑 파일 생성 (2GB)**: `sudo fallocate -l 2G /swapfile`
2.  **권한 설정**: `sudo chmod 600 /swapfile`
3.  **스왑 영역 등록**: `sudo mkswap /swapfile` -> `sudo swapon /swapfile`
4.  **영구 적용**: `/etc/fstab` 파일 끝에 다음 내용을 추가합니다.
    ` /swapfile swap swap defaults 0 0 `
5.  **확인**: `free -h` 명령어로 `Swap: 2.0Gi`가 생겼는지 확인합니다.

### Step 2: Docker 리소스 제한이 포함된 docker-compose.yml
1GB RAM 환경에서 컨테이너들이 서로의 자원을 침범하지 않도록 제한을 둡니다.

```yaml
version: '3.8'
services:
  app:
    # ... 이미지 및 환경설정 ...
    deploy:
      resources:
        limits:
          memory: 512M # Spring Boot 최대 512MB 권장
  db:
    # ... 이미지 및 환경설정 ...
    deploy:
      resources:
        limits:
          memory: 256M
  redis:
    # ... 이미지 및 환경설정 ...
    deploy:
      resources:
        limits:
          memory: 128M
```

### Step 3: GitHub Actions를 이용한 x86_64 자동 배포
아키텍처가 `x86_64`이므로 별도의 플랫폼 설정 없이 표준 빌드를 사용합니다.

1.  **.github/workflows/deploy.yml** 생성.
2.  `docker/build-push-action` 단계에서 `platforms: linux/amd64`를 명시하거나 기본값으로 빌드합니다.
3.  서버로 접속하여 `docker-compose up -d`를 실행하는 스크립트를 포함합니다.

---

## 3. 기술 면접 예상 질문

**Q: SWAP 메모리를 설정하면 입출력(I/O) 성능이 떨어지지 않나요?**
**A**: "그렇습니다. 디스크 I/O는 RAM에 비해 현저히 느립니다. 하지만 본 프로젝트의 목적은 **'성능 극대화'보다 '서비스 가용성(Availability) 유지'**에 있었습니다. 1GB RAM 환경에서 OOM(Out of Memory)으로 인해 전체 시스템이 중단되는 것을 방지하기 위한 최소한의 안전장치이며, 실제 성능 병목은 이후 Redis 캐싱 전략으로 보완했습니다."

**Q: Docker의 'resources.limits'를 설정한 이유는 무엇인가요?**
**A**: "특정 컨테이너(예: DB)가 예기치 않게 메모리를 과도하게 점유하여 다른 필수 컨테이너(예: API 서버)를 죽이는 '연쇄 장애'를 방지하기 위함입니다. 이를 통해 전체 1GB 시스템 내에서 각 자원의 사용량을 예측 가능하도록 통제했습니다."
