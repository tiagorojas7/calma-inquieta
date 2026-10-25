import { describe, expect, it, vi } from "vitest";
import { createConfirmedSeatsAdapter } from "./confirmed-seats-adapter";

describe("confirmed seats adapter", () => {
  it("forwards the exact period and turno keys, including a zero count", async () => {
    const confirmedSeats = vi.fn(() => Promise.resolve(0));
    const subject = createConfirmedSeatsAdapter({ confirmedSeats });

    await expect(subject.confirmedSeats("period-1", "turno-2")).resolves.toBe(
      0,
    );
    expect(confirmedSeats).toHaveBeenCalledWith("period-1", "turno-2");
  });

  it("forwards confirmed counts unchanged", async () => {
    const subject = createConfirmedSeatsAdapter({
      confirmedSeats: () => Promise.resolve(7),
    });

    await expect(subject.confirmedSeats("period-1", "turno-2")).resolves.toBe(
      7,
    );
  });

  it("propagates ledger rejection for the workshop service to fail closed", async () => {
    const failure = new Error("ledger unavailable");
    const subject = createConfirmedSeatsAdapter({
      confirmedSeats: () => Promise.reject(failure),
    });

    await expect(subject.confirmedSeats("period-1", "turno-2")).rejects.toBe(
      failure,
    );
  });
});
