import { describe, expect, it } from "vitest";
import { createTestServices } from "~/testing/fakes/app-services";
import {
  createInMemoryIntensiveRequests,
  FAKE_INTENSIVE_SLUG,
} from "~/testing/fakes/intensive-request-builders";
import { createLoaderArgs } from "~/testing/react-router";
import { headers, loader, meta } from "./intensive-request-summary";

async function pending() {
  const { service, repository } = createInMemoryIntensiveRequests();
  const sent = await service.requestSeat({
    slug: FAKE_INTENSIVE_SLUG,
    student: {
      fullName: "Ana Pérez",
      email: "ana@example.com",
      phone: "351 555 0101",
      policyAccepted: true,
      honeypot: "",
    },
  });
  if (!sent.ok) throw new Error("request refused");
  return {
    publicId: sent.value.publicId,
    repository,
    services: createTestServices({ intensiveRequests: service }),
  };
}

function args(
  services: ReturnType<typeof createTestServices>,
  publicId: string,
) {
  return {
    ...createLoaderArgs(services, `/reserva/${publicId}`),
    params: { publicId },
  } as never;
}

describe("intensive request summary loader", () => {
  it("projects the request with a prefilled wa.me hand-off", async () => {
    const { services, publicId } = await pending();

    const result = await loader(args(services, publicId));

    expect(result).toMatchObject({
      reference: publicId.slice(0, 8),
      status: "pending_confirmation",
      statusLabel: "Pendiente de seña",
      intensivoName: "Intensivo de cerámica",
    });
    expect(result.deposit.replace(/\s/g, " ")).toBe("$ 15.000");
    const url = new URL(result.whatsappHref ?? "");
    expect(url.host).toBe("wa.me");
    expect(url.searchParams.get("text")).toContain(
      `Solicitud: ${publicId.slice(0, 8)}`,
    );
    expect(JSON.stringify(result)).not.toContain("ana@example.com");
    expect(JSON.stringify(result)).not.toContain("5493515550101");
  });

  it("offers no hand-off once the request is confirmed or cancelled", async () => {
    const { services, repository, publicId } = await pending();
    const stored = [...repository.requests.values()][0];
    if (!stored) throw new Error("missing request");
    repository.requests.set(stored.id, { ...stored, status: "cancelled" });

    const result = await loader(args(services, publicId));

    expect(result.status).toBe("cancelled");
    expect(result.whatsappHref).toBeNull();
  });

  it("answers 404 for an unknown id and 503 when unavailable", async () => {
    const { services } = await pending();
    await expect(loader(args(services, "x".repeat(24)))).rejects.toMatchObject({
      init: { status: 404 },
    });
    await expect(
      loader(args(createTestServices(), "x".repeat(24))),
    ).rejects.toMatchObject({ init: { status: 503 } });
  });
});

describe("intensive request summary headers and meta", () => {
  it("never caches or indexes the summary", () => {
    expect(headers()).toEqual({
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    });
    expect(meta()).toEqual([
      { title: "Tu solicitud" },
      { name: "robots", content: "noindex, nofollow" },
    ]);
  });
});
