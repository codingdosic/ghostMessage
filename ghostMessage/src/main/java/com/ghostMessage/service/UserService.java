package com.ghostMessage.service;

import org.springframework.cache.annotation.Cacheable;
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

    // 사용자 생성
    @Transactional
    public User registerNewUser(String nickname) {
    	
    	// 사용자 객체
        User user = new User();
        
        // 이름 설정 GHOST_ + UUID 6번째 자리까지
        user.setNickname(nickname != null ? nickname : " GHOST_" + UUID.randomUUID().toString().substring(0, 7));
        
        // uuid는 엔티티의 @PrePersist에서 자동 생성됨
        return userRepository.save(user);
    }

    // 사용자 정보
    @Cacheable(value = "userInfo", key = "#uuid")
    public User getUser(UUID uuid) {
        return userRepository.findById(uuid)
                .orElseThrow(() -> new RuntimeException("User not found."));
    }
    
    }