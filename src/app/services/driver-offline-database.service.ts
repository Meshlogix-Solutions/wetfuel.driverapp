import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import {
  CapacitorSQLite,
  SQLiteConnection,
  SQLiteDBConnection,
} from '@capacitor-community/sqlite';
import { DriverBootstrap, OfflineDriverEvent } from './driver-api.service';

interface JeepSqliteElement extends HTMLElement {
  componentOnReady?: () => Promise<JeepSqliteElement>;
  isStoreOpen: () => Promise<boolean>;
}

const DATABASE_NAME = 'wetfuel_driver';
const DATABASE_VERSION = 1;
const QUEUE_KEY = 'wetfuel_driver_event_queue';
const CACHE_KEY = 'wetfuel_driver_bootstrap';
const SELECTED_JOB_KEY = 'wetfuel_driver_selected_job';

@Injectable({ providedIn: 'root' })
export class DriverOfflineDatabaseService {
  private readonly sqlite = new SQLiteConnection(CapacitorSQLite);
  private database?: SQLiteDBConnection;
  private initialized = false;
  private readonly web = Capacitor.getPlatform() === 'web';

  async initialize(): Promise<void> {
    if (this.initialized) return;
    if (this.web) {
      await this.waitForWebStore();
      await this.sqlite.initWebStore();
    }

    const consistency = await this.sqlite.checkConnectionsConsistency();
    const existing = await this.sqlite.isConnection(DATABASE_NAME, false);
    this.database = consistency.result && existing.result
      ? await this.sqlite.retrieveConnection(DATABASE_NAME, false)
      : await this.sqlite.createConnection(DATABASE_NAME, false, 'no-encryption', DATABASE_VERSION, false);
    await this.database.open();
    await this.database.execute(`
      CREATE TABLE IF NOT EXISTS offline_events (
        sequence_number INTEGER PRIMARY KEY AUTOINCREMENT,
        client_event_id TEXT NOT NULL UNIQUE,
        aggregate_id TEXT NULL,
        event_type TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        occurred_at TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        attempt_count INTEGER NOT NULL DEFAULT 0,
        last_error TEXT NULL,
        created_at TEXT NOT NULL,
        synced_at TEXT NULL
      );
      CREATE INDEX IF NOT EXISTS ix_offline_events_status_sequence
        ON offline_events(status, sequence_number);
      CREATE INDEX IF NOT EXISTS ix_offline_events_aggregate
        ON offline_events(aggregate_id, sequence_number);
      CREATE TABLE IF NOT EXISTS app_state (
        state_key TEXT PRIMARY KEY NOT NULL,
        state_json TEXT NULL,
        updated_at TEXT NOT NULL
      );
      PRAGMA user_version = ${DATABASE_VERSION};
    `);
    this.initialized = true;
    await this.migrateLegacyStorage();
    await this.persistWebStore();
  }

