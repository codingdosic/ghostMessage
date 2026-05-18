package com.ghostMessage.domain;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity // db 테이블과 매핑되는 클래스(ORM, Object Relational Mapping)
@Table(name = "message")
@Getter @Setter // lombok 자동 생성 
@NoArgsConstructor
public class Message {
	
	@Id // 기본 키 지정
	@GeneratedValue(strategy = GenerationType.IDENTITY) // IDENTITY -> id 자동 증가
	private Long id;
	
	private UUID authorId; // 작성자 uuid
	
	@Column(nullable = false) // 컬럼 제약 조건
	private String pageUrl; // 메시지가 있는 페이지 주소
	
	@Column(nullable = false)
	private String anchorKey; // 타겟 링크 식별자
	
	private String type; // 메시지 타입
	
	@Column(length = 100) // 글자수 제한
	private String content; // 메시지 본문
	
	private int upVoteScore; // 추천 수
	private int downVoteScore; // 비추천 수
	
	private LocalDateTime createdAt; // 생성일자
	
	@PrePersist // 엔티티가 db에 저장되기 전에 실행되는 메서드 
    public void prePersist() {
        this.createdAt = LocalDateTime.now(); // 현재 시간 저장
        this.upVoteScore = 0; // 초기 점수는 0점
        this.downVoteScore = 0; 
    }
}
