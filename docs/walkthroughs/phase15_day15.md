# Phase 15 가이드: 익스텐션 초기 등록 및 사용자 할당 (Manual)

본 가이드는 하드코딩된 아이디를 제거하고, 익스텐션 설치 시 서버로부터 고유한 UUID를 할당받아 개별 사용자를 식별하는 기능을 수동으로 구축하는 상세 매뉴얼입니다.

---

## 1. 백엔드: 사용자 관리 기능 구축 (Eclipse)

### [Step 15-1] UserService 클래스 생성
사용자를 DB에 저장하고 관리하는 비즈니스 로직을 만듭니다.
1. `Project Explorer`에서 `com.ghostMessage.service` 패키지 우클릭 > `New > Class`.
2. Name에 **`UserService`** 입력 후 `Finish`.
3. 아래 코드를 입력합니다.
   ```java
   package com.ghostMessage.service;

   import org.springframework.stereotype.Service;
   import com.ghostMessage.domain.User;
   import com.ghostMessage.repository.UserRepository;
   import lombok.RequiredArgsConstructor;
   import jakarta.transaction.Transactional;
   import java.util.UUID;

   @Service
   @RequiredArgsConstructor
   public class UserService {
       private final UserRepository userRepository;

       @Transactional
       public User registerNewUser(String nickname) {
           User user = new User();
           user.setNickname(nickname != null ? nickname : "유령_" + UUID.randomUUID().toString().substring(0, 5));
           // uuid는 엔티티의 @PrePersist에서 자동 생성됨
           return userRepository.save(user);
       }
   }
   ```

### [Step 15-2] UserController 클래스 생성
익스텐션에서 호출할 수 있는 API 엔드포인트를 만듭니다.
1. `com.ghostMessage.controller` 패키지 우클릭 > `New > Class`.
2. Name에 **`UserController`** 입력 후 `Finish`.
3. 아래 코드를 입력합니다.
   ```java
   package com.ghostMessage.controller;

   import org.springframework.web.bind.annotation.*;
   import org.springframework.http.ResponseEntity;
   import com.ghostMessage.service.UserService;
   import com.ghostMessage.domain.User;
   import lombok.RequiredArgsConstructor;

   @RestController
   @RequestMapping("/api/users")
   @RequiredArgsConstructor
   @CrossOrigin(origins = "*")
   public class UserController {
       private final UserService userService;

       @PostMapping("/register")
       public ResponseEntity<User> register(@RequestParam(required = false) String nickname) {
           User user = userService.registerNewUser(nickname);
           return ResponseEntity.ok(user);
       }
   }
   ```

---

## 2. 프론트엔드: 자동 등록 및 ID 연동 (VS Code)

### [Step 15-3] Background 서비스 워커 수정
익스텐션이 설치될 때 서버에 등록 요청을 보내고 ID를 저장합니다.
1. `extensions/background.js` 파일을 엽니다.
2. `chrome.runtime.onInstalled` 리스너 내부에 아래 로직을 추가합니다.
   ```javascript
   chrome.runtime.onInstalled.addListener(() => {
       // ... 기존 메뉴 생성 코드 유지 ...

       // 고유 ID 확인 및 등록
       chrome.storage.local.get(['userId'], (result) => {
           if (!result.userId) {
               fetch("http://localhost:8080/api/users/register", { method: "POST" })
                   .then(res => res.json())
                   .then(user => {
                       chrome.storage.local.set({ userId: user.uuid }, () => {
                           console.log("새 사용자 등록 완료:", user.uuid);
                       });
                   })
                   .catch(err => console.error("사용자 등록 실패:", err));
           }
       });
   });
   ```

### [Step 15-4] Content Script 하드코딩 제거
이제 파일에 적힌 고정 ID가 아닌, 저장소에 있는 ID를 사용합니다.
1. `extensions/content.js` 파일을 엽니다.
2. 상단의 `const MY_ID = "...";` 줄을 삭제하고 전역 변수로 선언합니다.
   `let MY_ID = null;`
3. `init()` 함수 시작 부분에 ID를 불러오는 로직을 넣습니다.
   ```javascript
   function init() {
       chrome.storage.local.get(['userId'], (result) => {
           MY_ID = result.userId;
           if (!MY_ID) {
               console.warn("사용자 ID가 없습니다. 익스텐션을 재설치하거나 서버를 확인하세요.");
               return;
           }
           
           // 기존 로직 실행
           const pageUrl = normalizeUrl(window.location.href);
           // ... (이후 fetchAllMessages 호출 등 기존 코드)
       });
   }
   ```

---

## 💡 학습 포인트
- **Persistence (지속성)**: `chrome.storage.local`은 브라우저를 껐다 켜도 데이터가 유지됩니다.
- **Onboarding (온보딩)**: 사용자에게 아무것도 묻지 않고 배경에서 자동으로 회원가입(UUID 할당)을 처리하여 UX를 개선합니다.
- **Loose Coupling (느슨한 결합)**: 프론트엔드가 특정 ID에 의존하지 않고, 런타임에 할당받은 값을 사용하게 하여 유연성을 높입니다.
