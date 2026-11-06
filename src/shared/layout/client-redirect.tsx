"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Client-side redirect (static exports have no server redirects). basePath is applied by the router. */
export function ClientRedirect({ to }: { to: string }) {
  const router = useRouter();
  useEffect(() => {
    router.replace(to);
  }, [router, to]);
  return (
    <p role="status" className="p-8 text-sm text-muted">
      Redirecting…{" "}
      <Link href={to} className="text-info underline">
        Continue
      </Link>
    </p>
  );
}
