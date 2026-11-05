import { redirect } from "next/navigation";

export default async function Page({ params }: { params: Promise<{ customerId: string }> }) {
  const { customerId } = await params;
  redirect(`/profiles/${customerId}/overview`);
}
