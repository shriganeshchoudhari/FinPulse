package com.finpulse.backend.controller;

import com.finpulse.identity.User;
import com.finpulse.identity.UserRepository;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
public class AdminController {

    private final UserRepository userRepository;

    @PatchMapping("/users/{userId}/role")
    public Mono<ResponseEntity<User>> updateRole(@PathVariable UUID userId, @RequestBody RoleUpdateRequest request) {
        return Mono.fromCallable(() -> userRepository.findById(userId))
                .subscribeOn(Schedulers.boundedElastic())
                .flatMap(optUser -> {
                    if (optUser.isEmpty()) {
                        return Mono.just(ResponseEntity.notFound().<User>build());
                    }
                    User user = optUser.get();
                    user.setRole(request.getRole());
                    return Mono.fromCallable(() -> userRepository.save(user))
                            .subscribeOn(Schedulers.boundedElastic())
                            .map(ResponseEntity::ok);
                });
    }

    @PatchMapping("/users/{userId}/kyc")
    public Mono<ResponseEntity<User>> updateKyc(@PathVariable UUID userId, @RequestBody KycUpdateRequest request) {
        return Mono.fromCallable(() -> userRepository.findById(userId))
                .subscribeOn(Schedulers.boundedElastic())
                .flatMap(optUser -> {
                    if (optUser.isEmpty()) {
                        return Mono.just(ResponseEntity.notFound().<User>build());
                    }
                    User user = optUser.get();
                    user.setKycStatus(request.getKycStatus());
                    return Mono.fromCallable(() -> userRepository.save(user))
                            .subscribeOn(Schedulers.boundedElastic())
                            .map(ResponseEntity::ok);
                });
    }

    @Data
    public static class RoleUpdateRequest {
        private String role;
    }

    @Data
    public static class KycUpdateRequest {
        private String kycStatus;
    }
}
