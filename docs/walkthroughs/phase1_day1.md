# Phase 1, Day 1: Cloudflare Tunnel을 이용한 HTTPS 서버 구축

이 문서는 GhostMessage 프로젝트의 백엔드 서버를 Cloudflare Tunnel을 통해 외부로 노출하고, HTTPS를 적용하는 전체 과정을 아주 상세하게 다룹니다. 이 방식은 **포트 포워딩 없이** 안전하게 서버를 외부에 연결하는 최신 보안 표준을 따릅니다.

---

## 🛠️ 준비물
1. **커스텀 도메인**: (예: `ghostmessage.com`) 가비아, Namecheap 등에서 구매한 도메인.
2. **Cloudflare 계정**: [cloudflare.com](https://www.cloudflare.com/) 무료 계정.
3. **Docker 환경**: 현재 프로젝트가 실행되고 있는 서버 환경.

---

## 🏁 Step 1: 도메인을 Cloudflare에 연결하기

1. **사이트 추가**: Cloudflare 대시보드 로그인 후 `[Add a Site]` 클릭 -> 구매한 도메인 주소 입력.
2. **요금제 선택**: 하단의 `Free ($0)` 플랜 선택.
3. **DNS 레코드 확인**: 기존 레코드를 스캔합니다. 일단은 `[Continue]`를 눌러 진행합니다.
4. **네임서버 변경**: 
    - 도메인을 구매한 사이트(가비아 등)의 관리 페이지로 이동합니다.
    - 도메인의 네임서버를 Cloudflare가 제공하는 두 개의 네임서버(예: `alice.ns.cloudflare.com`)로 변경합니다.
    - **주의**: 네임서버 변경이 전파되는 데는 최소 몇 분에서 최대 24시간이 소요될 수 있습니다.

---

## 🏁 Step 2: Cloudflare Tunnel 생성 (대시보드 방식)

1. **Zero Trust 접속**: Cloudflare 대시보드 왼쪽 메뉴에서 `[Zero Trust]` 클릭.
2. **Networks -> Tunnels**: 왼쪽 사이드바에서 `Networks` 아래의 `Tunnels` 메뉴 선택.
3. **Create a Tunnel**: 
    - `[Create a tunnel]` 버튼 클릭.
    - 터널 유형으로 `Cloudflared` 선택.
    - 터널 이름 입력 (예: `ghost-message-prod`) 후 `[Save tunnel]` 클릭.
4. **터널 에이전트 설치 확인**: 
    - 'Choose your environment'에서 `Docker` 아이콘 선택.
    - 화면에 나타나는 `docker run` 명령어를 복사해 둡니다. (특히 `--token` 뒤의 긴 문자열이 필요합니다.)

---

## 🏁 Step 3: 프로젝트 Docker Compose 설정 업데이트

서버의 `docker-compose.yml` 파일에 Cloudflare Tunnel 에이전트(`cloudflared`)를 추가하여 자동 실행되도록 설정합니다.

### 1. `.env` 파일에 토큰 추가
프로젝트 루트의 `.env` 파일에 발급받은 토큰을 추가합니다.
```env
TUNNEL_TOKEN=여러분의_터널_토큰_문자열
```

### 2. `docker-compose.yml` 수정
기존 파일 하단에 `tunnel` 서비스를 추가합니다.

```yaml
services:
  # ... 기존 app, db, redis, pgadmin 서비스 ...

  tunnel:
    image: cloudflare/cloudflared:latest
    container_name: ghost-tunnel
    restart: always
    environment:
      - TUNNEL_TOKEN=${TUNNEL_TOKEN}
    command: tunnel --no-autoupdate run
    depends_on:
      - app # app 서비스가 실행된 후 터널 연결
```

---

## 🏁 Step 4: Public Hostname 설정 (도메인 연결)

다시 Cloudflare Zero Trust 대시보드의 터널 설정 화면으로 돌아갑니다.

1. **Public Hostname 추가**: `[Public Hostname]` 탭 클릭 -> `[Add a public hostname]` 클릭.
2. **도메인 설정**:
    - **Subdomain**: (선택 사항) `api` 등을 입력하거나 비워둡니다.
    - **Domain**: 연결한 도메인 선택.
    - **Path**: 비워둡니다.
3. **Service 설정 (핵심)**:
    - **Type**: `HTTP` 선택.
    - **URL**: `app:8080` 입력.
    - **중요**: Cloudflare Tunnel 컨테이너와 Spring Boot 컨테이너는 같은 Docker 네트워크 내에 있으므로 서비스 이름(`app`)으로 직접 통신합니다.

---

## 🏁 Step 5: 최종 확인 및 익스텐션 업데이트

1. **터널 상태 확인**: 대시보드에서 Tunnel 상태가 `HEALTHY`로 표시되는지 확인합니다.
2. **브라우저 접속**: `https://your-domain.com/api/messages/all?pageUrl=test` 주소로 접속하여 실제 데이터가 오는지 확인합니다.
3. **익스텐션 코드 수정**:
    - `extensions/background.js` 파일의 상단 URL을 수정합니다.
    ```javascript
    // const SERVER_URL = "http://168.107.12.18:8080"; // 기존
    const SERVER_URL = "https://your-domain.com"; // 새로운 HTTPS 주소
    ```
4. **익스텐션 재로드**: Chrome 관리 페이지(`chrome://extensions`)에서 GhostMessage 익스텐션을 새로고침합니다.

---

## ✅ 완료!
이제 여러분의 서버는 **포트 포워딩 없이** 안전한 터널을 통해 전 세계 어디서나 HTTPS로 접근 가능한 상태가 되었습니다. 
Cloudflare가 제공하는 방화벽(WAF)과 DDoS 방어 혜택을 즉시 누릴 수 있습니다.
