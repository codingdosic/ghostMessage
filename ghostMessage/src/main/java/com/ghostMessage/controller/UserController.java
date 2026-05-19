package com.ghostMessage.controller;

import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import com.ghostMessage.service.UserService;
import com.ghostMessage.domain.User;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class UserController {
    private final UserService userService;

    @PostMapping("/register")
    public ResponseEntity<User> register(@RequestParam(name = "nickname", required = false) String nickname) {
        User user = userService.registerNewUser(nickname);
        return ResponseEntity.ok(user);
    }

    @GetMapping("/{uuid}")
    public ResponseEntity<User> getUser(@PathVariable(name = "uuid") java.util.UUID uuid) {
        return ResponseEntity.ok(userService.getUser(uuid));
    }
}