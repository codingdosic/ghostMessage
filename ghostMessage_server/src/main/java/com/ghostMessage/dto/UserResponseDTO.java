package com.ghostMessage.dto;

import java.time.Instant;
import java.util.UUID;

import com.ghostMessage.domain.User;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserResponseDTO {

    private UUID uuid;
    private String nickname;
    private int dailyMessageCount;
    private int dailyVoteCount;
    private Instant createdAt;
    private String securityCode;

    public static UserResponseDTO from(User user) {
        return from(user, null);
    }

    public static UserResponseDTO from(User user, String plainSecurityCode) {
        return UserResponseDTO.builder()
                .uuid(user.getUuid())
                .nickname(user.getNickname())
                .dailyMessageCount(user.getDailyMessageCount())
                .dailyVoteCount(user.getDailyVoteCount())
                .createdAt(user.getCreatedAt())
                .securityCode(plainSecurityCode)
                .build();
    }
}
