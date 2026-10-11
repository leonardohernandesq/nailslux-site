// @vitest-environment jsdom
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
  const open = vi.fn<typeof window.open>(() => ({ opener: {} }) as unknown as Window);

  beforeEach(() => {
    // Wednesday 14 Oct 2026, 08:00
    vi.useFakeTimers({ toFake: ["Date"], now: new Date(2026, 9, 14, 8, 0) });
    vi.stubGlobal("open", open);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    open.mockClear();
  });

  it("shows an error summary and opens nothing when the form is empty", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole("button", { name: /enviar pedido pelo whatsapp/i }));

    const summary = screen.getByRole("alert");
    expect(within(summary).getByText(/serviços: escolha pelo menos um serviço/i)).toBeTruthy();
    expect(within(summary).getByText(/data: escolha uma data/i)).toBeTruthy();
    expect(within(summary).getByText(/nome: indique o seu nome/i)).toBeTruthy();
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
    await user.click(screen.getByRole("button", { name: /enviar pedido pelo whatsapp/i }));

    expect(open).toHaveBeenCalledTimes(1);
    const url = new URL(String(open.mock.calls[0][0]));
    expect(url.origin + url.pathname).toBe("https://wa.me/351922269283");
    const text = url.searchParams.get("text")!;
    expect(text).toContain("*Nome:* Ana");
    expect(text).toContain("Pedicure");
    expect(text).toContain("Verniz gel");
    expect(text).toContain("*Data:* sexta-feira, 16 de outubro de 2026");
    expect(text).toContain("*Hora:* 10:30");
    expect(screen.getByRole("status").textContent).toMatch(/mensagem pronta/i);
  });

  it("explains when the chosen day is closed", async () => {
    renderForm();
    fireEvent.change(screen.getByLabelText(/data/i), { target: { value: "2026-10-18" } }); // Sunday
    expect(screen.getByText(/não há horas disponíveis neste dia/i)).toBeTruthy();
  });
});
