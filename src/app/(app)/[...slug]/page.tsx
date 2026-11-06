import { notFound } from "next/navigation";
import { ALL_NAV_ITEMS } from "@/shared/layout/nav-config";
import { Pass2Placeholder } from "@/shared/layout/pass2-placeholder";

const DEMO_LINKS = [
  { label: "Arjun Mehta profile", href: "/profiles/CUST-IN-R-210457/overview" },
  { label: "Meridian case BSA-26-04421", href: "/cases/BSA-26-04421/ingestion" },
] as const;

export const dynamicParams = false;

export function generateStaticParams() {
  return ALL_NAV_ITEMS.filter((i) => i.pass === 2).map((i) => ({ slug: i.href.split("/").filter(Boolean) }));
}

export default async function Pass2Page({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const path = `/${slug.join("/")}`;
  const item = ALL_NAV_ITEMS.find((i) => i.href === path && i.pass === 2);
  if (!item) notFound();
  return <Pass2Placeholder title={item.label} links={DEMO_LINKS} />;
}
