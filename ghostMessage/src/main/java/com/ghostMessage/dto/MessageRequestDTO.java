package com.ghostMessage.dto;

import java.util.UUID;

import lombok.Data;

@Data // Getter, Setter, toString 등 자동 생성
public class MessageRequestDTO { // Data Transfer Object, 계층간 데이터 전달
    
	// 작성 요청 시엔 작성자의 uuid, url, key, type, content만 있으면 됨
	private UUID authorId; 
    private String pageUrl;
    private String anchorKey;
    private String selector;
    private String linkText;
    private String imgSrc;
    private String type;
    private String content;
}
