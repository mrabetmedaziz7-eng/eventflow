package com.iset.events.exception;

public class EmailAlreadyRegisteredException extends RuntimeException {

    public EmailAlreadyRegisteredException() {
        super("Cet email est déjà utilisé.");
    }
}
