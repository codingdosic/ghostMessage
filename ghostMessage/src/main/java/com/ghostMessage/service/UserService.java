package com.ghostMessage.service;

import org.springframework.stereotype.Service;
import com.ghostMessage.domain.User;
import com.ghostMessage.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import jakarta.transaction.Transactional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserService {
    private final UserRepository userRepository;

    @Transactional
    public User registerNewUser(String nickname) {
        User user = new User();
        user.setNickname(nickname != null ? nickname : "유령_" + UUID.randomUUID().toString().substring(0, 5));
        // uuid는 엔티티의 @PrePersist에서 자동 생성됨
        return userRepository.save(user);
    }

    public User getUser(UUID uuid) {
        return userRepository.findById(uuid)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));
    }
    }