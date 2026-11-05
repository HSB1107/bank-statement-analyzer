"use client";

import { Upload } from "lucide-react";
import { useRef, useState, type DragEvent } from "react";
import { cn } from "@/shared/lib/cn";
import { formatFileSize } from "@/shared/lib/format";
import { type StatementFile } from "@/shared/data/statement-files";
import { type StatementFileId } from "@/shared/data/schemas/ids";
import { Chip } from "@/shared/ui/chip";
import { Panel } from "@/shared/ui/panel";
import { FileCard } from "./file-card";

const ACCEPT = ".pdf,.xls,.xlsx,.csv,.png,.jpg,.jpeg,.tiff";

export function UploadPanel({
  files,
  accounts,
  onAdd,
  onRemove,
  removingId,
}: {
  files: readonly StatementFile[];
  accounts: number;
  onAdd: (files: { name: string; sizeBytes: number }[]) => void;
  onRemove: (id: StatementFileId) => void;
  removingId: string | null;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const total = files.reduce((a, f) => a + f.sizeBytes, 0);
  const take = (list: FileList | null) => {
    if (!list) return;
    onAdd([...list].map((f) => ({ name: f.name, sizeBytes: Math.max(1, f.size) })));
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    take(e.dataTransfer.files);
  };
  return (
    <Panel
      title="Upload Bank Statements"
      meta={`${files.length} files · ${accounts} accounts · ${formatFileSize(total)}`}
      actions={
        <span className="num text-xs text-subtle">PDF · XLS · XLSX · CSV · PNG · JPG · JPEG · TIFF</span>
      }
    >
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "mb-4 flex flex-wrap items-center gap-4 rounded-xl border border-dashed px-5 py-5 transition-colors",
          dragging ? "border-lime bg-lime/10" : "border-lime/40 bg-lime/[0.03]",
        )}
      >
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="grid size-12 shrink-0 place-items-center rounded-lg border border-lime/50 text-lime hover:bg-lime/10"
          aria-label="Choose statement files to upload"
        >
          <Upload className="size-5" aria-hidden />
        </button>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-fg">Drop statements for one or many accounts</p>
          <p className="text-sm text-muted">
            Mix banks, formats and periods — bank, account, holder, type, currency and period are detected
            automatically. Password-protected PDFs prompt once.
          </p>
        </div>
        <Chip tone="magenta" variant="outline" mono size="xs">
          ◆ Auto-identify on
        </Chip>
        <input
          ref={input}
          type="file"
          multiple
          accept={ACCEPT}
          className="sr-only"
          onChange={(e) => take(e.target.files)}
          tabIndex={-1}
          aria-hidden
        />
      </div>
      <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" aria-label="Uploaded files">
        {files.map((f) => (
          <FileCard key={f.id} file={f} removing={removingId === f.id} onRemove={() => onRemove(f.id)} />
        ))}
      </ul>
    </Panel>
  );
}
