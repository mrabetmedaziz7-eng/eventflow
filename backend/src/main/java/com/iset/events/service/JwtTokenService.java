package com.iset.events.service;

import com.iset.events.dto.auth.AuthResponse;
import com.iset.events.entity.User;
import com.iset.events.mapper.UserMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.stereotype.Service;

import java.time.Instant;

@Service
public class JwtTokenService {

    private final JwtEncoder jwtEncoder;
    private final long expirationMillis;
    private final UserMapper userMapper;

    public JwtTokenService(
            JwtEncoder jwtEncoder,
            @Value("${app.jwt.expiration}") long expirationMillis,
            UserMapper userMapper
    ) {
        if (expirationMillis <= 0) {
            throw new IllegalArgumentException("JWT_EXPIRATION doit être supérieur à zéro.");
        }
        this.jwtEncoder = jwtEncoder;
        this.expirationMillis = expirationMillis;
        this.userMapper = userMapper;
    }

    public AuthResponse issueFor(User user) {
        Instant now = Instant.now();
        Instant expiresAt = now.plusMillis(expirationMillis);
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer("eventflow")
                .issuedAt(now)
                .expiresAt(expiresAt)
                .subject(user.getId().toString())
                .claim("id", user.getId())
                .claim("role", user.getRole().name())
                .build();
        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).type("JWT").build();
        String token = jwtEncoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
        return new AuthResponse(token, "Bearer", expirationMillis / 1000, userMapper.toResponse(user));
    }
}
