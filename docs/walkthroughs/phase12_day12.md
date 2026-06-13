# Phase 12 가이드: 시각적 하이라이트 및 일괄 조회 (성능 최적화)

본 가이드는 사용자가 마우스를 올리기 전에도 "어디에 메시지가 있는지" 미리 알 수 있도록 시각적 효과를 부여하고, 수많은 링크에 대한 개별 요청을 하나로 합쳐 성능을 개선합니다.

---

## 1. 백엔드: 페이지 전체 메시지 조회 API 추가

기존에는 링크 하나당 한 번씩 호출했지만, 이제 페이지 로드 시 한 번에 가져오기 위해 새로운 기능을 추가합니다.

### [Step 1-1] MessageRepository에 쿼리 추가
`com.ghostMessage.repository.MessageRepository.java`에 특정 페이지의 모든 메시지를 가져오는 메서드를 추가합니다.

```java
// 특정 페이지 URL에 달린 모든 메시지를 가져옴
List<Message> findByPageUrl(String pageUrl);
```

### [Step 1-2] MessageService에 일괄 조회 메서드 추가
```java
public List<MessageResponseDTO> getAllMessagesInPage(String pageUrl) {
    String normPageUrl = pageUrl.toLowerCase().replaceAll("/$", "");
    List<Message> messages = messageRepository.findByPageUrl(normPageUrl);
    
    // 기존 DTO 변환 로직 재사용
    return messages.stream().map(msg -> {
        String nickname = userRepository.findById(msg.getAuthorId())
                .map(User::getNickname).orElse("anonymous");
        
        return MessageResponseDTO.builder()
                .id(msg.getId())
                .authorId(msg.getAuthorId())
                .nickname(nickname)
                .content(msg.getContent())
                .type(msg.getType())
                .upVoteScore(msg.getUpVoteScore())
                .downVoteScore(msg.getDownVoteScore())
                .createdAt(msg.getCreatedAt())
                .build();
    }).collect(Collectors.toList());
}
```

---

## 2. 익스텐션: 일괄 조회 및 시각적 표시

### [Step 2-1] 페이지 로드 시 데이터 미리 가져오기
`extensions/content.js`의 가장 하단에 페이지 로드 이벤트를 추가합니다. 가져온 데이터는 `Map`에 저장하여 즉시 꺼내 쓸 수 있게 합니다.

```javascript
let messageMap = new Map(); // key: anchorKey, value: messageList

// 페이지 로드 시 실행
window.addEventListener('load', () => {
    const pageUrl = normalizeUrl(window.location.href);
    
    chrome.runtime.sendMessage({
        action: "fetchAllMessages", // background.js에 새로 추가해야 함
        pageUrl: pageUrl
    }, (response) => {
        if (response.success && response.data) {
            // 1. 데이터를 anchorKey 기준으로 그룹화하여 Map에 저장
            response.data.forEach(msg => {
                const key = normalizeUrl(msg.anchorKey);
                if (!messageMap.has(key)) messageMap.set(key, []);
                messageMap.get(key).push(msg);
            });
            
            // 2. 화면의 링크들 하이라이트 처리
            applyHighlights();
        }
    });
});
```

### [Step 2-2] 시각적 하이라이트(Highlight) 적용 함수
메시지가 있는 링크를 찾아 스타일을 변경합니다.

```javascript
function applyHighlights() {
    const links = document.querySelectorAll('a');
    links.forEach(link => {
        const key = normalizeUrl(link.href);
        if (messageMap.has(key)) {
            // 시각적 효과 부여 (예: 하단 점선 및 보라색 강조)
            link.style.borderBottom = "2px dashed #6200ee";
            link.style.backgroundColor = "rgba(98, 0, 238, 0.05)";
            link.title = "유령 메시지가 있는 링크입니다 👻";
        }
    });
}
```

---

## 💡 학습 포인트
- **Batch Fetching (일괄 조회)**: N개의 링크에 대해 N번의 네트워크 요청을 보내는 대신, 1번의 요청으로 모든 데이터를 가져오는 방식입니다. 웹 성능 최적화의 핵심입니다.
- **In-Memory Cache (Map)**: 서버에서 가져온 데이터를 자바스크립트 메모리(`Map`)에 보관해두면, 마우스를 올렸을 때 서버 대기 시간 없이 즉시 툴팁을 띄울 수 있어 사용자 경험이 매우 부드러워집니다.
- **Visual Cues (시각적 힌트)**: 사용자가 어디에 상호작용 가능한 요소가 있는지 미리 알 수 있게 하여 탐색의 피로도를 줄여줍니다.
