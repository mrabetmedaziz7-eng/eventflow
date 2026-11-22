package com.iset.events.controller;

import com.iset.events.dto.event.EventActionRequest;
import com.iset.events.dto.event.EventActionResponse;
import com.iset.events.dto.event.EventDeletionResponse;
import com.iset.events.dto.event.EventParticipantResponse;
import com.iset.events.dto.event.EventRequest;
import com.iset.events.dto.event.EventResponse;
import com.iset.events.dto.event.ReorderEventActionsRequest;
import com.iset.events.service.EventService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/teacher/events")
@PreAuthorize("hasRole('ENSEIGNANT')")
public class TeacherEventController {

    private final EventService eventService;

    public TeacherEventController(EventService eventService) {
        this.eventService = eventService;
    }

    @GetMapping
    public List<EventResponse> findMine(Authentication authentication) {
        return eventService.findMine(currentUserId(authentication));
    }

    @PostMapping
    public ResponseEntity<EventResponse> create(
            @Valid @RequestBody EventRequest request,
            Authentication authentication
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(eventService.create(currentUserId(authentication), request));
    }

    @GetMapping("/{eventId}")
    public EventResponse findById(@PathVariable Long eventId, Authentication authentication) {
        return eventService.findVisible(eventId, currentUserId(authentication));
    }

    @PutMapping("/{eventId}")
    public EventResponse update(
            @PathVariable Long eventId,
            @Valid @RequestBody EventRequest request,
            Authentication authentication
    ) {
        return eventService.update(eventId, currentUserId(authentication), request);
    }

    @PatchMapping("/{eventId}/publish")
    public EventResponse publish(@PathVariable Long eventId, Authentication authentication) {
        return eventService.publish(eventId, currentUserId(authentication));
    }

    @PatchMapping("/{eventId}/cancel")
    public EventResponse cancel(@PathVariable Long eventId, Authentication authentication) {
        return eventService.cancel(eventId, currentUserId(authentication));
    }

    @DeleteMapping("/{eventId}")
    public EventDeletionResponse delete(@PathVariable Long eventId, Authentication authentication) {
        return eventService.delete(eventId, currentUserId(authentication));
    }

    @GetMapping("/{eventId}/participants")
    public List<EventParticipantResponse> findParticipants(
            @PathVariable Long eventId,
            Authentication authentication
    ) {
        return eventService.findParticipants(eventId, currentUserId(authentication));
    }

    @DeleteMapping("/{eventId}/participants/{studentId}")
    public ResponseEntity<Void> removeParticipant(
            @PathVariable Long eventId,
            @PathVariable Long studentId,
            Authentication authentication
    ) {
        eventService.removeParticipant(eventId, studentId, currentUserId(authentication));
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{eventId}/actions")
    public List<EventActionResponse> findActions(@PathVariable Long eventId, Authentication authentication) {
        return eventService.findActions(eventId, currentUserId(authentication));
    }

    @PostMapping("/{eventId}/actions")
    public ResponseEntity<EventActionResponse> addAction(
            @PathVariable Long eventId,
            @Valid @RequestBody EventActionRequest request,
            Authentication authentication
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(eventService.addAction(eventId, currentUserId(authentication), request));
    }

    @PutMapping("/{eventId}/actions/{actionId}")
    public EventActionResponse updateAction(
            @PathVariable Long eventId,
            @PathVariable Long actionId,
            @Valid @RequestBody EventActionRequest request,
            Authentication authentication
    ) {
        return eventService.updateAction(eventId, actionId, currentUserId(authentication), request);
    }

    @DeleteMapping("/{eventId}/actions/{actionId}")
    public ResponseEntity<Void> deleteAction(
            @PathVariable Long eventId,
            @PathVariable Long actionId,
            Authentication authentication
    ) {
        eventService.deleteAction(eventId, actionId, currentUserId(authentication));
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{eventId}/actions/order")
    public List<EventActionResponse> reorderActions(
            @PathVariable Long eventId,
            @Valid @RequestBody ReorderEventActionsRequest request,
            Authentication authentication
    ) {
        return eventService.reorderActions(eventId, currentUserId(authentication), request);
    }

    private Long currentUserId(Authentication authentication) {
        return Long.valueOf(authentication.getName());
    }
}
