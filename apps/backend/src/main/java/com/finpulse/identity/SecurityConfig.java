package com.finpulse.identity;

import io.jsonwebtoken.Claims;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.core.ReactiveStringRedisTemplate;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.web.reactive.EnableWebFluxSecurity;
import org.springframework.security.config.web.server.ServerHttpSecurity;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextImpl;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.server.SecurityWebFilterChain;
import org.springframework.security.web.server.context.ServerSecurityContextRepository;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.util.Collections;

@Configuration
@EnableWebFluxSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtUtil jwtUtil;
    private final ReactiveStringRedisTemplate redisTemplate;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityWebFilterChain securityWebFilterChain(ServerHttpSecurity http) {
        return http
                .csrf(ServerHttpSecurity.CsrfSpec::disable)
                .cors(ServerHttpSecurity.CorsSpec::disable)
                .securityContextRepository(new ServerSecurityContextRepository() {
                    @Override
                    public Mono<Void> save(ServerWebExchange exchange, SecurityContext context) {
                        return Mono.empty();
                    }

                    @Override
                    public Mono<SecurityContext> load(ServerWebExchange exchange) {
                        String authHeader = exchange.getRequest().getHeaders().getFirst(HttpHeaders.AUTHORIZATION);
                        if (authHeader != null && authHeader.startsWith("Bearer ")) {
                            String token = authHeader.substring(7);
                            try {
                                Claims claims = jwtUtil.parseToken(token);
                                String jti = jwtUtil.getJti(claims);
                                
                                // Validate if the JTI has been revoked in Redis
                                return redisTemplate.hasKey("blacklist:" + jti)
                                        .flatMap(isBlacklisted -> {
                                            if (Boolean.TRUE.equals(isBlacklisted) || jwtUtil.isExpired(claims)) {
                                                return Mono.empty();
                                            }
                                            
                                            String username = jwtUtil.getUsername(claims);
                                            String role = jwtUtil.getRole(claims);
                                            
                                            UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                                                    username, null, Collections.singletonList(new SimpleGrantedAuthority(role))
                                            );
                                            return Mono.just(new SecurityContextImpl(authentication));
                                        });
                            } catch (Exception e) {
                                return Mono.empty();
                            }
                        }
                        return Mono.empty();
                    }
                })
                .authorizeExchange(exchanges -> exchanges
                        .pathMatchers("/api/v1/auth/**", "/actuator/**", "/ws/**", "/swagger-ui/**", "/swagger-ui.html", "/v3/api-docs/**", "/webjars/**").permitAll()
                        .pathMatchers("/api/v1/compliance/**").hasAuthority("ROLE_COMPLIANCE")
                        .anyExchange().authenticated()
                )
                .exceptionHandling(exceptionHandlingSpec -> exceptionHandlingSpec
                        .authenticationEntryPoint((exchange, denied) -> Mono.fromRunnable(() -> 
                                exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED)
                        ))
                        .accessDeniedHandler((exchange, denied) -> Mono.fromRunnable(() -> 
                                exchange.getResponse().setStatusCode(HttpStatus.FORBIDDEN)
                        ))
                )
                .build();
    }
}
