package com.ghostMessage.dto;

import java.time.LocalDateTime;
import java.util.UUID;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class MessageResponseDTO {
	
	// 조회 시엔 메시지 id, 작성자 id, 작성자 이름, 본문, 타입, 추천수를 보면 됨 
	private Long id;
	private UUID authorId;
	private String nickname;
	private String content;
	private String type;
	private String anchorKey;
	private String selector;
	private String linkText;
	private String imgSrc;
	private int upVoteScore;
	private int downVoteScore;
	private LocalDateTime createdAt;
}
