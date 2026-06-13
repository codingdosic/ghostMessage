# 웹 유령 메시지 프로젝트 기획 정리

## 프로젝트 한 줄 정의

> 웹페이지의 특정 요소 위에 다른 사용자들이 남긴 짧은 메시지를 “유령 흔적”처럼 표시하는 브라우저 확장 기반 소셜 레이어

영감:
- 엘든링 메시지 시스템
- 비동기 멀티플레이 감성
- 웹 annotation
- ambient social layer

---

# 핵심 컨셉

이 프로젝트는 단순 댓글 시스템이 아니라:

> “웹 전체를 비동기 멀티플레이 공간처럼 만드는 것”

에 가깝다.

사용자는 웹을 탐험하다가:

- 특정 링크나 요소에서
- 누군가 남긴 짧은 흔적을 발견하고
- 도움, 경고, 농담, 밈 등을 경험한다.

핵심 감성:

- 익명성
- 짧은 메시지
- 우연한 발견
- 누군가 먼저 지나갔다는 느낌
- 웹 위의 유령 흔적

---


# 주요 UX

## 기본 상태

페이지는 거의 건드리지 않는다.

메시지가 있는 요소 근처에:

- 희미한 glyph
- glow
- subtle indicator

정도만 표시.

---

## Hover 시

Tooltip 형태로 메시지 표시.

예:

```txt
"misleading ahead"
+12
```

또는:

```txt
[Warning]
This tutorial is outdated.
```

핵심:

- 짧게
- unobtrusive
- hover 중심
- 탐험 느낌 유지

---

## 클릭 시

확장 패널:

- 메시지 목록
- 추천
- 신고
- 메시지 작성

---

# MVP 범위

처음부터 범용 annotation 시스템을 만들지 않는다.

## MVP 목표

> “링크 위 hover 시 메시지가 뜨는 경험” 검증

---

# MVP 기능 목록

## 1. 링크(anchor tag)만 지원

대상:

```html
<a href="...">
```

이유:

- 구현 단순
- 안정적
- selector 유지 쉬움
- 모든 사이트에서 동작 가능

---

## 2. Hover Tooltip

링크 hover 시:

```txt
"liar ahead"
```

같은 메시지 표시.

---

## 3. 메시지 작성

우클릭 또는 단축키:

```txt
Leave a trace...
```

---

## 4. 추천 시스템

- upvote
- downvote

높은 점수 메시지 우선 노출.

---

## 5. 익명성

초기에는:

- anonymous default
- 최소 identity

방향 추천.

---

# 기술 구조

## 전체 아키텍처

```txt
브라우저
 ├─ Content Script
 ├─ Tooltip UI
 ├─ Background Worker
 └─ API Client
          ↓
      Backend API
          ↓
       Database
```

---


## Background Service Worker

역할:

- API 요청
- 캐싱
- 인증
- rate limit 대응

---

# Anchor 설계

이 프로젝트의 핵심 난제.

---

## MVP 방식

URL + selector 기반.

예:

```json
{
  "page": "https://example.com/post",
  "selector": "a[href='/guide']"
}
```

---

## Anchor 생성 예시

```json
{
  "url": "https://site.com/post/1",
  "href": "/docs/api",
  "text": "API Docs",
  "selector": "a[href='/docs/api']"
}
```

---

## 예상 문제

사이트 리렌더링 시:

- selector 변경
- class hash 변경
- hydration
- 광고 삽입

등으로 anchor가 흔들릴 수 있음.

하지만 MVP에서는 충분.

---


---

# 백엔드 방향

## 추천 구조

Spring Boot 기반 계층형 구조.

```txt
Controller
  ↓
Service
  ↓
Repository Interface
  ↓
DB
```

---

## 목표

> 비즈니스 로직이 DB를 모르도록 설계

즉:

- Oracle
- PostgreSQL
- MySQL
- MongoDB

등 교체 시 최소 수정.

---

---

# 추천 개발 순서

## 1단계

백엔드:

- 메시지 저장
- 메시지 조회

---

## 2단계

익스텐션:

- 링크 탐색
- hover tooltip

---

## 3단계

추천/신고 시스템.

---

## 4단계

anchor 안정화.

---

# DB 구조 예시

## messages

```txt
id
page_url
anchor_key
content
score
created_at
author_id(optional)
```

---

## votes

```txt
id
message_id
user_id
vote
```

---

# 메시지 시스템 방향


## Semi-constrained 구조

추천:

- 자유 입력 허용
- 대신 강한 제약 적용

---

# 추천 제약

## 길이 제한

추천:

- 80~140자

이유:

- hover UX 유지
- 장문 정치글 감소
- 읽기 부담 감소
- 밈화 쉬움

---

## 링크 금지

초기에는 링크 첨부 금지 추천.

광고 및 악성 유도 감소.

---

## 답글 금지

thread 구조 금지.

이유:

- 논쟁 감소
- 댓글화 방지
- Reddit화 방지

---

## 이미지 금지

초기에는 텍스트-only 추천.

---

# 메시지 타입 시스템

자유 입력 + 메시지 타입 구조 추천.

예:

```txt
[Warning]
This site rewrites article titles.
```

```txt
[Tip]
The actual answer is lower.
```

---

# 추천 타입 예시

```txt
Tip
Warning
Funny
Spoiler
Helpful
Scam Alert
Misinformation?
```

---



## Rate Limit

예:

```txt
하루 10개
```

---


# UI 방향성

매우 중요.

---

# 댓글처럼 보이면 안 됨

피해야 할 요소:

- 프로필 사진
- 긴 닉네임
- 타임라인
- thread
- SNS 느낌

---

# 유지해야 할 감성

추천 방향:

- anonymous
- spectral
- ambient
- contextual
- short
- ephemeral

---

# 차별화 포인트

이 프로젝트는 productivity annotation tool이 아니라:

> “웹 위에 비동기 유령 플레이어의 흔적을 남기는 레이어”

라는 감성이 핵심.


---

## 3. 실시간 존재감

예:

```txt
지금 여기 보는 사람 12명
```



# 현재 결론

추천 MVP 방향:

```txt
- Chrome Extension
- 링크 요소만 지원
- hover tooltip
- 짧은 메시지
- 익명 기반
- 추천 시스템
- Spring Boot backend
- PostgreSQL
- 계층형 구조
```

핵심 목표:

> “웹에서 누군가 먼저 지나간 흔적을 발견하는 경험”

