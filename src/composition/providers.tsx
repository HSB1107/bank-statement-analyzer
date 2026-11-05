"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useState, type ReactNode } from "react";
import { ServiceRegistryProvider } from "@/shared/lib/di";
import { TooltipProvider } from "@/shared/ui/tooltip";
import { createContainer } from "./container";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 60_000, retry: 1, refetchOnWindowFocus: false },
          mutations: { retry: 0 },
        },
      }),
  );
  const [registry] = useState(() => createContainer());
  return (
    <ThemeProvider attribute="data-theme" defaultTheme="dark" themes={["dark", "light"]} enableSystem={false} disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <ServiceRegistryProvider registry={registry}>
          <TooltipProvider>{children}</TooltipProvider>
        </ServiceRegistryProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
