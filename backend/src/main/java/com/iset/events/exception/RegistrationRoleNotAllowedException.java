package com.iset.events.exception;

public class RegistrationRoleNotAllowedException extends RuntimeException {

    public RegistrationRoleNotAllowedException() {
        super("Le rôle ADMIN ne peut pas être demandé lors de l'inscription.");
    }
}
