package com.iset.events.exception;

public class LastActiveAdminException extends RuntimeException {

    public LastActiveAdminException() {
        super("Le dernier administrateur actif ne peut pas être désactivé ou rétrogradé.");
    }
}
