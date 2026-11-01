}

  // ---- public factory for external consumption ----
  const backend = new DemoBackend();
  (globalThis as unknown as Record<string, unknown>).demoBackend = backend;
  return backend;
}

// Singleton exported for convenience; real apps plug in SupabaseBackend instead.
export const demoBackend = new DemoBackend()
