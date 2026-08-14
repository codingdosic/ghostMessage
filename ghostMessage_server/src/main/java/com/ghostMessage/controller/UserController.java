package com.ghostMessage.controller;

import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import com.ghostMessage.service.UserService;
import com.ghostMessage.dto.UserResponseDTO;
import lombok.RequiredArgsConstructor;
import java.util.UUID;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@CrossOrigin(origins = "chrome-extension://pmenhmekdcfeglgkicljlogcacogdalk")
public class UserController {

    private final UserService userService;

    @PostMapping("/register")
    public ResponseEntity<UserResponseDTO> register(
            @RequestParam(name = "nickname", required = false) String nickname) {
        return ResponseEntity.ok(userService.registerNewUser(nickname));
    }

    @GetMapping("/{uuid}")
    public ResponseEntity<UserResponseDTO> getUser(@PathVariable(name = "uuid") UUID uuid) {
        return ResponseEntity.ok(userService.getUser(uuid));
    }

    @GetMapping("/recover")
    public ResponseEntity<UserResponseDTO> recover(
            @RequestParam(name = "uuid") UUID uuid,
            @RequestParam(name = "securityCode") String securityCode) {
        return ResponseEntity.ok(userService.recoverUser(uuid, securityCode));
    }
}
