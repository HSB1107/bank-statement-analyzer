import { type CategoryGroup, type CategoryId } from "@/shared/data/schemas/category";
import { Chip } from "@/shared/ui/chip";
import { type Tone } from "@/shared/ui/tone";

const GROUP_TONE: Readonly<Record<CategoryGroup, Tone>> = {
  income: "positive",
  transfer: "info",
  obligation: "warning",
  fixed_expense: "indigo",
  investment: "lime",
  living: "neutral",
  business_outflow: "magenta",
  charges: "negative",
  uncategorised: "positive",
};
const CATEGORY_TONE: Partial<Record<CategoryId, Tone>> = {
  gst: "indigo",
  tds: "indigo",
  epf_esic: "indigo",
  od_drawdown: "info",
  od_repayment: "info",
};

export function CategoryChip({
  category,
  group,
  label,
}: {
  category: CategoryId;
  group: CategoryGroup;
  label: string;
}) {
  return (
    <Chip tone={CATEGORY_TONE[category] ?? GROUP_TONE[group]} variant="outline">
      {label}
    </Chip>
  );
}
