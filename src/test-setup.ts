// Test setup for Vitest jsdom environment.
// Only enable matchers when @testing-library/jest-dom is available in node_modules.
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@testing-library/jest-dom/vitest');
} catch {
  // In CI or a partial install, fall back gracefully; the unit tests do not
  // depend on jest-dom matchers.
}
