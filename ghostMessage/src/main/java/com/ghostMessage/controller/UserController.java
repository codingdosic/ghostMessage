package com.ghostMessage.controller;

import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import com.ghostMessage.service.UserService;
import com.ghostMessage.domain.User;
import lombok.RequiredArgsConstructor;

@RestController // rest api용 컨트롤러 선언
@RequestMapping("/api/users") // 공통 주소 설정
@RequiredArgsConstructor 
@CrossOrigin(origins = "*") // cors 허용
public class UserController {
	
	// 비즈니스 로직을 처리할 객체
    private final UserService userService; 

    // ----------------------------- POST ----------------------------- 
    
    
    // 사용자 등록
    @PostMapping("/register")
    public ResponseEntity<User> register(
    		@RequestParam(name = "nickname", required = false) String nickname) {
        
    	User user = userService.registerNewUser(nickname);
        
        return ResponseEntity.ok(user);
    }
    
    // ----------------------------- GET ----------------------------- 

    // 사용자 확인
    @GetMapping("/{uuid}")
    public ResponseEntity<User> getUser(
    		@PathVariable(name = "uuid") java.util.UUID uuid) {
    	
        return ResponseEntity.ok(userService.getUser(uuid));
    }
}