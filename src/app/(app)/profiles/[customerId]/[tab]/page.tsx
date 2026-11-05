import { ProfileRoute } from "@/composition/profile-route";
import { CustomerIdSchema } from "@/shared/data/schemas/ids";
import { withParsedParam } from "@/shared/layout/route-param";

export const metadata = { title: "Financial Profile" };

export default async function Page({ params }: { params: Promise<{ customerId: string; tab: string }> }) {
  const { customerId, tab } = await params;
  return withParsedParam(
    CustomerIdSchema,
    customerId,
    (id) => <ProfileRoute customerId={id} tab={tab} />,
    "Customer",
  );
}
