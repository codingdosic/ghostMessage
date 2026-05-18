package com.ghostMessage.repository;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import com.ghostMessage.domain.Message;

// JpaRepository<엔티티, 기본키 타입> -> 상속받으면 기본 CRUD 기능을 사용 가능함
public interface MessageRepository extends JpaRepository<Message, Long>{
	
	// 상속으로 인해 사용 가능해진 기능
	// save -> Create, Update
	// findById -> Read
	// findAll -> Read
	// delete -> Delete
	
	// 페이지의 특정 앵커에 달린 메시지 목록을 생성순으로 가져옴(쿼리 메소드)
	List<Message> findByPageUrlAndAnchorKeyOrderByCreatedAtDesc(String pageUrl, String anchorKey);

	List<Message> findByPageUrl(String pageUrl);
}
