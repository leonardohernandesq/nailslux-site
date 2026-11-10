import { formatDuration, formatLongDate, formatPrice } from "./format";
import type { BookingRequest } from "./validation/booking";

export type BookingService = {
  id: string;
  name: string;
  priceCents: number;
  durationMinutes?: number;
};

export function buildBookingMessage(
  booking: BookingRequest,
  services: readonly BookingService[],
  studioName: string,
): string {
  const chosen = booking.serviceIds
    .map((id) => services.find((service) => service.id === id))
    .filter((service): service is BookingService => Boolean(service));

  const total = chosen.reduce((sum, service) => sum + service.priceCents, 0);
  const totalMinutes = chosen.reduce((sum, service) => sum + (service.durationMinutes ?? 0), 0);

  const lines = [
    `Olá, ${studioName}! Gostaria de fazer uma marcação.`,
    "",
    `*Nome:* ${booking.name}`,
    chosen.length === 1 ? "*Serviço:*" : "*Serviços:*",
    ...chosen.map((service) => `• ${service.name} (${formatPrice(service.priceCents)})`),
    `*Total estimado:* ${formatPrice(total)}`,
  ];
  if (totalMinutes > 0) lines.push(`*Duração estimada:* ${formatDuration(totalMinutes)}`);
  lines.push(`*Data:* ${formatLongDate(booking.date)}`, `*Hora:* ${booking.time}`);
  if (booking.notes) lines.push(`*Observações:* ${booking.notes}`);
  lines.push("", "Fico a aguardar a confirmação.");

  return lines.join("\n");
}

export function buildWhatsAppUrl(phoneDigits: string, message: string): string {
  return `https://wa.me/${phoneDigits}?text=${encodeURIComponent(message)}`;
}

/** The day after `isoDate`, as "YYYY-MM-DD" (calendar dates, no timezones involved). */
function nextDay(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
}

/** A friendly reminder the studio sends the client from its own WhatsApp. */
export function buildReminderMessage(appointment: {
  name: string;
  serviceNames: readonly string[];
  date: string;
  time: string;
  studioName: string;
  today: string;
}): string {
  const { name, serviceNames, date, time, studioName, today } = appointment;
  const firstName = name.trim().split(/\s+/)[0];
  const day =
    date === today ? "hoje" : date === nextDay(today) ? `amanhã, ${formatLongDate(date).replace(/ de \d{4}$/, "")}` : formatLongDate(date);
  return [
    `Olá, ${firstName}! Lembramos a sua marcação ${day}, às ${time} (${serviceNames.join(", ")}).`,
    "Se precisar de mudar a hora, responda a esta mensagem. Até já!",
    `— ${studioName}`,
  ].join("\n");
}

const firstNameOf = (name: string) => name.trim().split(/\s+/)[0];

/** Sent by the studio right after confirming: the date and time, in writing. */
export function buildConfirmationMessage(appointment: {
  name: string;
  serviceNames: readonly string[];
  date: string;
  time: string;
  endTime: string;
  studioName: string;
}): string {
  const { name, serviceNames, date, time, endTime, studioName } = appointment;
  const day = formatLongDate(date);
  return [
    `Olá, ${firstNameOf(name)}! A sua marcação está confirmada.`,
    "",
    `*Data:* ${day.charAt(0).toUpperCase()}${day.slice(1)}`,
    `*Hora:* ${time}–${endTime}`,
    `${serviceNames.length === 1 ? "*Serviço:*" : "*Serviços:*"} ${serviceNames.join(", ")}`,
    "",
    "Se precisar de mudar a hora, responda a esta mensagem. Até breve!",
    `— ${studioName}`,
  ].join("\n");
}

/**
 * Sent by the studio after cancelling (or declining a request): says so and
 * offers another date, with the booking page when there is one.
 */
export function buildCancellationMessage(appointment: {
  name: string;
  date: string;
  time: string;
  studioName: string;
  declined?: boolean;
  bookingUrl?: string;
}): string {
  const { name, date, time, studioName, declined, bookingUrl } = appointment;
  const when = `${formatLongDate(date)}, às ${time}`;
  return [
    declined
      ? `Olá, ${firstNameOf(name)}. Infelizmente não conseguimos confirmar o seu pedido de marcação para ${when}, por isso foi cancelado.`
      : `Olá, ${firstNameOf(name)}. A sua marcação de ${when} foi cancelada.`,
    "",
    "Quer marcar para outra data? Diga-nos o dia e a hora que lhe dão mais jeito e encontramos uma alternativa.",
    ...(bookingUrl ? [`Também pode escolher um novo horário aqui: ${bookingUrl}`] : []),
    `— ${studioName}`,
  ].join("\n");
}
