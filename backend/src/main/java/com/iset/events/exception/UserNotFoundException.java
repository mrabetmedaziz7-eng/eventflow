package com.iset.events.exception;

public class UserNotFoundException extends RuntimeException {

    public UserNotFoundException(Long userId) {
        super("Utilisateur introuvable : " + userId);
    }
}
