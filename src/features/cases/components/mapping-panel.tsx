"use client";

import { formatCroreValue, formatIndianNumber, NA_SHORT } from "@/shared/lib/format";
import { toMajor, type Money } from "@/shared/lib/money";
import { AccountRoleSchema, type AccountRole } from "@/shared/data/schemas/customer";
import { type AccountId } from "@/shared/data/schemas/ids";
import { Chip } from "@/shared/ui/chip";
import { Panel } from "@/shared/ui/panel";
import { FilterSelect } from "@/shared/ui/select";
import { Table, Td, Th } from "@/shared/ui/table";
import { type Ingestion } from "../schemas/cases";

const ROLE_LABEL: Readonly<Record<AccountRole, string>> = {
  operating_primary: "Operating · Primary",
  collections_secondary: "Collections · Sec.",
  od_cc: "OD / CC",
  salary: "Salary · Primary",
  savings: "Savings",
};

export function MappingPanel({
  ingestion,
  corporate,
  onRole,
}: {
  ingestion: Ingestion;
  corporate: boolean;
  onRole: (accountId: AccountId, role: AccountRole) => void;
}) {
  const fmt = (m: Ingestion["mapping"][number]["opening"]) => {
    if (m.status !== "available") return NA_SHORT;
    const v: Money = m.value;
    return corporate ? formatCroreValue(v) : formatIndianNumber(toMajor(v));
  };
  const currencies = new Set(ingestion.mapping.map((m) => m.currency)).size;
  return (
    <Panel
      title="Bank Identification & Account Mapping"
      meta="AI-detected · editable"
      actions={
        <Chip tone="info" variant="outline">
          {ingestion.mapping.length} accounts · {currencies} currency
        </Chip>
      }
    >
      <Table>
        <thead>
          <tr>
            <Th>Bank</Th>
            <Th>Account</Th>
            <Th>Type</Th>
            <Th>Ccy</Th>
            <Th>Period</Th>
            <Th align="right">Open {corporate ? "₹cr" : "₹"}</Th>
            <Th align="right">Close {corporate ? "₹cr" : "₹"}</Th>
            <Th>Role</Th>
          </tr>
        </thead>
        <tbody>
          {ingestion.mapping.map((m) => (
            <tr key={m.accountId}>
              <Td className="font-medium text-fg">{m.bankName}</Td>
              <Td className="num text-muted">{m.maskedAccount}</Td>
              <Td className="text-muted">{m.typeLabel}</Td>
              <Td className="num text-muted">{m.currency}</Td>
              <Td className="num text-muted">{m.periodLabel}</Td>
              <Td align="right" className="num text-fg">
                {fmt(m.opening)}
              </Td>
              <Td align="right" className="num text-fg">
                {fmt(m.closing)}
              </Td>
              <Td>
                <FilterSelect
                  ariaLabel={`Role for ${m.bankName} ${m.maskedAccount}`}
                  size="sm"
                  value={m.role}
                  options={AccountRoleSchema.options.map((r) => ({ value: r, label: ROLE_LABEL[r] }))}
                  onValueChange={(r) => onRole(m.accountId, r)}
                />
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
      {ingestion.mappingNote ? <p className="mt-3 text-xs text-subtle">{ingestion.mappingNote}</p> : null}
    </Panel>
  );
}
