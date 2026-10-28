import { describe, expect, it, vi } from "vitest";
import { createResendSender } from "./resend-email";

const message = {
  to: "ana@example.com",
  subject: "Hola",
  text: "cuerpo secreto",
  html: "<p>cuerpo secreto</p>",
};

function setup(response: Response | Error) {
  const fetcher = vi.fn<typeof fetch>(() =>
    response instanceof Error
      ? Promise.reject(response)
      : Promise.resolve(response),
  );
  const sender = createResendSender({
    apiKey: "re_test_key",
    from: "Calma Inquieta <hola@calma.example.test>",
    fetcher,
  });
  return { sender, fetcher };
}

describe("resend sender", () => {
  it("posts the email to the Resend API with the bearer key", async () => {
    const { sender, fetcher } = setup(new Response("{}", { status: 200 }));
    await expect(sender.send(message)).resolves.toEqual({
      ok: true,
      value: undefined,
    });
    const [url, init] = fetcher.mock.calls[0] ?? [];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init?.method).toBe("POST");
    expect(new Headers(init?.headers).get("authorization")).toBe(
      "Bearer re_test_key",
    );
    expect(JSON.parse(init?.body as string)).toEqual({
      from: "Calma Inquieta <hola@calma.example.test>",
      to: ["ana@example.com"],
      subject: "Hola",
      text: "cuerpo secreto",
      html: "<p>cuerpo secreto</p>",
    });
  });

  it("names a rejection by its status class and leaks nothing", async () => {
    const { sender } = setup(
      new Response('{"message":"re_test_key cuerpo secreto"}', { status: 422 }),
    );
    const result = await sender.send(message);
    expect(result).toEqual({ ok: false, error: { kind: "resend-rejected" } });
    expect(JSON.stringify(result)).not.toContain("re_test_key");
    expect(JSON.stringify(result)).not.toContain("secreto");
  });

  it("names a server error and a network error", async () => {
    await expect(
      setup(new Response("", { status: 503 })).sender.send(message),
    ).resolves.toEqual({ ok: false, error: { kind: "resend-unavailable" } });
    await expect(
      setup(new Error("boom re_test_key")).sender.send(message),
    ).resolves.toEqual({ ok: false, error: { kind: "resend-unreachable" } });
  });
});
