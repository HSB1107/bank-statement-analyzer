import { ProfileRoute } from "@/composition/profile-route";
import { CustomerIdSchema } from "@/shared/data/schemas/ids";
import { withParsedParam } from "@/shared/layout/route-param";
import { DEMO_CUSTOMERS } from "@/shared/data/demo-routes";
import { CORPORATE_TABS } from "@/features/profile-corporate";
import { INDIVIDUAL_TABS } from "@/features/profile-individual";

export const metadata = { title: "Financial Profile" };

export const dynamicParams = false;

/** Every demo customer × that customer's tabs (Pass 2 tabs render a placeholder). */
export function generateStaticParams() {
  return DEMO_CUSTOMERS.flatMap((c) =>
    (c.kind === "corporate" ? CORPORATE_TABS : INDIVIDUAL_TABS).map((t) => ({
      customerId: c.customerId,
      tab: t.id,
    })),
  );
}

export default async function Page({ params }: { params: Promise<{ customerId: string; tab: string }> }) {
  const { customerId, tab } = await params;
  return withParsedParam(
    CustomerIdSchema,
    customerId,
    (id) => <ProfileRoute customerId={id} tab={tab} />,
    "Customer",
  );
}
