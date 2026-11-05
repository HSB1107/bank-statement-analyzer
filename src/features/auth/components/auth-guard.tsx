"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { LoadingState } from "@/shared/ui/states";
import { useSession } from "../hooks/use-auth";

/** Client-side guard for the authenticated area (frontend-only prototype). */
export function AuthGuard({ children }: { children: ReactNode }) {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    if (!isPending && !session) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [isPending, session, router, pathname]);
  if (isPending || !session) return <LoadingState label="Checking your session…" className="min-h-dvh" />;
  return <>{children}</>;
}
