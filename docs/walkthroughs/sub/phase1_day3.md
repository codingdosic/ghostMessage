# Phase 1 - Day 3: GitHub Actions를 이용한 자동화된 CI/CD 파이프라인 구축

이 단계에서는 개발자가 코드를 `push`하면 자동으로 빌드, 테스트, 배포까지 이루어지는 **지속적 통합(CI) 및 지속적 배포(CD)** 환경을 구축합니다. 수동 배포의 위험성을 제거하고 개발 생산성을 극대화합니다.

---

## 1. 전략적 선택: 왜 GitHub Actions인가?

### 면접 대비: "Jenkins 등 다른 도구 대신 GitHub Actions를 선택한 이유는?"
> **답변 핵심**: "소스 코드 저장소인 GitHub와의 **네이티브한 통합성**과 **별도의 인프라 유지보수가 필요 없다**는 점 때문입니다. Jenkins는 별도의 서버를 운영하고 관리해야 하지만, GitHub Actions는 완전 관리형 서비스로 설정이 간편하며 워크플로우를 코드로 관리(Workflow as Code)하기 매우 용이합니다. 또한, Docker Hub와의 연동이 매우 강력하여 컨테이너 기반 배포 파이프라인을 구축하기에 최적입니다."

### 핵심 이점
1.  **자동화 (Automation)**: 사람이 직접 서버에 접속해 명령어를 치는 과정에서 발생하는 휴먼 에러를 방지합니다.
2.  **신속한 피드백**: 코드 변경 사항이 실제 서버에 반영되는 시간을 단축시켜 서비스 개선 속도를 높입니다.
3.  **투명성**: 배포 이력이 GitHub 상에 남으므로, 문제가 발생했을 때 어떤 변경 사항 때문인지 즉시 추적 가능합니다.

---

## 2. 기술적 메커니즘: 파이프라인의 구조

### 워크플로우(Workflow)의 구성 요소
*   **Triggers**: 어떤 이벤트(예: `push` to `main`)가 발생했을 때 파이프라인을 실행할지 정의합니다.
*   **Runner**: 워크플로우가 실행되는 가상 서버입니다. (GitHub에서 제공)
*   **Secrets**: API 키, 서버 비밀번호 등 민감한 정보를 안전하게 저장하고 워크플로우에서 호출할 수 있게 합니다.

### 배포 프로세스 (Docker 중심)
1.  **Build & Push**: GitHub Runner에서 도커 이미지를 빌드하고 **Docker Hub**라는 중앙 저장소에 푸시합니다.
2.  **Deploy**: 오라클 서버에 SSH로 원격 접속하여, Docker Hub로부터 최신 이미지를 `pull` 받고 컨테이너를 재시작합니다.

---

## 3. 실무 워크스루 (Step-by-Step)

### Step 1: GitHub Secrets 설정
GitHub 레포지토리의 `Settings` -> `Secrets and variables` -> `Actions`에서 다음 항목을 등록합니다.
*   `DOCKERHUB_USERNAME / TOKEN`: 도커 이미지 푸시용.
*   `OCI_HOST`: 오라클 서버 공인 IP.
*   `OCI_USERNAME`: 서버 접속 계정 (예: ubuntu).
*   `OCI_KEY`: 서버 접속용 SSH 개인키 (Private Key).

### Step 2: 배포 워크플로우 파일 작성
`.github/workflows/deploy.yml` 경로에 파일을 생성합니다.

```yaml
name: GhostMessage CI/CD

on:
  push:
    branches: [ "main" ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      # 1. 소스 코드 체크아웃
      - uses: actions/checkout@v3

      # 2. 도커 허브 로그인
      - name: Login to Docker Hub
        uses: docker/login-action@v2
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}

      # 3. 이미지 빌드 및 푸시
      - name: Build and push
        uses: docker/build-push-action@v4
        with:
          context: ./ghostMessage
          push: true
          tags: ${{ secrets.DOCKERHUB_USERNAME }}/ghost-app:latest

      # 4. 오라클 서버 배포 (SSH 접속)
      - name: Deploy to OCI
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.OCI_HOST }}
          username: ${{ secrets.OCI_USERNAME }}
          key: ${{ secrets.OCI_KEY }}
          script: |
            sudo docker pull ${{ secrets.DOCKERHUB_USERNAME }}/ghost-app:latest
            sudo docker-compose up -d
            sudo docker image prune -f # 미사용 이미지 정리
```

---

## 4. 기술 면접 예상 질문

**Q: CI/CD 파이프라인에서 보안(Secrets) 관리는 어떻게 했나요?**
**A**: "중요한 정보인 서버 IP나 SSH 키 등은 절대 코드에 직접 노출하지 않았습니다. GitHub Actions에서 제공하는 `Secrets` 기능을 활용해 환경 변수로 관리했으며, 이는 워크플로우 로그에서도 마스킹 처리되어 안전하게 보호됩니다."

**Q: 수동 배포와 자동화 배포의 가장 큰 차이점은 무엇이라고 생각하시나요?**
**A**: "핵심은 **'재현성(Reproducibility)'**과 **'안정성'**입니다. 수동 배포는 작업자의 상태나 환경에 따라 실수가 발생할 확률이 높지만, 자동화된 파이프라인은 항상 미리 정의된 동일한 단계로 배포를 수행하므로 결과의 신뢰도가 매우 높습니다."

---
*다음 단계(Day 4)에서는 배포된 서버의 성능을 객관적으로 측정하고, Redis를 이용해 최적화하는 과정을 다룹니다.*
