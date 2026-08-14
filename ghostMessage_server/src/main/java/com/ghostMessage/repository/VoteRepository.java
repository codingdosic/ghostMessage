package com.ghostMessage.repository;

import com.ghostMessage.domain.Vote;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface VoteRepository extends JpaRepository<Vote, Long> {
	
    Optional<Vote> findByMessageIdAndUserId(Long messageId, UUID userId);

    void deleteByMessageId(Long messageId);
}