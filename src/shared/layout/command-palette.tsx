"use client";

import { Command } from "cmdk";
import { Dialog } from "radix-ui";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useUiStore } from "./ui-store";

export interface CommandItem {
  id: string;
  label: string;
  hint?: string;
  href: string;
  keywords?: readonly string[];
}

export interface CommandGroup {
  heading: string;
  items: readonly CommandItem[];
}

export function CommandPalette({ groups }: { groups: readonly CommandGroup[] }) {
  const open = useUiStore((s) => s.commandOpen);
  const setOpen = useUiStore((s) => s.setCommandOpen);
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(!useUiStore.getState().commandOpen);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed top-[12vh] left-1/2 z-50 w-[min(640px,calc(100vw-2rem))] -translate-x-1/2 overflow-hidden rounded-xl border border-border-strong bg-surface-2 shadow-card">
          <Dialog.Title className="sr-only">Search</Dialog.Title>
          <Dialog.Description className="sr-only">Search customers, cases, accounts and screens</Dialog.Description>
          <Command label="Global search" loop>
            <div className="flex items-center gap-2 border-b border-border px-4">
              <Search className="size-4 text-subtle" aria-hidden />
              <Command.Input autoFocus placeholder="Search customer, case, account no..." className="h-12 flex-1 bg-transparent text-sm text-fg outline-none placeholder:text-subtle" />
              <kbd className="num rounded border border-border-strong px-1.5 text-[10px] text-subtle">ESC</kbd>
            </div>
            <Command.List className="scrollbar-thin max-h-[50vh] overflow-y-auto p-2">
              <Command.Empty className="px-3 py-6 text-center text-sm text-muted">No matches.</Command.Empty>
              {groups.map((g) => (
                <Command.Group key={g.heading} heading={g.heading} className="mb-1 [&_[cmdk-group-heading]]:label-micro [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5">
                  {g.items.map((item) => (
                    <Command.Item
                      key={item.id}
                      value={`${item.label} ${item.hint ?? ""} ${item.id}`}
                      keywords={item.keywords ? [...item.keywords] : undefined}
                      onSelect={() => {
                        setOpen(false);
                        router.push(item.href);
                      }}
                      className="flex cursor-pointer items-center justify-between gap-3 rounded-md px-2.5 py-2 text-sm text-fg data-[selected=true]:bg-surface-3"
                    >
                      <span className="truncate">{item.label}</span>
                      {item.hint ? <span className="num shrink-0 text-xs text-subtle">{item.hint}</span> : null}
                    </Command.Item>
                  ))}
                </Command.Group>
              ))}
            </Command.List>
          </Command>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
