import { ProcessingScreen } from "@/features/processing";
import { CaseIdSchema } from "@/shared/data/schemas/ids";
import { withParsedParam } from "@/shared/layout/route-param";
import { DEMO_CASE_IDS } from "@/shared/data/demo-routes";

export const metadata = { title: "AI Processing" };

export const dynamicParams = false;

export function generateStaticParams() {
  return DEMO_CASE_IDS.map((caseId) => ({ caseId }));
}

export default async function Page({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;
  return withParsedParam(CaseIdSchema, caseId, (id) => <ProcessingScreen caseId={id} />, "Case");
}
