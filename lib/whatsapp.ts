import { formatDuration, formatLongDate, formatPrice } from "./format";
import type { BookingRequest } from "./validation/booking";

export type BookingService = {
  id: string;
  name: string;
  priceCents: number;
  durationMinutes?: number;
};

export function buildBookingMessage(booking: BookingRequest, services: readonly BookingService[]): string {
  const chosen = booking.serviceIds
    .map((id) => services.find((service) => service.id === id))
    .filter((service): service is BookingService => Boolean(service));

  const total = chosen.reduce((sum, service) => sum + service.priceCents, 0);
  const totalMinutes = chosen.reduce((sum, service) => sum + (service.durationMinutes ?? 0), 0);

  const lines = [
    "Olá, NailsLux! Gostaria de fazer uma marcação.",
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
