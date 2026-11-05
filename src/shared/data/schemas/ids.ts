import { type z } from "zod";
import { brandedId } from "@/shared/lib/brand";

export const CaseIdSchema = brandedId("CaseId", /^BSA-\d{2}-\d{5}$/);
export type CaseId = z.infer<typeof CaseIdSchema>;

export const CustomerIdSchema = brandedId("CustomerId", /^CUST-[A-Z]{2}-(R-)?\d{6}$/);
export type CustomerId = z.infer<typeof CustomerIdSchema>;

export const AccountIdSchema = brandedId("AccountId");
export type AccountId = z.infer<typeof AccountIdSchema>;

export const TransactionIdSchema = brandedId("TransactionId");
export type TransactionId = z.infer<typeof TransactionIdSchema>;

export const StatementFileIdSchema = brandedId("StatementFileId");
export type StatementFileId = z.infer<typeof StatementFileIdSchema>;

export const SignalIdSchema = brandedId("SignalId", /^RS-[A-Z]-\d{2}$/);
export type SignalId = z.infer<typeof SignalIdSchema>;

export const CounterpartyIdSchema = brandedId("CounterpartyId");
export type CounterpartyId = z.infer<typeof CounterpartyIdSchema>;

export const AuditEntryIdSchema = brandedId("AuditEntryId");
export type AuditEntryId = z.infer<typeof AuditEntryIdSchema>;

export const JobIdSchema = brandedId("JobId");
export type JobId = z.infer<typeof JobIdSchema>;
