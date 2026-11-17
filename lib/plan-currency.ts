import "server-only";
import { headers } from "next/headers";
import { currencyForCountry, type PlanCurrency } from "./plans";

/**
 * The currency to show and charge this visitor, from the country Vercel puts on each
 * request. Locally there's no such header: set DEV_COUNTRY=BR to see the Brazilian prices.
 */
export async function getPlanCurrency(): Promise<PlanCurrency> {
  const country = (await headers()).get("x-vercel-ip-country") ?? (process.env.NODE_ENV !== "production" ? process.env.DEV_COUNTRY : undefined);
  return currencyForCountry(country);
}
