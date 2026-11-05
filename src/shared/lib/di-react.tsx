"use client";

import { createContext, useContext, type ReactNode } from "react";
import { type ServiceRegistry, type ServiceToken } from "./di";

const RegistryContext = createContext<ServiceRegistry | null>(null);

export function ServiceRegistryProvider({
  registry,
  children,
}: {
  registry: ServiceRegistry;
  children: ReactNode;
}) {
  return <RegistryContext.Provider value={registry}>{children}</RegistryContext.Provider>;
}

export function useService<T>(token: ServiceToken<T>): T {
  const registry = useContext(RegistryContext);
  if (!registry) throw new Error("useService must be used inside <ServiceRegistryProvider>.");
  return registry.resolve(token);
}
