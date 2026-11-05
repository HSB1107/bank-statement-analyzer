import { createServiceToken } from "@/shared/lib/di";
import { type AccountId, type CaseId, type StatementFileId } from "@/shared/data/schemas/ids";
import { type AccountRole } from "@/shared/data/schemas/customer";
import { type StatementFile } from "@/shared/data/statement-files";
import {
  type AddFileRequest,
  type CaseDetail,
  type CustomerContext,
  type Ingestion,
  type ProcessingOptions,
  type ProcessingOptionsPatch,
  type StartProcessingResult,
  type ValidationCheck,
} from "../schemas/cases";

/** Port: analysis case lifecycle (context, statements, validation, hand-off to processing). */
export interface CaseService {
  getCase(caseId: CaseId): Promise<CaseDetail>;
  getIngestion(caseId: CaseId): Promise<Ingestion>;
  addFile(caseId: CaseId, file: AddFileRequest): Promise<StatementFile>;
  removeFile(caseId: CaseId, fileId: StatementFileId): Promise<void>;
  updateContext(caseId: CaseId, context: CustomerContext): Promise<CustomerContext>;
  setAccountRole(caseId: CaseId, accountId: AccountId, role: AccountRole): Promise<void>;
  updateOptions(caseId: CaseId, patch: ProcessingOptionsPatch): Promise<ProcessingOptions>;
  validate(caseId: CaseId): Promise<ValidationCheck[]>;
  startProcessing(caseId: CaseId): Promise<StartProcessingResult>;
}

export const CaseServiceToken = createServiceToken<CaseService>("CaseService");
