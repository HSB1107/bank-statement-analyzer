import { z } from "zod";
import { type HttpClient } from "@/shared/lib/http-client";
import { StatementFileSchema } from "@/shared/data/statement-files";
import {
  CaseDetailSchema,
  CustomerContextSchema,
  IngestionSchema,
  ProcessingOptionsSchema,
  StartProcessingResultSchema,
  ValidationCheckSchema,
} from "../schemas/cases";
import { type CaseService } from "./case-service";
import { CASE_ENDPOINTS } from "./endpoints";

/** HTTP adapter. TODO(backend): file upload will be multipart (presigned URL) rather than metadata JSON. */
export function createHttpCaseService(http: HttpClient): CaseService {
  return {
    getCase: (id) => http.get(CASE_ENDPOINTS.detail(id), CaseDetailSchema),
    getIngestion: (id) => http.get(CASE_ENDPOINTS.ingestion(id), IngestionSchema),
    addFile: (id, file) => http.post(CASE_ENDPOINTS.files(id), file, StatementFileSchema),
    removeFile: async (id, fileId) => {
      await http.post(CASE_ENDPOINTS.removeFile(id), { fileId }, z.unknown());
    },
    updateContext: (id, context) => http.patch(CASE_ENDPOINTS.context(id), context, CustomerContextSchema),
    setAccountRole: async (id, accountId, role) => {
      await http.patch(CASE_ENDPOINTS.accountRole(id), { accountId, role }, z.unknown());
    },
    updateOptions: (id, options) => http.patch(CASE_ENDPOINTS.options(id), options, ProcessingOptionsSchema),
    validate: (id) => http.post(CASE_ENDPOINTS.validate(id), {}, z.array(ValidationCheckSchema)),
    startProcessing: (id) => http.post(CASE_ENDPOINTS.start(id), {}, StartProcessingResultSchema),
  };
}
