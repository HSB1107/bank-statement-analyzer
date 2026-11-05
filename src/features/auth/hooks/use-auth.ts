"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useService } from "@/shared/lib/di-react";
import { AuthServiceToken } from "../services/auth-service";

export const authKeys = {
  session: ["auth", "session"] as const,
  tenants: ["auth", "tenants"] as const,
  showcase: ["auth", "showcase"] as const,
};

export function useSession() {
  const svc = useService(AuthServiceToken);
  return useQuery({ queryKey: authKeys.session, queryFn: () => svc.getSession(), staleTime: Infinity });
}

export function useTenants() {
  const svc = useService(AuthServiceToken);
  return useQuery({ queryKey: authKeys.tenants, queryFn: () => svc.listTenants() });
}

export function useShowcase() {
  const svc = useService(AuthServiceToken);
  return useQuery({ queryKey: authKeys.showcase, queryFn: () => svc.getShowcase(), staleTime: Infinity });
}

export function useSignIn() {
  const svc = useService(AuthServiceToken);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tenantId: string) => svc.signIn({ tenantId }),
    onSuccess: (session) => qc.setQueryData(authKeys.session, session),
  });
}

export function useSignOut() {
  const svc = useService(AuthServiceToken);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => svc.signOut(),
    onSuccess: () => {
      qc.setQueryData(authKeys.session, null);
      qc.removeQueries({ predicate: (q) => q.queryKey[0] !== "auth" });
    },
  });
}
