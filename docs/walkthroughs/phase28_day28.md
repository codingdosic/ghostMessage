# Phase 28: API 인증 강화 (UUID + 보안 코드 검증)

본 가이드는 계정 복구 기능을 통해 확보된 **보안 코드(Security Code)**를 활용하여, 모든 '쓰기' 권한 API 요청 시 정당한 권한을 가진 사용자인지 서버에서 검증하는 보안 고도화 과정을 다룹니다.

---

## 1. 백엔드 보안 로직 강화 (Spring Boot)

### [Step 1-1] 보안 코드 검증 공통 메서드 추가
모든 서비스 로직에서 재사용할 수 있도록 유저와 보안 코드를 대조하는 메서드를 추가합니다.

- **파일 위치**: `src/main/java/com/ghostMessage/service/UserService.java`
- **주요 코드**:
```java
/**
 * 요청된 UUID와 보안 코드가 DB와 일치하는지 검증
 */
public void validateUser(UUID uuid, String securityCode) {
    User user = userRepository.findById(uuid)
            .orElseThrow(() -> new RuntimeException("User not found."));
    
    if (securityCode == null || !user.getSecurityCode().equals(securityCode)) {
        throw new RuntimeException("Unauthorized: Invalid security code.");
    }
}
```

### [Step 1-2] 기존 API에 검증 로직 적용
메시지 작성, 삭제, 투표 API에 보안 코드 파라미터를 추가하고 검증을 수행합니다.

- **파일 위치**: `src/main/java/com/ghostMessage/controller/MessageController.java`
- **변경 사항**: 각 메서드에 `@RequestParam String securityCode` 추가 및 서비스 호출 전 검증.

```java
// 예: 메시지 삭제 API
@DeleteMapping("/{id}")
public ResponseEntity<Void> delete(
        @PathVariable(name = "id") Long id,
        @RequestParam(name = "authorId") UUID authorId,
        @RequestParam(name = "securityCode") String securityCode) { // 추가
    
    userService.validateUser(authorId, securityCode); // 검증 로직 호출
    messageService.deleteMessage(id, authorId);
    return ResponseEntity.noContent().build();
}

// 메시지 작성 및 투표 API에도 동일하게 파라미터 추가 및 validateUser 호출 적용
```

---

## 2. 익스텐션 통신 모듈 수정 (JavaScript)

### [Step 2-1] Background Script의 API 요청 수정
서버로 보내는 모든 요청에 로컬에 저장된 보안 코드를 자동으로 포함시킵니다.

- **파일 위치**: `extensions/background.js`
- **주요 로직**:
```javascript
// 백엔드 통신 시 보안 코드를 불러와서 전송
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // 공통 유저 정보 가져오기 로직
    chrome.storage.local.get(['userId'], (result) => {
        const userId = result.userId;
        
        // 서버에서 보안 코드를 가져와서 요청에 포함 (또는 로컬 스토리지에 보안 코드도 저장하여 사용 가능)
        // 여기서는 서버에서 매번 가져오는 대신, 설치/복구 시점에 로컬에도 securityCode를 저장해두는 방식을 추천합니다.
        chrome.storage.local.get(['securityCode'], (store) => {
            const secCode = store.securityCode;

            if (request.action === "saveMessage") {
                const payload = { ...request.data, securityCode: secCode }; // 보안 코드 추가
                fetch(API_BASE_URL, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                })
                // ... 생략 ...
            }
            
            if (request.action === "deleteMessage") {
                fetch(`${API_BASE_URL}/${request.messageId}?authorId=${request.authorId}&securityCode=${secCode}`, {
                    method: "DELETE"
                })
                // ... 생략 ...
            }
        });
    });
    return true; 
});
```

---

## 3. 초기 동기화 로직 보완

### [Step 3-1] 설치 및 복구 시 보안 코드 로컬 저장
앞으로의 API 요청을 위해 UUID와 함께 보안 코드도 로컬 스토리지(`chrome.storage.local`)에 저장해야 합니다.

- **파일 위치**: `extensions/background.js` (등록 시) 및 `extensions/options.js` (복구 시)
- **변경 사항**:
```javascript
// background.js (최초 등록 시)
fetch(`${SERVER_URL}/api/users/register`, { method: "POST" })
    .then(res => res.json())
    .then(user => {
        chrome.storage.local.set({ 
            userId: user.uuid,
            securityCode: user.securityCode // 보안 코드도 함께 저장
        });
    });

// options.js (계정 복구 시)
chrome.storage.local.set({ 
    userId: user.uuid,
    securityCode: user.securityCode // 복구된 계정의 보안 코드 저장
}, () => {
    location.reload();
});
```

---

## 💡 구현 시 주의사항
1. **역호환성**: 기존 사용자들은 로컬 스토리지에 `securityCode`가 없을 수 있습니다. 서비스 중단을 막기 위해 처음에는 서버에서 보안 코드가 없는 요청을 허용하다가, 일정 기간 후 강제하는 'Grace Period'를 두는 것이 좋습니다.
2. **코드 일관성**: 모든 쓰기 요청(`POST`, `DELETE`, `PUT`)에는 반드시 보안 코드가 포함되어야 합니다. 읽기 요청(`GET`)은 지금처럼 UUID만으로도 충분합니다.
3. **사용자 경험**: 익스텐션 내부적으로 보안 코드를 관리하므로, 사용자는 보안이 강화되었음을 인지하지 못하면서도 안전하게 서비스를 이용할 수 있습니다.
