package com.iset.events.exception;

public class NotificationNotFoundException extends RuntimeException {

    public NotificationNotFoundException(Long notificationId) {
        super("Notification introuvable : " + notificationId);
    }
}
