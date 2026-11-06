import { DEMO_CUSTOMERS } from "@/shared/data/demo-routes";
import { ClientRedirect } from "@/shared/layout/client-redirect";

export const dynamicParams = false;

export function generateStaticParams() {
  return DEMO_CUSTOMERS.map((c) => ({ customerId: c.customerId }));
}

export default async function Page({ params }: { params: Promise<{ customerId: string }> }) {
  const { customerId } = await params;
  return <ClientRedirect to={`/profiles/${customerId}/overview`} />;
}
