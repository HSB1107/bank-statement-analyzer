import { IngestionScreen } from "@/features/cases";
import { CaseIdSchema } from "@/shared/data/schemas/ids";
import { withParsedParam } from "@/shared/layout/route-param";
import { DEMO_CASE_IDS } from "@/shared/data/demo-routes";

export const metadata = { title: "Statement Ingestion" };

export const dynamicParams = false;

export function generateStaticParams() {
  return DEMO_CASE_IDS.map((caseId) => ({ caseId }));
}

export default async function Page({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;
  return withParsedParam(CaseIdSchema, caseId, (id) => <IngestionScreen caseId={id} />, "Case");
}
