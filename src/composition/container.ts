import { AuthServiceToken, createHttpAuthService, createMockAuthService } from "@/features/auth";
import {
  createHttpTransactionService,
  createMockTransactionService,
  TransactionServiceToken,
} from "@/features/transactions";
import {
  createHttpProcessingService,
  createMockProcessingService,
  ProcessingServiceToken,
} from "@/features/processing";
import { CaseServiceToken, createHttpCaseService, createMockCaseService } from "@/features/cases";
import {
  createHttpDashboardService,
  createMockDashboardService,
  DashboardServiceToken,
} from "@/features/dashboard";
import { createAuditLog } from "@/shared/data/audit-log";
import { assertNever } from "@/shared/lib/assert";
import { resolveDataSource, type DataSource } from "@/shared/lib/data-source";
import { ServiceRegistry } from "@/shared/lib/di";
import { createHttpClient } from "@/shared/lib/http-client";
import { createMockRuntime } from "@/shared/lib/mock-runtime";

/**
 * Composition root — the only module that knows concrete adapters.
 * NEXT_PUBLIC_DATA_SOURCE=mock|http selects the implementation for every port.
 */
export function createContainer(source: DataSource = resolveDataSource()): ServiceRegistry {
  const registry = new ServiceRegistry();
  switch (source) {
    case "mock": {
      const runtime = createMockRuntime({ latencyMs: [180, 480] });
      const audit = createAuditLog();
      registry.bind(AuthServiceToken, createMockAuthService(runtime, audit));
      bindMockFeatures(registry, runtime, audit);
      return registry;
    }
    case "http": {
      const http = createHttpClient();
      registry.bind(AuthServiceToken, createHttpAuthService(http));
      bindHttpFeatures(registry, http);
      return registry;
    }
    default:
      return assertNever(source, "data source");
  }
}

// Feature bindings are appended per phase.
function bindMockFeatures(
  registry: ServiceRegistry,
  runtime: ReturnType<typeof createMockRuntime>,
  audit: ReturnType<typeof createAuditLog>,
): void {
  registry.bind(DashboardServiceToken, createMockDashboardService(runtime));
  registry.bind(CaseServiceToken, createMockCaseService(runtime, audit));
  registry.bind(ProcessingServiceToken, createMockProcessingService(runtime));
  registry.bind(TransactionServiceToken, createMockTransactionService(runtime, audit));
}

function bindHttpFeatures(registry: ServiceRegistry, http: ReturnType<typeof createHttpClient>): void {
  registry.bind(DashboardServiceToken, createHttpDashboardService(http));
  registry.bind(CaseServiceToken, createHttpCaseService(http));
  registry.bind(ProcessingServiceToken, createHttpProcessingService(http));
  registry.bind(TransactionServiceToken, createHttpTransactionService(http));
}
