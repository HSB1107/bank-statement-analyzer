/**
 * Minimal typed service registry. Features declare tokens for their ports, the
 * composition root (src/composition) binds adapters, and hooks resolve them via
 * `useService` (see di-react.tsx). Each token owns a typed WeakMap keyed by registry,
 * so no casts are needed.
 */
export interface ServiceToken<T> {
  readonly name: string;
  readonly bindings: WeakMap<ServiceRegistry, T>;
}

export function createServiceToken<T>(name: string): ServiceToken<T> {
  return { name, bindings: new WeakMap<ServiceRegistry, T>() };
}

export class ServiceRegistry {
  bind<T>(token: ServiceToken<T>, impl: T): this {
    token.bindings.set(this, impl);
    return this;
  }

  resolve<T>(token: ServiceToken<T>): T {
    const impl = token.bindings.get(this);
    if (impl === undefined) {
      throw new Error(`No adapter bound for service "${token.name}". Check src/composition/container.ts.`);
    }
    return impl;
  }
}
