# Phase 1 - Day 2: Oracle Cloud(OCI) 인프라 구축 및 가상 네트워크 설계

이 단계에서는 오라클 클라우드(OCI) 계정을 생성하고, 서비스를 담을 가상 서버와 이를 위한 **가상 네트워크(VCN)**를 수동으로 설계하고 구축합니다.

---

## 1. 전략적 선택: 왜 오라클 클라우드(OCI)인가?

### 면접 대비: "AWS가 아닌 오라클 클라우드를 선택한 특별한 이유가 있나요?"
> **답변 핵심**: "가장 큰 이유는 **비용 대비 압도적인 리소스 스펙**입니다. OCI는 **평생 무료(Always Free)**로 **ARM 기반 4 vCPU, 24GB RAM**이라는 고사양 인프라를 제공합니다. 이는 실제 상용 서비스 부하 테스트(k6)를 수행하고 Redis 분산 환경을 안정적으로 운영하기에 최적의 환경이라고 판단했습니다."

---

## 2. 실무 워크스루 (Step-by-Step)

### Step 1: VCN(가상 네트워크) 수동 생성 및 구성
자동 위저드 대신 수동 구성을 통해 클라우드 네트워크의 핵심 컴포넌트를 직접 연결합니다.

1.  **VCN 생성**: `Networking` -> `Virtual Cloud Networks` -> `Create VCN`.
    *   **Name**: `ghost-vcn`
    *   **IPv4 CIDR Block**: `10.0.0.0/16` 입력. (VCN 전체에서 사용할 IP 대역폭 정의)
2.  **인터넷 게이트웨이(IGW) 생성**: 생성된 VCN 클릭 -> 좌측 메뉴 `Internet Gateways` -> `Create Internet Gateway`.
    *   **Name**: `ghost-igw`
    *   *역할*: VCN 내부의 서버가 인터넷(외부)과 통신할 수 있는 유일한 출입구입니다.
3.  **라우팅 테이블(Route Table) 설정**: 좌측 메뉴 `Route Tables` -> `Default Route Table for ghost-vcn` 클릭.
    *   `Add Route Rules` 클릭.
    *   **Target Type**: `Internet Gateway`
    *   **Destination CIDR Block**: `0.0.0.0/0` (모든 외부 트래픽)
    *   **Target Internet Gateway**: 위에서 만든 `ghost-igw` 선택.
    *   *이유*: "어디로 갈지 모르는 모든 트래픽은 인터넷 게이트웨이로 보내라"는 지도를 그려주는 과정입니다.
4.  **서브넷(Subnet) 생성**: 좌측 메뉴 `Subnets` -> `Create Subnet`.
    *   **Name**: `ghost-public-subnet`
    *   **IPv4 CIDR Block**: `10.0.0.0/24` (VCN 대역폭 중 일부인 256개의 IP만 사용)
    *   **Subnet Access**: `Public Subnet` 선택.
    *   **Route Table**: 위에서 설정한 `Default Route Table` 선택.

### Step 2: 보안 규칙(Ingress Rules) 설정
가상 방화벽(`Security List`)을 통해 서비스 포트를 개방합니다.

1.  VCN 내 좌측 메뉴 `Security Lists` -> `Default Security List for ghost-vcn` 클릭.
2.  `Add Ingress Rules` 추가:
    *   **Source CIDR**: `0.0.0.0/0`
    *   **Destination Port Range**: `80, 443, 8080, 22`
3.  **면접 포인트**: "수동 설정을 통해 VCN -> IGW -> Route Table -> Subnet으로 이어지는 네트워크 패킷의 흐름을 명확히 이해하고 구축했습니다."

### Step 3: 인스턴스(ARM 서버) 생성
실제 24GB RAM을 가진 가상 서버를 생성합니다.

1.  `Compute` -> `Instances` -> `Create Instance`.
2.  **Image and Shape**: `Edit` -> `Ubuntu 22.04` 및 `VM.Standard.A1.Flex` (4 OCPU, 24GB RAM) 선택.
3.  **Networking**: 수동으로 만든 `ghost-vcn`과 `ghost-public-subnet`을 선택.
4.  **Add SSH Keys**: 본인의 공개키 등록 혹은 키 페어 다운로드.
5.  **Create**: 완료 후 부여된 **공인 IP**를 확인합니다.

---

## 3. 기술 면접 예상 질문

**Q: CIDR 블록 `/16`과 `/24`의 차이는 무엇인가요?**
**A**: "서브넷 마스크 비트 수를 의미합니다. `/16`은 약 65,536개의 IP를 가질 수 있는 큰 네트워크 대역이며, 이를 쪼개어 만든 `/24` 서브넷은 256개의 IP를 가집니다. 실무에서는 VCN을 크게 잡고 서비스 성격에 따라 작은 서브넷들로 나누어 관리합니다."

**Q: 인터넷 게이트웨이를 만들고 왜 라우팅 테이블을 수정해야 하나요?**
**A**: "게이트웨이가 문(Door)이라면, 라우팅 테이블은 지도(Map)입니다. 문을 만들어도 패킷이 그 문으로 가야 한다는 규칙이 없으면 통신이 불가능합니다. 따라서 모든 외부 트래픽(`0.0.0.0/0`)의 목적지를 인터넷 게이트웨이로 지정해 주는 라우팅 규칙이 반드시 필요합니다."
