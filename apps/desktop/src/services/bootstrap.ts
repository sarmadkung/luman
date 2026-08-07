import type { Services } from '@luman/core';
import { AppError } from '@luman/core';
import { openDatabase, isTauri } from '../database';

/**
 * One-time application initialization. Deliberately side-effect-light in
 * Sprint 1: it initializes the database (when running natively) and runs plugin
 * discovery (which finds nothing yet). No scanning or cleanup is triggered.
 */
export async function bootstrap(services: Services): Promise<void> {
  const log = services.logger.child({ scope: 'bootstrap' });
  log.info('Starting Luman');

  if (isTauri()) {
    try {
      const db = await openDatabase();
      // Prove the schema initialized without leaking a query layer into the UI.
      await db.select("SELECT name FROM sqlite_master WHERE type = 'table'");
      log.info('Database initialized');
    } catch (cause) {
      throw new AppError('Database initialization failed', {
        code: 'DATABASE_INIT_FAILED',
        userMessage: 'Luman could not open its local database.',
        cause,
      });
    }
  } else {
    log.warn('Running outside Tauri; skipping native database initialization');
  }

  await services.plugins.discover();
  log.info('Bootstrap complete');
}