  private async waitForWebStore(): Promise<void> {
    await this.withTimeout(
      customElements.whenDefined('jeep-sqlite'),
      'The browser SQLite component was not registered.',
    );

    const element = document.querySelector<JeepSqliteElement>('jeep-sqlite');
    if (!element) {
      throw new Error('The browser SQLite component is missing from the page.');
    }

    if (element.componentOnReady) {
      await this.withTimeout(
        element.componentOnReady(),
        'The browser SQLite component did not finish loading.',
      );
    }

    const deadline = Date.now() + 10000;
    while (!(await element.isStoreOpen())) {
      if (Date.now() >= deadline) {
        throw new Error('The browser SQLite store could not be opened.');
      }
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  private async withTimeout<T>(operation: Promise<T>, message: string): Promise<T> {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        operation,
        new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error(message)), 10000);
        }),
      ]);
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }

  get available(): boolean {
    return this.initialized && !!this.database;
  }

  async listPendingEvents(limit = 200): Promise<OfflineDriverEvent[]> {
    const db = this.requireDatabase();
    const result = await db.query(`
      SELECT client_event_id, aggregate_id, event_type, payload_json, occurred_at
      FROM offline_events
      WHERE status IN ('pending', 'failed')
      ORDER BY sequence_number
      LIMIT ?
    `, [limit]);
    return (result.values ?? []).map(row => ({
      clientEventId: String(row.client_event_id),
      aggregateId: row.aggregate_id ? String(row.aggregate_id) : undefined,
      eventType: String(row.event_type),
      payload: JSON.parse(String(row.payload_json || '{}')) as Record<string, unknown>,
      occurredAt: String(row.occurred_at),
    }));
  }

  async addEvent(event: OfflineDriverEvent): Promise<void> {
    const db = this.requireDatabase();
    await db.run(`
      INSERT OR IGNORE INTO offline_events
        (client_event_id, aggregate_id, event_type, payload_json, occurred_at, status, created_at)
      VALUES (?, ?, ?, ?, ?, 'pending', ?)
    `, [
      event.clientEventId, event.aggregateId ?? null, event.eventType,
      JSON.stringify(event.payload ?? {}), event.occurredAt, new Date().toISOString(),
    ]);
    await this.persistWebStore();
  }

  async deleteEvents(clientEventIds: string[]): Promise<void> {
    if (!clientEventIds.length) return;
    const placeholders = clientEventIds.map(() => '?').join(',');
    await this.requireDatabase().run(
      `DELETE FROM offline_events WHERE client_event_id IN (${placeholders})`,
      clientEventIds,
    );
    await this.persistWebStore();
  }

  async markFailed(clientEventIds: string[], error: string): Promise<void> {
    if (!clientEventIds.length) return;
    const placeholders = clientEventIds.map(() => '?').join(',');
    await this.requireDatabase().run(`
      UPDATE offline_events
      SET status = 'failed', attempt_count = attempt_count + 1, last_error = ?
      WHERE client_event_id IN (${placeholders})
    `, [error, ...clientEventIds]);
    await this.persistWebStore();
  }

  async setState(key: string, value: unknown): Promise<void> {
    await this.requireDatabase().run(`
      INSERT INTO app_state(state_key, state_json, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(state_key) DO UPDATE SET
        state_json = excluded.state_json,
        updated_at = excluded.updated_at
    `, [key, value == null ? null : JSON.stringify(value), new Date().toISOString()]);
    await this.persistWebStore();
  }

  async getState<T>(key: string): Promise<T | null> {
    const result = await this.requireDatabase().query(
      'SELECT state_json FROM app_state WHERE state_key = ? LIMIT 1',
      [key],
    );
    const raw = result.values?.[0]?.state_json;
    return raw == null ? null : JSON.parse(String(raw)) as T;
  }

  private async migrateLegacyStorage(): Promise<void> {
    const migrated = await this.getState<boolean>('legacy_storage_migrated');
    if (migrated) return;

    const queue = this.readLegacy<OfflineDriverEvent[]>(QUEUE_KEY, []);
    for (const event of queue) await this.addEvent(event);
    const bootstrap = this.readLegacy<DriverBootstrap | null>(CACHE_KEY, null);
    if (bootstrap) await this.setState('bootstrap', bootstrap);
    const selectedJobId = localStorage.getItem(SELECTED_JOB_KEY);
    if (selectedJobId) await this.setState('selected_job_id', selectedJobId);

    await this.setState('legacy_storage_migrated', true);
    localStorage.removeItem(QUEUE_KEY);
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(SELECTED_JOB_KEY);
  }

  private readLegacy<T>(key: string, fallback: T): T {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) as T : fallback;
    } catch {
      return fallback;
    }
  }

  private requireDatabase(): SQLiteDBConnection {
    if (!this.database || !this.initialized) throw new Error('Offline database has not been initialized.');
    return this.database;
  }

  private async persistWebStore(): Promise<void> {
    if (this.web) await this.sqlite.saveToStore(DATABASE_NAME);
  }
}
