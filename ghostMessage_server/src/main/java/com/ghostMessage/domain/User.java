package com.ghostMessage.domain;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity // DB 테이블과 매핑됨
@Table(name = "users") // 테이블 이름을 user 로 함

@Getter @Setter // lombok getter/setter 자동 생성
@NoArgsConstructor // lombok 기본 생성자 자동 생성

public class User {
	
	@Id // 기본키 지정
	private UUID uuid; // 식별자
	
	private String nickname; // 닉네임
	
	private LocalDateTime createdAt; // 생성일시
	
	private int dailyMessageCount; // 일일 메시지 제한
	private int dailyVoteCount; // 일일 추천 제한
	
	private LocalDateTime lastMessageResetAt; // 메시지 제한 초기화 시점
	private LocalDateTime lastVoteResetAt; // 추천 제한 초기화 시점
	
	@Version // 낙관적 락을 위한 버전 관리
	private Long version;
	
	// 객체 생성 시 시간을 자동으로 추가
	@PrePersist // DB에 저장되기 전 동작을 정의
	public void prePersist() {
		
		this.createdAt = LocalDateTime.now(); // 현재 시간 추가
		
		if(this.uuid == null) {
			this.uuid = UUID.randomUUID(); // 식별자 없을 경우 추가
		}
	}
}
