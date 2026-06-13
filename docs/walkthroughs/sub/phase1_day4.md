# Phase 1 - Day 4: k6 부하 테스트와 Redis를 이용한 시스템 최적화 전략

이 단계에서는 구축된 서비스가 실제 대규모 트래픽을 견딜 수 있는지 **k6**로 검증하고, 발견된 병목 현상을 **Redis**를 통해 해결함으로써 서비스의 안정성과 성능을 한 단계 끌어올립니다.

---

## 1. 전략적 선택: 왜 k6와 Redis인가?

### 면접 대비: "부하 테스트를 꼭 해야 했나요? 그리고 왜 Redis를 사용했나요?"
> **답변 핵심**: "단순히 '잘 돌아가는 서비스'가 아니라 **'신뢰할 수 있는 서비스'**임을 증명하기 위해 부하 테스트를 수행했습니다. **k6**는 JavaScript 기반으로 시나리오 작성이 간편하고, 오라클 클라우드의 고사양 인프라 성능을 최대로 끌어내기에 적합했습니다. 또한, 테스트 과정에서 DB 부하와 동시성 문제를 확인하였고, 이를 해결하기 위해 인메모리 데이터 구조 저장소인 **Redis**를 도입했습니다. Redis의 빠른 속도를 활용해 **Rate Limiting(요청 제한)**과 **캐싱**을 구현함으로써 응답 속도를 혁신적으로 개선했습니다."

### 핵심 이점
1.  **k6 (Load Testing)**: 실제 운영 환경과 유사한 부하를 주어 서버의 한계치(Breakpoint)를 파악할 수 있습니다.
2.  **Redis (Optimization)**: 
    *   **속도**: 디스크 기반 DB(PostgreSQL)보다 훨씬 빠른 응답 속도를 보장합니다.
    *   **안정성**: 단기간에 몰리는 트래픽을 분산 및 제한하여 메인 DB의 고사를 방지합니다.

---

## 2. 기술적 메커니즘: 성능 지표와 최적화 원리

### 주요 성능 지표 (SLI)
*   **Throughput (처리량)**: 단위 시간당 처리하는 요청 수 (초당 요청 수, RPS).
*   **Latency (지연 시간)**: 요청부터 응답까지 걸리는 시간 (평균, p95, p99 지표 중요).
*   **Error Rate (에러율)**: 전체 요청 중 실패한 요청의 비율.

### Redis 최적화 기법
1.  **Rate Limiting**: 특정 사용자가 너무 많은 요청을 보내 서버를 마비시키는 것을 방지합니다. (Redis의 `INCR`와 `EXPIRE` 기능 활용)
2.  **Global Caching**: 자주 조회되는 유령 메시지를 Redis에 미리 담아두어 DB 조회를 생략합니다.

---

## 3. 실무 워크스루 (Step-by-Step)

### Step 1: k6 테스트 시나리오 작성 (`test.js`)
로컬이나 별도 머신에서 실행하여 서버에 부하를 줍니다.

```javascript
import http from 'k6/http';
import { sleep, check } from 'k6';

export const options = {
  vus: 100, // 동시 접속자 수
  duration: '30s', // 테스트 지속 시간
};

export default function () {
  const res = http.get('http://<OCI_IP>:8080/api/messages/all?pageUrl=test.com');
  check(res, { 'status is 200': (r) => r.status === 200 });
  sleep(1);
}
```

### Step 2: Redis 기반 Rate Limiter 적용 (Spring Boot)
`MessageService` 등에 적용하여 일일 작성 제한 외에 초당 요청 제한을 추가합니다.

```java
// pseudo-code: Redis를 이용한 초당 요청 제한
String key = "rate_limit:" + userId;
long count = redisTemplate.opsForValue().increment(key);
if (count == 1) {
    redisTemplate.expire(key, 1, TimeUnit.SECONDS); // 1초 뒤 초기화
}
if (count > 5) { // 초당 5회 제한
    throw new RuntimeException("Too many requests.");
}
```

---

## 4. 기술 면접 예상 질문

**Q: 부하 테스트 결과에서 Latency의 '평균(Average)'보다 'p95/p99' 지표를 더 중요하게 보는 이유는 무엇인가요?**
**A**: "평균은 소수의 매우 느린 응답(Outliers)을 제대로 반영하지 못해 대다수 사용자의 실제 경험을 왜곡할 수 있기 때문입니다. p95는 하위 5%의 느린 응답까지 고려하므로, 최악의 상황에서도 서비스가 수용 가능한 성능을 내는지 판단하는 더 정확한 척도가 됩니다."

**Q: Redis는 메모리 기반인데, 서버가 꺼지면 데이터가 다 날아가지 않나요?**
**A**: "네, 기본적으로는 휘발성입니다. 하지만 Redis는 **RDB(Snapshot)**나 **AOF(Append Only File)** 기능을 통해 데이터를 디스크에 주기적으로 백업할 수 있습니다. 본 프로젝트에서는 영구 저장이 필요한 메타데이터는 PostgreSQL에, 빠른 처리가 필요한 세션이나 캐시는 Redis에 배치하는 **데이터 분계 전략**을 사용했습니다."

---
*축하합니다! 이로써 Phase 1의 모든 인프라 구축 및 성능 최적화 과정을 완료했습니다.*
