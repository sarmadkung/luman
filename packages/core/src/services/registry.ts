import type { PluginManager } from '../plugins';
import type { CleanupService } from './cleanup-service';
import type { RecommendationService } from './recommendation-service';
import type { ScannerService } from './scanner-service';
import type { StorageService } from './storage-service';
import type { HistoryService } from './history-service';
import { StubCleanupService } from './cleanup-service';
import { StubRecommendationService } from './recommendation-service';
import { StubScannerService } from './scanner-service';
import { StubStorageService } from './storage-service';
import { StubHistoryService } from './history-service';
import { InMemoryPluginManager } from '../plugins';
import type { Logger } from '../logging';
import { ConsoleLogger } from '../logging';

/**
 * The set of services the UI depends on. Wiring lives behind this one object so
 * pages never construct concrete implementations themselves — they consume the
 * interfaces. Sprint 03 supplies mock implementations behind these same
 * contracts; Sprints 05-06 swap in real adapters without touching the UI.
 */
export interface Services {
  readonly logger: Logger;
  readonly scanner: ScannerService;
  readonly cleanup: CleanupService;
  readonly storage: StorageService;
  readonly recommendations: RecommendationService;
  readonly history: HistoryService;
  readonly plugins: PluginManager;
}

export interface CreateServicesOptions {
  readonly logger?: Logger;
}

/** Build the default service graph (all stubs). */
export function createServices(options: CreateServicesOptions = {}): Services {
  const logger = options.logger ?? new ConsoleLogger({ bindings: { scope: 'app' } });
  return {
    logger,
    scanner: new StubScannerService(),
    cleanup: new StubCleanupService(),
    storage: new StubStorageService(),
    recommendations: new StubRecommendationService(),
    history: new StubHistoryService(),
    plugins: new InMemoryPluginManager(logger.child({ scope: 'plugins' })),
  };
}
