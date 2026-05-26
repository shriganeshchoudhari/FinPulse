package com.finpulse.identity;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.time.Instant;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public Mono<ResponseEntity<AuthResponse>> register(@RequestBody RegisterRequest request) {
        return userRepository.findByUsername(request.getUsername())
                .flatMap(existing -> Mono.just(ResponseEntity.status(HttpStatus.CONFLICT).<AuthResponse>build()))
                .switchIfEmpty(
                        userRepository.save(User.builder()
                                        .username(request.getUsername())
                                        .email(request.getEmail())
                                        .passwordHash(passwordEncoder.encode(request.getPassword()))
                                        .kycStatus("PENDING")
                                        .createdAt(Instant.now())
                                        .build())
                                .map(savedUser -> {
                                    String token = jwtUtil.generateToken(savedUser, "ROLE_USER");
                                    return ResponseEntity.ok(new AuthResponse(token, savedUser.getUsername(), "ROLE_USER"));
                                })
                );
    }

    @PostMapping("/login")
    public Mono<ResponseEntity<AuthResponse>> login(@RequestBody LoginRequest request) {
        return userRepository.findByUsername(request.getUsername())
                .filter(user -> passwordEncoder.matches(request.getPassword(), user.getPasswordHash()))
                .map(user -> {
                    String token = jwtUtil.generateToken(user, "ROLE_USER");
                    return ResponseEntity.ok(new AuthResponse(token, user.getUsername(), "ROLE_USER"));
                })
                .defaultIfEmpty(ResponseEntity.status(HttpStatus.UNAUTHORIZED).build());
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RegisterRequest {
        private String username;
        private String email;
        private String password;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LoginRequest {
        private String username;
        private String password;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AuthResponse {
        private String token;
        private String username;
        private String role;
    }
}
