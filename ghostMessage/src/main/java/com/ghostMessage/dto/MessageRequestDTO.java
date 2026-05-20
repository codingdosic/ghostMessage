package com.ghostMessage.dto;

import java.util.UUID;

import lombok.Data;

@Data // Getter, Setter, toString 등 자동 생성
public class MessageRequestDTO { // Data Transfer Object, 계층간 데이터 전달
    
	// request dto : 클라이언트 -> 서버 데이터 전송에 사용, 사용자가 입력해야 할 정보만 담음
	
	private UUID authorId; // 사용자 id
	
    private String pageUrl; // 페이지 url
    private String anchorKey; // 요소 키
    private String selector; // css 셀렉터
    private String linkText; // 내부 텍스트
    private String imgSrc; // 이미지 리소스
    
    private String type; // 메시지 타입
    private String content; // 메시지 본문
}
