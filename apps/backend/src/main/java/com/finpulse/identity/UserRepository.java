package com.finpulse.identity;

import org.springframework.data.r2dbc.repository.R2dbcRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Mono;

import java.util.UUID;

@Repository
public interface UserRepository extends R2dbcRepository<User, UUID> {
    Mono<User> findByUsername(String username);
    Mono<User> findByEmail(String email);
}
