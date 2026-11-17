import { beforeEach, describe, expect, it, vi } from "vitest";

type SentMail = { to: string; subject: string; text: string; html: string; replyTo?: string };
const mail = vi.hoisted(() => ({ sent: [] as SentMail[], works: true }));
const session = vi.hoisted(() => ({ current: null as null | { user: { email: string; tenantSlug?: string } } }));

vi.mock("@/auth", () => ({ auth: vi.fn(async () => session.current) }));
vi.mock("@/lib/mail", async (original) => ({
  ...(await original<typeof import("@/lib/mail")>()),
  sendMail: vi.fn(async (message: SentMail) => {
    mail.sent.push(message);
    return mail.works;
  }),
}));

const { sendContactMessage } = await import("@/lib/actions/contact");
const { idleState } = await import("@/lib/actions/form-state");
const { PLATFORM } = await import("@/lib/site");

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  const all = { kind: "sugestao", name: "Inês", email: "ines@example.com", site: "", message: "Gostava de mostrar avaliações.", ...fields };
  for (const [key, value] of Object.entries(all)) data.set(key, value);
  return data;
}

beforeEach(() => {
  mail.sent = [];
  mail.works = true;
  session.current = null;
});

describe("sendContactMessage", () => {
  it("emails the platform, with Reply going to the sender", async () => {
    const state = await sendContactMessage(idleState, form({ kind: "reclamacao", site: "unhas-da-ines" }));

    expect(state.status).toBe("success");
    expect(mail.sent).toHaveLength(1);
    const [sent] = mail.sent;
    expect(sent.to).toBe(PLATFORM.contactEmail);
    expect(sent.replyTo).toBe("ines@example.com");
    expect(sent.subject).toContain("[Reclamação] Inês · unhas-da-ines");
    expect(sent.text).toContain("Gostava de mostrar avaliações.");
  });

  it("escapes what the visitor typed in the HTML", async () => {
    await sendContactMessage(idleState, form({ name: "<b>Ana</b>", message: "<script>alert(1)</script> olá" }));
    expect(mail.sent[0].html).not.toContain("<script>");
    expect(mail.sent[0].html).toContain("&lt;script&gt;");
    expect(mail.sent[0].html).not.toContain("<b>Ana</b>");
  });

  it("names the studio of a signed-in owner", async () => {
    session.current = { user: { email: "dona@example.com", tenantSlug: "studio-c" } };
    await sendContactMessage(idleState, form({}));
    expect(mail.sent[0].text).toContain("Conta: studio-c (sessão iniciada como dona@example.com)");
  });

  it("refuses an unknown kind and a short message, keeping what was typed", async () => {
    const state = await sendContactMessage(idleState, form({ kind: "spam", message: "oi" }));
    expect(state.status).toBe("error");
    expect(state.fieldErrors?.kind).toBeDefined();
    expect(state.fieldErrors?.message).toBeDefined();
    expect(state.values?.name).toBe("Inês");
    expect(mail.sent).toHaveLength(0);
  });

  it("drops what bots send through the hidden field", async () => {
    const state = await sendContactMessage(idleState, form({ website: "http://spam.example" }));
    expect(state.status).toBe("success");
    expect(mail.sent).toHaveLength(0);
  });

  it("says so when the email can't be sent", async () => {
    mail.works = false;
    const state = await sendContactMessage(idleState, form({}));
    expect(state.status).toBe("error");
    expect(state.message).toContain(PLATFORM.contactEmail);
  });
});
