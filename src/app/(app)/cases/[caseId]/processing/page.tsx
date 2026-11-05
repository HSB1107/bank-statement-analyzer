import { ProcessingScreen } from "@/features/processing";
import { CaseIdSchema } from "@/shared/data/schemas/ids";
import { withParsedParam } from "@/shared/layout/route-param";

export const metadata = { title: "AI Processing" };

export default async function Page({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;
  return withParsedParam(CaseIdSchema, caseId, (id) => <ProcessingScreen caseId={id} />, "Case");
}
