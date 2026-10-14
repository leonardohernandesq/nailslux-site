// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The server action saves the request (the studio confirms it in the admin).
const requestAppointment = vi.hoisted(() => vi.fn());
vi.mock("@/lib/actions/appointments", () => ({ requestAppointment }));

import { BookingProvider } from "@/components/booking/booking-context";
import { BookingForm } from "@/components/booking/booking-form";
import { ServiceSelectButton } from "@/components/booking/service-select-button";
import type { OpeningHours } from "@/lib/site";

const hours: OpeningHours = {
  days: [1, 2, 3, 4, 5, 6],
  opens: "09:00",
  lastStart: "12:00",
  slotMinutes: 30,
  maxDaysAhead: 60,
};

const services = [
  { id: "gel", name: "Verniz gel", priceCents: 2500, durationMinutes: 60 },
  { id: "pe", name: "Pedicure", priceCents: 1800 },
];

function renderForm() {
  return render(
    <BookingProvider services={services}>
      <ServiceSelectButton id="pe" name="Pedicure" />
      <BookingForm whatsappNumber="351922269283" hours={hours} />
    </BookingProvider>,
  );
}

describe("BookingForm", () => {
  // The tab is opened blank on click, then pointed at WhatsApp once the request is saved.
  let popup: { opener: unknown; location: { href: string }; close: () => void };
  const open = vi.fn<typeof window.open>(() => popup as unknown as Window);
  let busy: { start: number; end: number }[] = [];

  beforeEach(() => {
    // Wednesday 14 Oct 2026, 08:00
    vi.useFakeTimers({ toFake: ["Date"], now: new Date(2026, 9, 14, 8, 0) });
    popup = { opener: {}, location: { href: "" }, close: vi.fn() };
    busy = [];
    vi.stubGlobal("open", open);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ busy })),
    );
    requestAppointment.mockResolvedValue({ ok: true, id: "abc" });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    open.mockClear();
    requestAppointment.mockReset();
  });

  it("shows an error summary and opens nothing when the form is empty", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole("button", { name: /enviar pedido pelo whatsapp/i }));

    const summary = screen.getByRole("alert");
    expect(within(summary).getByText(/serviços: escolha pelo menos um serviço/i)).toBeTruthy();
    expect(within(summary).getByText(/data: escolha uma data/i)).toBeTruthy();
    expect(within(summary).getByText(/nome: indique o seu nome/i)).toBeTruthy();
    expect(within(summary).getByText(/whatsapp: indique o seu número de whatsapp/i)).toBeTruthy();
    expect(document.activeElement).toBe(summary);
    expect(open).not.toHaveBeenCalled();
  });

  it("opens WhatsApp with the booking details", async () => {
    const user = userEvent.setup();
    renderForm();

    // Selecting from the service card is reflected in the form.
    await user.click(screen.getByRole("button", { name: /escolher pedicure/i }));
    expect((screen.getByRole("checkbox", { name: /pedicure/i }) as HTMLInputElement).checked).toBe(true);
    await user.click(screen.getByRole("checkbox", { name: /verniz gel/i }));
    expect(screen.getByText(/43,00/)).toBeTruthy();

    fireEvent.change(screen.getByLabelText(/data/i), { target: { value: "2026-10-16" } });
    await user.click(screen.getByRole("radio", { name: "10:30" }));
    await user.type(screen.getByLabelText(/o seu nome/i), "Ana");
    await user.type(screen.getByLabelText(/o seu whatsapp/i), "912 345 678");
    await user.click(screen.getByRole("button", { name: /enviar pedido pelo whatsapp/i }));

    expect(open).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(popup.location.href).not.toBe(""));
    expect(requestAppointment).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Ana", phone: "912 345 678", date: "2026-10-16", time: "10:30" }),
    );
    expect(popup.opener).toBeNull();
    const url = new URL(popup.location.href);
    expect(url.origin + url.pathname).toBe("https://wa.me/351922269283");
    const text = url.searchParams.get("text")!;
    expect(text).toContain("*Nome:* Ana");
    expect(text).toContain("Pedicure");
    expect(text).toContain("Verniz gel");
    expect(text).toContain("*Data:* sexta-feira, 16 de outubro de 2026");
    expect(text).toContain("*Hora:* 10:30");
    expect(text).not.toContain("http"); // no links in the client's message
    expect(screen.getByRole("status").textContent).toMatch(/mensagem pronta/i);
  });

  it("greys out times taken by confirmed appointments, for the chosen services' length", async () => {
    busy = [{ start: 11 * 60, end: 12 * 60 }]; // 11:00–12:00 taken
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole("button", { name: /escolher pedicure/i })); // no duration: 1h
    fireEvent.change(screen.getByLabelText(/data/i), { target: { value: "2026-10-16" } });

    await waitFor(() => expect((screen.getByRole("radio", { name: /11:00/ }) as HTMLInputElement).disabled).toBe(true));
    expect(screen.getByRole("radio", { name: /11:00\s*\(ocupado\)/ })).toBeTruthy();
    expect((screen.getByRole("radio", { name: /10:30/ }) as HTMLInputElement).disabled).toBe(true); // runs into 11:00
    expect((screen.getByRole("radio", { name: /^10:00$/ }) as HTMLInputElement).disabled).toBe(false);
    expect((screen.getByRole("radio", { name: /^12:00$/ }) as HTMLInputElement).disabled).toBe(false);
  });

  it("shows the server's answer when the time was just taken, and opens nothing", async () => {
    requestAppointment.mockResolvedValue({ ok: false, field: "time", message: "Esta hora acabou de ficar ocupada." });
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole("button", { name: /escolher pedicure/i }));
    fireEvent.change(screen.getByLabelText(/data/i), { target: { value: "2026-10-16" } });
    await user.click(await screen.findByRole("radio", { name: "10:30" }));
    await user.type(screen.getByLabelText(/o seu nome/i), "Ana");
    await user.type(screen.getByLabelText(/o seu whatsapp/i), "912 345 678");
    await user.click(screen.getByRole("button", { name: /enviar pedido pelo whatsapp/i }));

    expect(await screen.findByText(/hora: esta hora acabou de ficar ocupada/i)).toBeTruthy();
    expect(popup.close).toHaveBeenCalled();
    expect(popup.location.href).toBe("");
  });

  it("explains when the chosen day is closed", async () => {
    renderForm();
    fireEvent.change(screen.getByLabelText(/data/i), { target: { value: "2026-10-18" } }); // Sunday
    expect(screen.getByText(/não há horas disponíveis neste dia/i)).toBeTruthy();
  });
});
