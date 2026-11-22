package com.iset.events.dto.event;

public record EventDeletionResponse(boolean deleted, String message, String status) {
}
