package com.ghostMessage.domain;

import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;

@Entity
@Table(name = "votes", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"messageId", "userId"}) // 한 사용자가 한 메시지에 중복 투표 방지
})
@Getter @Setter
@NoArgsConstructor
public class Vote {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long messageId; // 투표 대상 메시지 ID

    @Column(nullable = false)
    private UUID userId; // 투표한 사용자 UUID

    @Column(nullable = false)
    private String voteType; // "UP" (추천) 또는 "DOWN" (비추천)

    @Builder
    public Vote(Long messageId, UUID userId, String voteType) {
        this.messageId = messageId;
        this.userId = userId;
        this.voteType = voteType;
    }
}