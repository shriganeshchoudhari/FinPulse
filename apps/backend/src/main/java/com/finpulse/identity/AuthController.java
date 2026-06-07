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

import java.time.Duration;
import java.time.Instant;
import org.springframework.http.ResponseCookie;
import org.springframework.http.HttpHeaders;
import org.springframework.data.redis.core.ReactiveStringRedisTemplate;
import io.jsonwebtoken.Claims;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final ReactiveStringRedisTemplate redisTemplate;

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public Mono<ResponseEntity<AuthResponse>> register(@RequestBody RegisterRequest request) {
        return Mono.fromCallable(() -> userRepository.findByUsername(request.getUsername()))
                .subscribeOn(reactor.core.scheduler.Schedulers.boundedElastic())
                .flatMap(existing -> existing.isPresent() 
                         ? Mono.just(ResponseEntity.status(HttpStatus.CONFLICT).<AuthResponse>build())
                         : Mono.fromCallable(() -> userRepository.save(User.builder()
                                         .username(request.getUsername())
                                         .email(request.getEmail())
                                         .passwordHash(passwordEncoder.encode(request.getPassword()))
                                         .kycStatus("PENDING")
                                         .role("ROLE_USER")
                                         .createdAt(Instant.now())
                                         .build()))
                                 .subscribeOn(reactor.core.scheduler.Schedulers.boundedElastic())
                                 .map(savedUser -> {
                                     String accessToken = jwtUtil.generateAccessToken(savedUser, savedUser.getRole());
                                     String refreshToken = jwtUtil.generateRefreshToken(savedUser, savedUser.getRole());
                                     
                                     ResponseCookie cookie = ResponseCookie.from("refreshToken", refreshToken)
                                             .httpOnly(true)
                                             .secure(true)
                                             .sameSite("Strict")
                                             .path("/")
                                             .maxAge(Duration.ofDays(7))
                                             .build();

                                     return ResponseEntity.ok()
                                             .header(HttpHeaders.SET_COOKIE, cookie.toString())
                                             .body(new AuthResponse(accessToken, savedUser.getUsername(), savedUser.getRole()));
                                 })
                );
    }

    @PostMapping("/login")
    public Mono<ResponseEntity<AuthResponse>> login(@RequestBody LoginRequest request) {
        return Mono.fromCallable(() -> userRepository.findByUsername(request.getUsername()))
                .subscribeOn(reactor.core.scheduler.Schedulers.boundedElastic())
                .flatMap(optUser -> optUser.map(Mono::just).orElseGet(Mono::empty))
                .filter(user -> passwordEncoder.matches(request.getPassword(), user.getPasswordHash()))
                .map(user -> {
                    String accessToken = jwtUtil.generateAccessToken(user, user.getRole());
                    String refreshToken = jwtUtil.generateRefreshToken(user, user.getRole());
                    
                    ResponseCookie cookie = ResponseCookie.from("refreshToken", refreshToken)
                             .httpOnly(true)
                             .secure(true)
                             .sameSite("Strict")
                             .path("/")
                             .maxAge(Duration.ofDays(7))
                             .build();

                    return ResponseEntity.ok()
                            .header(HttpHeaders.SET_COOKIE, cookie.toString())
                            .body(new AuthResponse(accessToken, user.getUsername(), user.getRole()));
                })
                .defaultIfEmpty(ResponseEntity.status(HttpStatus.UNAUTHORIZED).build());
    }

    @PostMapping("/refresh")
    public Mono<ResponseEntity<AuthResponse>> refresh(@CookieValue(name = "refreshToken", required = false) String refreshToken) {
        if (refreshToken == null) {
            return Mono.just(ResponseEntity.status(HttpStatus.UNAUTHORIZED).build());
        }
        try {
            Claims claims = jwtUtil.parseToken(refreshToken);
            String jti = jwtUtil.getJti(claims);
            
            return redisTemplate.hasKey("blacklist:" + jti).flatMap(isBlacklisted -> {
                if (Boolean.TRUE.equals(isBlacklisted) || jwtUtil.isExpired(claims)) {
                    return Mono.just(ResponseEntity.status(HttpStatus.UNAUTHORIZED).<AuthResponse>build());
                }
                String username = jwtUtil.getUsername(claims);
                return Mono.fromCallable(() -> userRepository.findByUsername(username))
                        .subscribeOn(reactor.core.scheduler.Schedulers.boundedElastic())
                        .flatMap(optUser -> optUser.map(Mono::just).orElseGet(Mono::empty))
                        .map(user -> {
                            String newAccessToken = jwtUtil.generateAccessToken(user, user.getRole());
                            return ResponseEntity.ok(new AuthResponse(newAccessToken, user.getUsername(), user.getRole()));
                        });
            });
        } catch (Exception e) {
            return Mono.just(ResponseEntity.status(HttpStatus.UNAUTHORIZED).build());
        }
    }

    @PostMapping("/logout")
    public Mono<ResponseEntity<Void>> logout(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authHeader,
            @CookieValue(name = "refreshToken", required = false) String refreshToken) {
        
        Mono<Void> blacklistAccess = Mono.empty();
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            try {
                Claims claims = jwtUtil.parseToken(token);
                String jti = jwtUtil.getJti(claims);
                long exp = claims.getExpiration().getTime() - System.currentTimeMillis();
                if (exp > 0) {
                    blacklistAccess = redisTemplate.opsForValue().set("blacklist:" + jti, "true", Duration.ofMillis(exp)).then();
                }
            } catch (Exception ignored) {}
        }
        
        Mono<Void> blacklistRefresh = Mono.empty();
        if (refreshToken != null) {
            try {
                Claims claims = jwtUtil.parseToken(refreshToken);
                String jti = jwtUtil.getJti(claims);
                long exp = claims.getExpiration().getTime() - System.currentTimeMillis();
                if (exp > 0) {
                    blacklistRefresh = redisTemplate.opsForValue().set("blacklist:" + jti, "true", Duration.ofMillis(exp)).then();
                }
            } catch (Exception ignored) {}
        }
        
        ResponseCookie clearCookie = ResponseCookie.from("refreshToken", "")
                .httpOnly(true)
                .secure(true)
                .sameSite("Strict")
                .path("/")
                .maxAge(0)
                .build();
                
        return Mono.when(blacklistAccess, blacklistRefresh)
                .then(Mono.just(ResponseEntity.ok()
                        .header(HttpHeaders.SET_COOKIE, clearCookie.toString())
                        .<Void>build()));
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
