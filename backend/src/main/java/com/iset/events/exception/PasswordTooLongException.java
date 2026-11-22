package com.iset.events.exception;

public class PasswordTooLongException extends RuntimeException {

    public PasswordTooLongException() {
        super("Le mot de passe ne doit pas dépasser 72 octets UTF-8.");
    }
}
