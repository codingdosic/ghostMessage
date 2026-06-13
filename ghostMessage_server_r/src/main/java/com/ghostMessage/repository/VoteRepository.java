package com.ghostMessage.repository;

import com.ghostMessage.domain.Vote;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface VoteRepository extends JpaRepository<Vote, Long> {
	
    //  메시지id, 사용자id로 투표 내역 찾기
    Optional<Vote> findByMessageIdAndUserId(Long messageId, UUID userId);
}