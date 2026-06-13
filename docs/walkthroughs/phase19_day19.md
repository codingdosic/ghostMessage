# Phase 19 가이드: 고도화된 투표 시스템 (중복 방지 및 일일 제한)

본 가이드는 무분별한 추천/비추천 어뷰징을 차단하기 위해 **일일 투표 제한**을 도입하고, 한 사용자가 하나의 메시지에 **딱 한 표만** 행사할 수 있도록(이미 추천 시 비추천 클릭 시 기존 추천 취소 및 비추천 반영) 시스템을 고도화하는 상세 매뉴얼입니다.

---

## 1. 투표 데이터 모델링 (Entity & Repository)

메시지당 1인 1표를 검증하려면 "누가 어떤 메시지에 어떤 투표를 했는지" 기록하는 장부가 필요합니다.

### [Step 19-1] Vote 엔티티 생성
1. `src/main/java/com/ghostMessage/domain` 폴더에 `Vote.java` 파일을 생성합니다.
2. 아래 코드를 복사하여 붙여넣습니다. (중복 투표 방지를 위한 `UniqueConstraint`가 핵심입니다.)

```java
package com.ghostMessage.domain;

import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;

@Entity
@Table(name = "votes", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"messageId", "userId"}) // 한 사용자가 한 메시지에 중복 투표 방지
})
@Getter @Setter
@NoArgsConstructor
public class Vote {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long messageId; // 투표 대상 메시지 ID

    @Column(nullable = false)
    private UUID userId; // 투표한 사용자 UUID

    @Column(nullable = false)
    private String voteType; // "UP" (추천) 또는 "DOWN" (비추천)

    @Builder
    public Vote(Long messageId, UUID userId, String voteType) {
        this.messageId = messageId;
        this.userId = userId;
        this.voteType = voteType;
    }
}
```

### [Step 19-2] VoteRepository 생성
1. `src/main/java/com/ghostMessage/repository` 폴더에 `VoteRepository.java` 파일을 생성합니다.
2. 특정 사용자가 특정 메시지에 투표했는지 찾는 메서드를 추가합니다.

```java
package com.ghostMessage.repository;

import com.ghostMessage.domain.Vote;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface VoteRepository extends JpaRepository<Vote, Long> {
    // 특정 유저가 특정 메시지에 투표한 내역을 찾습니다.
    Optional<Vote> findByMessageIdAndUserId(Long messageId, UUID userId);
}
```

---

## 2. API 규격 확장 (Controller)

기존에는 메시지 ID만 보냈지만, 이제 "누가" 투표하는지 알려주는 사용자 ID가 필요합니다.

### [Step 19-3] 컨트롤러 메서드 수정 (userId 파라미터 추가)
1. `com.ghostMessage.controller` -> `MessageController.java`를 엽니다.
2. `vote` 메서드 부분을 찾아 아래와 같이 수정합니다. (추가된 `@RequestParam` 확인)

```java
    // 메시지 추천 처리 (수정됨)
    @PostMapping("/{id}/vote") 
    public ResponseEntity<MessageResponseDTO> vote(
            @PathVariable(name = "id") Long id, 
            @RequestParam(name = "type") String type,
            @RequestParam(name = "userId") UUID userId) { // [추가] 누가 투표했는지 정보
        
        MessageResponseDTO updated = messageService.vote(id, type, userId);
        return ResponseEntity.ok(updated);
    }
```

---

## 3. 핵심 비즈니스 로직 고도화 (Service)

가장 복잡하고 중요한 단계입니다. 기존 점수를 깎고 새 점수를 더하는 '전환' 로직을 구현합니다.

### [Step 19-4] MessageService.vote 로직 구현
1. `com.ghostMessage.service` -> `MessageService.java`를 엽니다.
2. `vote` 메서드를 아래 코드로 완전히 교체합니다.

