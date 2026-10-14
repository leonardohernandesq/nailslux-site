import { describe, expect, it } from "vitest";
import { formatDuration, formatPrice } from "@/lib/format";
import { formatOpeningDays, formatPhoneForDisplay } from "@/lib/site";
import { buildBookingMessage, buildWhatsAppUrl, type BookingService } from "@/lib/whatsapp";

const services: BookingService[] = [
  { id: "gel", name: "Verniz gel", priceCents: 2500, durationMinutes: 60 },
  { id: "pe", name: "Pedicure", priceCents: 1850, durationMinutes: 45 },
  { id: "art", name: "Nail art", priceCents: 500 },
];

describe("buildBookingMessage", () => {
  it("lists services, total, duration, date and time", () => {
    const message = buildBookingMessage(
      { name: "Ana Silva", phone: "351912345678", serviceIds: ["gel", "pe"], date: "2026-10-17", time: "14:30", notes: "Cor nude" },
      services,
    );
    expect(message).toContain("*Nome:* Ana Silva");
    expect(message).toContain("*Serviços:*");
    expect(message).toContain(`• Verniz gel (${formatPrice(2500)})`);
    expect(message).toContain(`• Pedicure (${formatPrice(1850)})`);
    expect(message).toContain(`*Total estimado:* ${formatPrice(4350)}`);
    expect(message).toContain("*Duração estimada:* 1h45");
    expect(message).toContain("*Data:* sábado, 17 de outubro de 2026");
    expect(message).toContain("*Hora:* 14:30");
    expect(message).toContain("*Observações:* Cor nude");
  });

  it("uses the singular label and skips empty optional lines", () => {
    const message = buildBookingMessage(
      { name: "Rita", phone: "351912345678", serviceIds: ["art"], date: "2026-10-17", time: "09:00", notes: undefined },
      services,
    );
    expect(message).toContain("*Serviço:*");
    expect(message).not.toContain("Duração");
    expect(message).not.toContain("Observações");
  });
});

describe("buildWhatsAppUrl", () => {
  it("encodes the message for wa.me", () => {
    const url = buildWhatsAppUrl("351922269283", "Olá & bem-vinda!\n*Hora:* 10:00");
    expect(url.startsWith("https://wa.me/351922269283?text=")).toBe(true);
    expect(decodeURIComponent(url.split("text=")[1])).toBe("Olá & bem-vinda!\n*Hora:* 10:00");
  });
});

describe("formatters", () => {
  it("formats durations", () => {
    expect(formatDuration(45)).toBe("45 min");
    expect(formatDuration(60)).toBe("1h");
    expect(formatDuration(90)).toBe("1h30");
  });

  it("formats opening days", () => {
    expect(formatOpeningDays([1, 2, 3, 4, 5, 6])).toBe("segunda a sábado");
    expect(formatOpeningDays([2, 4, 6])).toBe("terça, quinta e sábado");
    expect(formatOpeningDays([5])).toBe("sexta");
    // Sunday is 0 (Date#getDay) but comes last in the Portuguese week.
    expect(formatOpeningDays([1, 2, 3, 4, 5, 6, 0])).toBe("segunda a domingo");
    expect(formatOpeningDays([0, 6])).toBe("sábado e domingo");
  });

  it("formats Portuguese phone numbers", () => {
    expect(formatPhoneForDisplay("351922269283")).toBe("+351 922 269 283");
    expect(formatPhoneForDisplay("5511999998888")).toBe("+5511999998888");
  });
});
