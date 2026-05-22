package com.ghostMessage.dto;

import java.time.LocalDateTime;
import java.util.UUID;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MessageResponseDTO {
	
	// reponse dto : 서버 -> 클라이언트 데이터 전송에 사용, 서버가 보여줘야 할 정보만 담음
	
	private Long id; // 메시지 id
	private UUID authorId; // 사용자 id
	private String nickname; // 사용자 이름

	private String pageUrl; // 페이지 url
	private String anchorKey; // 요소 키
	private String selector; // css 셀렉터
	private String linkText; // 내부 텍스트
	private String imgSrc; // 이미지 리소스
	
	private String content; // 메시지 본문
	private String type; // 메시지 타입
	private int upVoteScore; // 추천 수
	private int downVoteScore; // 비추천 수
	private LocalDateTime createdAt; // 작성일자
}