```java
    @Transactional
    public MessageResponseDTO vote(Long id, String type, UUID userId) {
        // 1. 유저 정보 조회 및 일일 제한 확인
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));
        
        resetLimitsIfNewDay(user); // 날짜 바뀌었으면 카운트 리셋

        // 2. 일일 투표 제한 체크 (예: 하루 20회)
        if (user.getDailyVoteCount() >= 20) {
            throw new RuntimeException("오늘 행사할 수 있는 투표 한도를 초과했습니다.");
        }

        // 3. 메시지 존재 확인
        Message message = messageRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("메시지를 찾을 수 없습니다."));

        // 4. 기존 투표 내역 확인
        Optional<Vote> existingVote = voteRepository.findByMessageIdAndUserId(id, userId);

        if (existingVote.isEmpty()) {
            // [Case 1] 처음 투표하는 경우
            applyVoteScore(message, type, 1); // 점수 +1
            voteRepository.save(new Vote(id, userId, type)); // 투표 기록 저장
            user.setDailyVoteCount(user.getDailyVoteCount() + 1); // 일일 카운트 증가
        } else {
            Vote vote = existingVote.get();
            if (vote.getVoteType().equals(type)) {
                // [Case 2] 이미 같은 버튼을 누른 경우 (추천 중인데 또 추천) -> 무시하거나 취소(선택)
                throw new RuntimeException("이미 동일한 투표를 하셨습니다.");
            } else {
                // [Case 3] 반대 버튼을 누른 경우 (추천 -> 비추천 등 전환)
                applyVoteScore(message, vote.getVoteType(), -1); // 기존 점수 취소 (-1)
                applyVoteScore(message, type, 1);               // 새로운 점수 반영 (+1)
                vote.setVoteType(type); // 기록 업데이트
                // 전환 시에는 일일 카운트를 추가로 늘리지 않음 (선택 사항)
            }
        }

        return convertToResponseDTO(message);
    }

    // 투표 점수를 가감하는 내부 헬퍼 메서드
    private void applyVoteScore(Message message, String type, int delta) {
        if ("UP".equals(type)) {
            message.setUpVoteScore(message.getUpVoteScore() + delta);
        } else if ("DOWN".equals(type)) {
            message.setDownVoteScore(message.getDownVoteScore() + delta);
        }
    }
```

---

## 4. 프론트엔드 연동 (Chrome Extension)

백엔드가 `userId`를 요구하므로, 익스텐션에서도 이를 실어 보내야 합니다.

### [Step 19-5] castVote 함수 수정 (content.js)
1. `extensions/content.js`의 `castVote` 함수를 찾아 아래와 같이 수정합니다.

```javascript
function castVote(messageId, type) {
    // 저장된 본인의 ID를 가져와서 서버로 보냄
    chrome.storage.local.get(['userId'], (result) => {
        const userId = result.userId;
        if (!userId) {
            alert("사용자 정보를 찾을 수 없습니다. 페이지를 새로고침 해보세요.");
            return;
        }

        const url = `http://localhost:8080/api/messages/${messageId}/vote?type=${type}&userId=${userId}`;
        
        chrome.runtime.sendMessage({ action: "voteMessage", url: url }, (response) => {
            if (response.success) { 
                alert("투표가 성공적으로 반영되었습니다!"); 
                location.reload(); 
            } else {
                alert("투표 실패: " + response.error);
            }
        });
    });
}
```
*(참고: background.js에서 처리하도록 이미 구조가 잡혀있다면, URL 파라미터만 userId를 포함하도록 구성하면 됩니다.)*

---

## 💡 학습 포인트
- **데이터 무결성 (Integrity):** `UniqueConstraint`를 통해 DB 수준에서 원천적으로 중복 투표를 막는 방법을 배웁니다.
- **상태 전이 (State Transition):** 추천에서 비추천으로 넘어갈 때 단순히 점수를 더하는 게 아니라, 기존 상태를 취소(`-1`)하고 새 상태를 반영(`+1`)하는 로직의 정합성을 이해합니다.
- **일일 제한 알고리즘:** 유저 엔티티와 연계하여 시스템 부하 및 어뷰징을 방지하는 상용 수준의 제한 로직을 경험합니다.
- **트랜잭션(Transaction):** 점수 변경과 투표 기록 저장이 '모두 성공'하거나 '모두 실패'해야 함을 보장하는 `@Transactional`의 중요성을 배웁니다.
