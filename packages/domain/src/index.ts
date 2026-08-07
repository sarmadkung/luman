/**
 * @luman/domain — the vocabulary of the product.
 *
 * These are pure data models and enums only. There is deliberately **no**
 * behavior here: business rules live in the application/domain services
 * (packages/core), not on the models. See docs-ai/ARCHITECTURE.md.
 */
export * from './models/scan';
export * from './models/finding';
export * from './models/cleanup-action';
export * from './models/plugin';
export * from './models/recommendation';
