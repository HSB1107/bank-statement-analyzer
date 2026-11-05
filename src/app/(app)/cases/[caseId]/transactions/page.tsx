import { ReviewScreen } from "@/features/transactions";
import { CaseIdSchema } from "@/shared/data/schemas/ids";
import { withParsedParam } from "@/shared/layout/route-param";

export const metadata = { title: "Transaction Review" };

export default async function Page({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;
  return withParsedParam(CaseIdSchema, caseId, (id) => <ReviewScreen caseId={id} />, "Case");
}
