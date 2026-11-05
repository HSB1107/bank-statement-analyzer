import { resolveDataSource } from "@/shared/lib/data-source";
import { ServiceRegistry } from "@/shared/lib/di";

/**
 * Composition root: the only place that knows about concrete adapters.
 * NEXT_PUBLIC_DATA_SOURCE=mock|http selects the implementation for every port.
 */
export function createContainer(): ServiceRegistry {
  const source = resolveDataSource();
  const registry = new ServiceRegistry();
  void source;
  return registry;
}
