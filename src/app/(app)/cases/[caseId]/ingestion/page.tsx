import { IngestionScreen } from "@/features/cases";
import { CaseIdSchema } from "@/shared/data/schemas/ids";
import { withParsedParam } from "@/shared/layout/route-param";

export const metadata = { title: "Statement Ingestion" };

export default async function Page({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;
  return withParsedParam(CaseIdSchema, caseId, (id) => <IngestionScreen caseId={id} />, "Case");
}
