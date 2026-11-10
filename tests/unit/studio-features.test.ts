import { describe, expect, it } from "vitest";
import { buildCalendar, lisbonToDate } from "@/lib/calendar";
import { isOpenOn, slotsFor, timeOffIntervals } from "@/lib/schedule";
import { DEFAULT_OPENING_HOURS, type OpeningHours } from "@/lib/site";
import { createTimeOffSchema } from "@/lib/validation/time-off";
import { buildCancellationMessage, buildConfirmationMessage, buildReminderMessage } from "@/lib/whatsapp";

const withTimeOff = (timeOff: OpeningHours["timeOff"]): OpeningHours => ({ ...DEFAULT_OPENING_HOURS, timeOff });

describe("time off in the schedule", () => {
  const hours = withTimeOff([
    { id: "a", start: "2026-12-24", end: "2026-12-26" },
    { id: "b", start: "2026-12-30", end: "2026-12-30", from: "14:00", to: "18:00" },
  ]);

  it("closes every day of a whole-day range, and only those", () => {
    expect(isOpenOn("2026-12-23", hours)).toBe(true);
    expect(["2026-12-24", "2026-12-25", "2026-12-26"].map((d) => isOpenOn(d, hours))).toEqual([false, false, false]);
    expect(slotsFor("2026-12-25", hours, new Date(2026, 0, 1))).toEqual([]);
    expect(isOpenOn("2026-12-27", hours)).toBe(true);
  });

  it("keeps a day with hours off open, and returns those hours as busy", () => {
    expect(isOpenOn("2026-12-30", hours)).toBe(true);
    expect(timeOffIntervals("2026-12-30", hours)).toEqual([{ start: 14 * 60, end: 18 * 60 }]);
    expect(timeOffIntervals("2026-12-31", hours)).toEqual([]);
  });
});

describe("createTimeOffSchema", () => {
  const schema = createTimeOffSchema("2026-11-06");

  it("defaults the end to the start and drops hours for whole days", () => {
    expect(schema.parse({ start: "2026-11-10", end: "", span: "day", from: "10:00", to: "12:00", note: " " })).toEqual({
      start: "2026-11-10",
      end: "2026-11-10",
    });
  });

  it("keeps hours and the note for a part of the day", () => {
    expect(schema.parse({ start: "2026-11-10", span: "hours", from: "14:00", to: "18:00", note: "Formação" })).toEqual({
      start: "2026-11-10",
      end: "2026-11-10",
      from: "14:00",
      to: "18:00",
      note: "Formação",
    });
  });

  it("refuses ranges longer than a year", () => {
    expect(schema.safeParse({ start: "2026-11-10", end: "2027-12-01", span: "day" }).success).toBe(false);
  });
});

describe("calendar feed", () => {
  it("turns Lisbon wall-clock times into the right instant in winter and summer", () => {
    expect(lisbonToDate("2026-01-15", "10:00").toISOString()).toBe("2026-01-15T10:00:00.000Z");
    expect(lisbonToDate("2026-07-15", "10:00").toISOString()).toBe("2026-07-15T09:00:00.000Z");
    // A booking running past midnight ("25:00") lands on the next day.
    expect(lisbonToDate("2026-01-15", "25:00").toISOString()).toBe("2026-01-16T01:00:00.000Z");
  });

  it("escapes text, folds long lines and uses CRLF", () => {
    const ics = buildCalendar(
      "Studio; Lux",
      [
        {
          id: "a1",
          name: "Maria, a Silva",
          serviceNames: ["Verniz gel", "Nail art com um nome muito comprido para obrigar a dobrar a linha do evento"],
          date: "2026-07-15",
          time: "10:00",
          endTime: "11:30",
          totalLabel: "30,00 €",
          notes: "Linha 1\nLinha 2",
          url: "https://x/admin/marcacoes/a1",
        },
      ],
      new Date("2026-07-01T00:00:00Z"),
    );
    expect(ics).toContain("X-WR-CALNAME:Marcações · Studio\\; Lux\r\n");
    expect(ics).toContain("DTSTART:20260715T090000Z\r\n");
    expect(ics).toContain("DTEND:20260715T103000Z\r\n");
    expect(ics).toContain("Maria\\, a Silva");
    expect(ics).toContain("Linha 1\\nLinha 2");
    for (const line of ics.split("\r\n")) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
  });
});

describe("buildReminderMessage", () => {
  const base = { name: "Maria Silva", serviceNames: ["Verniz gel"], time: "10:30", studioName: "NailsLux", today: "2026-11-06" };

  it("says today, tomorrow or the full date", () => {
    expect(buildReminderMessage({ ...base, date: "2026-11-06" })).toContain("marcação hoje, às 10:30 (Verniz gel)");
    expect(buildReminderMessage({ ...base, date: "2026-11-07" })).toContain("marcação amanhã, sábado, 7 de novembro, às 10:30");
    expect(buildReminderMessage({ ...base, date: "2026-11-20" })).toContain("sexta-feira, 20 de novembro de 2026");
  });

  it("greets by first name and signs with the studio", () => {
    const message = buildReminderMessage({ ...base, date: "2026-11-07" });
    expect(message.startsWith("Olá, Maria!")).toBe(true);
    expect(message.endsWith("— NailsLux")).toBe(true);
  });
});

describe("buildConfirmationMessage", () => {
  it("says it's confirmed, with the date and time", () => {
    const message = buildConfirmationMessage({
      name: "Maria Silva",
      serviceNames: ["Verniz gel", "Manicure"],
      date: "2026-11-20",
      time: "10:30",
      endTime: "11:45",
      studioName: "NailsLux",
    });
    expect(message.startsWith("Olá, Maria! A sua marcação está confirmada.")).toBe(true);
    expect(message).toContain("*Data:* Sexta-feira, 20 de novembro de 2026");
    expect(message).toContain("*Hora:* 10:30–11:45");
    expect(message).toContain("*Serviços:* Verniz gel, Manicure");
    expect(message.endsWith("— NailsLux")).toBe(true);
  });
});

describe("buildCancellationMessage", () => {
  const base = { name: "Maria Silva", date: "2026-11-20", time: "10:30", studioName: "NailsLux" };

  it("says it's cancelled and offers another date", () => {
    const message = buildCancellationMessage({ ...base, bookingUrl: "https://nailslux.pt/lux" });
    expect(message).toContain("A sua marcação de sexta-feira, 20 de novembro de 2026, às 10:30 foi cancelada.");
    expect(message).toContain("Quer marcar para outra data?");
    expect(message).toContain("https://nailslux.pt/lux");
  });

  it("words a declined request differently and works without a link", () => {
    const message = buildCancellationMessage({ ...base, declined: true });
    expect(message).toContain("não conseguimos confirmar o seu pedido");
    expect(message).not.toContain("http");
  });
});
