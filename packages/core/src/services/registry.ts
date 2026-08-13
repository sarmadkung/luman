import type { PluginManager } from '../plugins';
import type { CleanupService } from './cleanup-service';
import type { RecommendationService } from './recommendation-service';
import type { ScannerService } from './scanner-service';
import type { StorageService } from './storage-service';
import type { HistoryService } from './history-service';
import type { VolumeService } from './volume-service';
import type { PermissionService } from './permission-service';
import type { ScanEngine } from './scan-engine';
import type { EventBus } from './event-bus';
import type { SafetyGate } from './safety-gate';
import type {
  ScanRepository,
  FindingRepository,
  CleanupHistoryRepository,
  SettingsRepository,
} from './repositories';
import { StubVolumeService } from './volume-service';
import { StubPermissionService } from './permission-service';
import { StubScanEngine } from './scan-engine';
import { StubEventBus } from './event-bus';
import { DenyAllSafetyGate } from './safety-gate';
import {
  StubScanRepository,
  StubFindingRepository,
  StubCleanupHistoryRepository,
  StubSettingsRepository,
} from './repositories';
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

  /* Sprint 04 infrastructure contracts (INF-003). Every one is a stub here.
   *
   * Anything added to this interface must survive the spread in
   * apps/desktop/src/services/createAppServices, which overrides only storage,
   * recommendations, and history — a required field with no default in
   * createServices() would break that call site. */
  readonly volumes: VolumeService;
  readonly permissions: PermissionService;
  readonly scanEngine: ScanEngine;
  readonly events: EventBus;
  readonly safety: SafetyGate;
  readonly scanRepository: ScanRepository;
  readonly findingRepository: FindingRepository;
  readonly cleanupHistoryRepository: CleanupHistoryRepository;
  readonly settingsRepository: SettingsRepository;
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
    volumes: new StubVolumeService(),
    permissions: new StubPermissionService(),
    scanEngine: new StubScanEngine(),
    events: new StubEventBus(),
    safety: new DenyAllSafetyGate(),
    scanRepository: new StubScanRepository(),
    findingRepository: new StubFindingRepository(),
    cleanupHistoryRepository: new StubCleanupHistoryRepository(),
    settingsRepository: new StubSettingsRepository(),
  };
}
