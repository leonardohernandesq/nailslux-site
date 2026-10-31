import "server-only";
import { cacheLife } from "next/cache";
import { connectDB } from "../db/connect";
import { Tenant } from "../db/models";
import { studioBrand, type StudioBrand } from "../studio-brand";
import { toTenantDTO, type LeanTenant } from "./tenants";

export type ShowcaseStudio = {
  slug: string;
  name: string;
  tagline: string;
  logo: StudioBrand["logo"];
  banner: NonNullable<StudioBrand["banner"]>;
};

/** Live studios for the landing page. Without a banner there's nothing to show of them. */
export async function getShowcaseStudios(): Promise<ShowcaseStudio[]> {
  "use cache";
  cacheLife("hours");

  await connectDB();
  const docs = await Tenant.find({ status: "active" }).lean<LeanTenant[]>();
  return docs.flatMap((doc) => {
    const tenant = toTenantDTO(doc);
    const { logo, banner } = studioBrand(tenant);
    return banner ? [{ slug: tenant.slug, name: tenant.name, tagline: tenant.tagline, logo, banner }] : [];
  });
}
