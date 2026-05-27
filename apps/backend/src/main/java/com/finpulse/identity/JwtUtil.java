package com.finpulse.identity;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Component
public class JwtUtil {

    private final SecretKey secretKey;
    private final long accessTokenExpirationMs;
    private final long refreshTokenExpirationMs;

    public JwtUtil(
            @Value("${jwt.secret:default-secret-key-must-be-very-long-and-secure-32-chars}") String secret,
            @Value("${jwt.access.expiration:900000}") long accessTokenExpirationMs,
            @Value("${jwt.refresh.expiration:604800000}") long refreshTokenExpirationMs) {
        this.secretKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.accessTokenExpirationMs = accessTokenExpirationMs;
        this.refreshTokenExpirationMs = refreshTokenExpirationMs;
    }

    public String generateAccessToken(User user, String role) {
        return generateToken(user, role, accessTokenExpirationMs);
    }

    public String generateRefreshToken(User user, String role) {
        return generateToken(user, role, refreshTokenExpirationMs);
    }

    private String generateToken(User user, String role, long expirationMs) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("role", role);
        claims.put("email", user.getEmail());
        claims.put("jti", UUID.randomUUID().toString());

        Date now = new Date();
        Date expiry = new Date(now.getTime() + expirationMs);

        return Jwts.builder()
                .setClaims(claims)
                .setSubject(user.getUsername())
                .setIssuedAt(now)
                .setExpiration(expiry)
                .signWith(secretKey)
                .compact();
    }

    public Claims parseToken(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(secretKey)
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    public boolean isExpired(Claims claims) {
        return claims.getExpiration().before(new Date());
    }

    public String getUsername(Claims claims) {
        return claims.getSubject();
    }

    public String getRole(Claims claims) {
        return claims.get("role", String.class);
    }
    
    public String getJti(Claims claims) {
        return claims.get("jti", String.class);
    }
}
