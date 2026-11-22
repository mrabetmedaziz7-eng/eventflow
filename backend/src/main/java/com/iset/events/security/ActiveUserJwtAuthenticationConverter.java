package com.iset.events.security;

import com.iset.events.entity.User;
import com.iset.events.entity.UserStatus;
import com.iset.events.repository.UserRepository;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.server.resource.InvalidBearerTokenException;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class ActiveUserJwtAuthenticationConverter implements Converter<Jwt, AbstractAuthenticationToken> {

    private final UserRepository userRepository;

    public ActiveUserJwtAuthenticationConverter(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public AbstractAuthenticationToken convert(Jwt jwt) {
        Long userId;
        try {
            userId = Long.valueOf(jwt.getSubject());
        } catch (NumberFormatException exception) {
            throw new InvalidBearerTokenException("Le jeton ne contient pas un identifiant utilisateur valide.");
        }

        User user = userRepository.findById(userId)
                .filter(account -> account.getStatus() == UserStatus.ACTIF)
                .orElseThrow(() -> new InvalidBearerTokenException("Ce compte n'est plus actif."));
        return new JwtAuthenticationToken(
                jwt,
                List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name())),
                userId.toString()
        );
    }
}
