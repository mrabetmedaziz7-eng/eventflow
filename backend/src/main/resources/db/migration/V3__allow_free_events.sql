ALTER TABLE events
    DROP CONSTRAINT chk_events_ticket_price;

ALTER TABLE events
    ADD CONSTRAINT chk_events_ticket_price CHECK (ticket_price >= 0);
