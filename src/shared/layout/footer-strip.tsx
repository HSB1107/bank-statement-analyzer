export function FooterStrip({ page }: { page?: string }) {
  return (
    <footer className="label-micro flex flex-col gap-1 border-t border-border px-6 py-3 text-[10px] sm:flex-row sm:justify-between">
      <span>FinnOne Neo · Bank Statement Analyzer · Prototype Pass 1</span>
      <span>Demo data · Arjun Mehta · Meridian Precision (fictional){page ? ` · ${page}` : ""}</span>
    </footer>
  );
}
