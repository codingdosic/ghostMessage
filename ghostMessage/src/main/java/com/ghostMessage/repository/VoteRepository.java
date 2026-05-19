package com.ghostMessage.repository;

import com.ghostMessage.domain.Vote;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface VoteRepository extends JpaRepository<Vote, Long> {
    // 특정 유저가 특정 메시지에 투표한 내역을 찾습니다.
    Optional<Vote> findByMessageIdAndUserId(Long messageId, UUID userId);
}