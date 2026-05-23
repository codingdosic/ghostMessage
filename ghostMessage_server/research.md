# Research: Web Ghost Messages (웹 유령 메시지)

## 1. 프로젝트 개요 및 아키텍처
- **목적**: 웹페이지 요소(주로 링크)에 비동기적으로 메시지를 남기고 확인하는 브라우저 확장 프로그램 및 백엔드 서버.
- **아키텍처**:
    - **Backend**: Spring Boot 4.0.6, JPA, PostgreSQL.
    - **Extension**: Chrome Extension Manifest v3, Vanilla JS.

## 2. 상세 분석 결과

### 백엔드 (ghostMessage)
- **DI(의존성 주입)**: 
    - `MessageController`와 `MessageService`는 `@RequiredArgsConstructor`와 `final` 필드를 사용하여 생성자 주입 방식으로 올바르게 구현되어 있음. (이전 `docs/research.md`에서 언급된 DI 오류는 현재 코드상에서는 발견되지 않음)
- **DTO 상태**:
    - `MessageRequestDTO`: 정상 구현됨.
    - `MessageResponseDTO`: **빈 클래스 상태**. 컨트롤러에서 엔티티(`Message`)를 직접 반환하고 있어 캡슐화가 깨진 상태임.
- **비즈니스 로직**:
    - `MessageService.createMessage`에서 사용자 존재 여부 확인 및 일일 작성 제한 로직이 **미구현(Skeleton 상태)**.
- **엔티티**:
    - `Message`: `prePersist`를 통해 `createdAt` 및 초기 점수 설정 로직 포함.
    - `User`: `uuid`, `nickname`, `dailyMessageCount` 등 MVP 요구사항에 맞는 필드 구성.
- **의존성 설정 (`build.gradle`)**:
    - Spring Boot 버전이 `4.0.6`으로 설정되어 있음 (비표준 버전일 가능성 있음).
    - `spring-boot-starter-webmvc` 등 의존성 이름이 표준(`spring-boot-starter-web`)과 다소 상이함.

### 프론트엔드 (extensions)
- **작동 방식**:
    - `content.js`가 모든 `<a>` 태그에 `mouseenter` 리스너를 추가.
    - 호버 시 `background.js`를 통해 백엔드 API(`GET /api/messages`) 호출.
    - 첫 번째 메시지를 `ghost-tooltip` 클래스의 `div`로 노출.
- **문제점 및 개선 필요 사항**:
    - `anchorKey`를 단순히 `href` 속성값으로 사용 중. 절대 경로와 상대 경로 차이 등으로 인해 식별이 부정확할 수 있음.
    - 툴팁 UI가 매우 단순함 (Vanilla CSS).

## 3. 발견된 엣지 케이스 및 위험 요소
- **데이터 일관성**: 사이트마다 `href` 형식이 다르므로(상대경로, 절대경로, hash 등) `anchorKey` 생성 로직의 표준화가 필요함.
- **동적 컨텐츠**: SPA(Single Page Application)나 무한 스크롤 사이트에서 새롭게 추가되는 `<a>` 태그에 대한 리스너 등록 로직이 부재함 (MutationObserver 고려 필요).
- **성능**: 페이지 내 모든 링크에 리스너를 다는 방식은 링크가 많은 페이지에서 성능 저하를 일으킬 수 있음.

## 4. 결론 및 향후 방향
- 현재 백엔드의 기본 뼈대는 잡혀 있으나, **DTO 완성** 및 **비즈니스 로직(제한 및 검증)** 구현이 최우선 과제임.
- 확장 프로그램은 동적 요소 대응 및 `anchorKey` 생성 로직 고도화가 필요함.
