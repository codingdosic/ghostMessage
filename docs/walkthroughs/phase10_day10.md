# Phase 10 가이드: 데이터 신뢰성 확보 (URL 정규화)

본 가이드는 "DB에는 분명히 데이터가 있는데, 실제로 커서를 올려보면 나타나지 않는 현상"을 완벽하게 해결하기 위한 **URL 정규화(Normalization)** 과정을 다룹니다. 브라우저와 서버가 서로 주소를 다르게 해석하지 않도록 표준화하는 것이 핵심입니다.

---

## 1. 익스텐션(Frontend) URL 정규화 로직 적용

브라우저는 같은 페이지라도 끝에 `/`가 붙거나, 대문자가 섞이는 등 다양한 형태로 주소를 표현합니다. 이를 하나로 통일해야 합니다.

### [Step 1-1] content.js 상단에 정규화 함수 추가
`extensions/content.js` 파일의 가장 윗부분에 다음 함수를 추가합니다. 이 함수는 주소를 소문자로 바꾸고, 끝에 붙은 불필요한 슬래시(`/`)를 제거합니다.

```javascript
// [추가] URL을 표준화하는 함수
function normalizeUrl(url) {
    if (!url) return "";
    try {
        // 1. URL 객체로 변환하여 프로토콜, 도메인, 경로를 추출
        const urlObj = new URL(url, window.location.origin);
        
        // 2. 경로 끝에 붙은 '/' 제거 (단, 메인 페이지 '/' 자체는 유지)
        let path = urlObj.pathname;
        if (path.endsWith('/') && path.length > 1) {
            path = path.slice(0, -1);
        }
        
        // 3. 도메인 + 경로를 소문자로 통합하여 반환
        return (urlObj.origin + path).toLowerCase();
    } catch (e) {
        // URL 형식이 아닐 경우 단순 소문자 처리 및 슬래시 제거
        return url.toLowerCase().replace(/\/$/, "");
    }
}
```

### [Step 1-2] 이벤트 리스너의 주소 추출 방식 수정
기존의 `link.getAttribute('href')`는 `./about` 같은 상대 경로를 가져와서 매칭에 실패할 확률이 높습니다. 브라우저가 해석한 절대 경로인 `link.href`를 사용하도록 수정합니다.

```javascript
// extensions/content.js의 mouseover 리스너 내부 수정
document.addEventListener('mouseover', (e) => {
    const link = e.target.closest('a');
    if (!link) return;
    if (link.dataset.ghostProcessed) return;

    // [수정] 정규화된 주소 사용
    const pageUrl = normalizeUrl(window.location.href); 
    const anchorKey = normalizeUrl(link.href); // getAttribute 대신 .href 사용

    console.log("[GhostMessage] Hover detected (Normalized):", { pageUrl, anchorKey });
    
    // ... 이하 동일
```

---

## 2. 백엔드(Backend) 데이터 정규화 적용

사용자가 메시지를 저장할 때도 정규화된 주소로 저장해야 나중에 정확히 찾아낼 수 있습니다.

### [Step 2-1] MessageService의 저장 로직 수정
`com.ghostMessage.service.MessageService.java` 파일의 `createMessage` 메서드를 수정합니다.

```java
@Transactional
public Message createMessage(MessageRequestDTO dto) {
    // ... 사용자 확인 로직 생략 ...

    Message message = new Message();
    
    // [추가] 저장 전 URL 정규화 (소문자화 및 끝 슬래시 제거)
    String normalizedPageUrl = dto.getPageUrl().toLowerCase().replaceAll("/$", "");
    String normalizedAnchorKey = dto.getAnchorKey().toLowerCase().replaceAll("/$", "");
    
    message.setAuthorId(user.getUuid());
    message.setPageUrl(normalizedPageUrl);
    message.setAnchorKey(normalizedAnchorKey);
    // ... 나머지 설정 ...
}
```

### [Step 2-2] MessageService의 조회 로직 수정
조회할 때도 파라미터를 정규화하여 쿼리합니다.

```java
public List<MessageResponseDTO> getMessages(String pageUrl, String anchorKey) {
    // [추가] 조회 파라미터 정규화
    String normPageUrl = pageUrl.toLowerCase().replaceAll("/$", "");
    String normAnchorKey = anchorKey.toLowerCase().replaceAll("/$", "");

    List<Message> messages = messageRepository.findByPageUrlAndAnchorKeyOrderByCreatedAtDesc(normPageUrl, normAnchorKey);
    // ... 변환 로직 ...
}
```

---

## 💡 학습 포인트
- **link.href vs link.getAttribute('href')**: `.href` 프로퍼티는 브라우저가 현재 페이지 주소를 기준으로 계산한 **절대 경로(`https://...`)**를 반환합니다. 반면 `getAttribute`는 HTML 코드에 적힌 문자열 그대로(`../`, `/` 등)를 가져옵니다. DB 매핑에는 절대 경로가 필수입니다.
- **정규화(Normalization)**: 데이터의 "표준 형태"를 만드는 과정입니다. 대소문자 구분이나 슬래시 유무 같은 사소한 차이로 인해 데이터가 유실되는 것을 방지합니다.
- **Regex (`replaceAll("/$", "")`)**: 문자열의 끝(`$`)에 있는 슬래시(`/`)를 찾아 빈 문자열로 바꾸는 정규표현식입니다.
