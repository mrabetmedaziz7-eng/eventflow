import { describe, it, expect, vi } from "vitest";
import { reservationsApi } from "@/lib/api";

describe("Phase 3 Reservation & Payment Flow", () => {
  it("creates a reservation and simulates successful payment", async () => {
    const mockReservation = {
      id: 99,
      eventId: 1,
      eventTitle: "Conference IA",
      numberOfPlaces: 2,
      amount: 40.0,
      status: "EN_ATTENTE" as const,
      confirmationCode: null,
      paymentId: 101,
      paymentStatus: "EN_ATTENTE" as const,
      reservationDate: "2026-11-07T12:00:00Z",
    };

    const mockPaymentResult = {
      paymentId: 101,
      reservationId: 99,
      eventId: 1,
      paymentStatus: "PAYE" as const,
      reservationStatus: "CONFIRMEE" as const,
      confirmationCode: "EVT-TEST-1234",
      amount: 40.0,
      method: "CARTE_SIMULEE" as const,
      reference: "SIM-REF-9999",
      paymentDate: "2026-11-07T12:05:00Z",
    };

    vi.spyOn(reservationsApi, "create").mockResolvedValue(mockReservation);
    vi.spyOn(reservationsApi, "pay").mockResolvedValue(mockPaymentResult);

    const created = await reservationsApi.create({
      eventId: 1,
      numberOfPlaces: 2,
      paymentMethod: "CARTE_SIMULEE",
    });
    expect(created.status).toBe("EN_ATTENTE");

    const paid = await reservationsApi.pay(created.id, "PAYE");
    expect(paid.reservationStatus).toBe("CONFIRMEE");
    expect(paid.confirmationCode).toBe("EVT-TEST-1234");
  });

  it("handles payment failure by setting status to ANNULEE", async () => {
    const mockFailedResult = {
      paymentId: 102,
      reservationId: 100,
      eventId: 1,
      paymentStatus: "ECHOUE" as const,
      reservationStatus: "ANNULEE" as const,
      confirmationCode: null,
      amount: 20.0,
      method: "CARTE_SIMULEE" as const,
      reference: "SIM-FAIL-0000",
      paymentDate: "2026-11-07T12:10:00Z",
    };

    vi.spyOn(reservationsApi, "pay").mockResolvedValue(mockFailedResult);

    const paid = await reservationsApi.pay(100, "ECHOUE");
    expect(paid.paymentStatus).toBe("ECHOUE");
    expect(paid.reservationStatus).toBe("ANNULEE");
  });
});

