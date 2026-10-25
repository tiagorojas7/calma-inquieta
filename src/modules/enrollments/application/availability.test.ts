import { describe, expect, it, vi } from "vitest";
import { createAvailabilityReader } from "./availability";

describe("enrollment availability reader", () => {
  it("subtracts confirmed seats from capacity", async () => {
    const seats = { confirmedSeats: vi.fn().mockResolvedValue(5) };
    const reader = createAvailabilityReader(seats);

    await expect(reader.availableSeats("period-1", "turno-1", 8)).resolves.toBe(
      3,
    );
    expect(seats.confirmedSeats).toHaveBeenCalledWith("period-1", "turno-1");
  });

  it("clamps availability at zero when confirmed seats exceed capacity", async () => {
    const reader = createAvailabilityReader({
      confirmedSeats: vi.fn().mockResolvedValue(6),
    });

    await expect(reader.availableSeats("period-1", "turno-1", 5)).resolves.toBe(
      0,
    );
  });

  it("preserves full capacity when the seat counter is missing", async () => {
    const reader = createAvailabilityReader({
      confirmedSeats: vi.fn().mockResolvedValue(0),
    });

    await expect(reader.availableSeats("period-1", "turno-1", 8)).resolves.toBe(
      8,
    );
  });

  it("keeps confirmed counts isolated by exact period and turno keys", async () => {
    const confirmedByKey = new Map([
      ["period-1:turno-1", 5],
      ["period-1:turno-2", 2],
      ["period-2:turno-1", 1],
    ]);
    const reader = createAvailabilityReader({
      confirmedSeats: (periodId, turnoId) =>
        Promise.resolve(confirmedByKey.get(`${periodId}:${turnoId}`) ?? 0),
    });

    await expect(reader.availableSeats("period-1", "turno-1", 8)).resolves.toBe(
      3,
    );
    await expect(reader.availableSeats("period-1", "turno-2", 8)).resolves.toBe(
      6,
    );
    await expect(reader.availableSeats("period-2", "turno-1", 8)).resolves.toBe(
      7,
    );
  });

  it("does not let pending orders reduce availability", async () => {
    const seats = {
      pendingOrders: 0,
      confirmedSeats: vi.fn().mockResolvedValue(5),
    };
    const reader = createAvailabilityReader(seats);

    await expect(reader.availableSeats("period-1", "turno-1", 8)).resolves.toBe(
      3,
    );
    seats.pendingOrders = 100;
    await expect(reader.availableSeats("period-1", "turno-1", 8)).resolves.toBe(
      3,
    );
    expect(seats.confirmedSeats).toHaveBeenCalledTimes(2);
  });

  it("propagates seat ledger failures", async () => {
    const reader = createAvailabilityReader({
      confirmedSeats: vi.fn().mockRejectedValue(new Error("offline")),
    });

    await expect(
      reader.availableSeats("period-1", "turno-1", 8),
    ).rejects.toThrow("offline");
  });
});
