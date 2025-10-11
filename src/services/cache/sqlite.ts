import { ICacheService, CacheCoverage, DateRange, StockDataPoint } from './ICache';
import { ValidatedStockRequest } from '../../commands/fetchStock';
import { AppConfig } from '../../utils/config';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { createLogger, Logger } from '../../utils/logger';

interface Migration {
  name: string;
  sql: string;
}

/**
 * An array of all database migrations. New schema changes are added here.
 * The `runMigrations` function will apply these in order.
 */
const MIGRATIONS: Migration[] = [
  {
    name: '001-initial-schema.sql',
    sql: `
      CREATE TABLE stock_data (
        ticker TEXT NOT NULL,
        date TEXT NOT NULL,
        open REAL NOT NULL,
        high REAL NOT NULL,
        low REAL NOT NULL,
        close REAL NOT NULL,
        volume INTEGER NOT NULL,
        adjClose REAL,
        PRIMARY KEY (ticker, date)
      );

      CREATE INDEX idx_stock_data_ticker_date ON stock_data (ticker, date);
    `,
  },
];

/**
 * A concrete implementation of ICacheService that uses an SQLite database for storage.
 */
export class SqliteCacheService implements ICacheService {
  private db: Database.Database;
  private readonly logger: Logger = createLogger('SqliteCacheService');

  constructor(config: AppConfig | null) {
    const dbPath = config?.cache?.databasePath || '~/.fina/cache.sqlite';

    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(dbPath, { verbose: console.log });
    this.logger.debug(`(Cache) Connected to SQLite database at: ${dbPath}`);
    this.runMigrations();
  }

  /**
   * Applies database migrations from the './migrations' directory to ensure the schema is up to date.
   * This is a self-contained implementation with no external dependencies.
   */
  private runMigrations(): void {
    this.logger.debug('(Cache) Checking for and applying database migrations...');

    // 1. Create the migrations table if it doesn't exist
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const appliedMigrations = this.db.prepare('SELECT name FROM migrations ORDER BY name').all().map((row) => (row as { name: string; }).name);

    const migrationsToRun = MIGRATIONS.filter(m => !appliedMigrations.includes(m.name));

    if (migrationsToRun.length === 0) {
      this.logger.debug('(Cache) Database is up to date.');
      return;
    }

    const migrateTx = this.db.transaction(() => {
      for (const migration of migrationsToRun) {
        try {
          this.logger.info(`(Cache) Applying migration: ${migration.name}`);
          this.db.exec(migration.sql);
          this.db.prepare('INSERT INTO migrations (name) VALUES (?)').run(migration.name);
        } catch (error) {
          this.logger.error(`❌ Migration failed on: ${migration.name}`);
          throw error;
        }
      }
    });

    migrateTx();
    this.logger.info(`(Cache) Successfully applied ${migrationsToRun.length} migration(s).`);
  }

  /**
   * Retrieves stock data from the cache for a given request.
   */
  async getStockData(request: ValidatedStockRequest): Promise<StockDataPoint[]> {
    const sql = `
      SELECT * FROM stock_data
      WHERE ticker IN (${request.tickers.map(() => '?').join(', ')})
      AND date >= ? AND date <= ?
      ORDER BY date ASC;
    `;
    
    const params = [
      ...request.tickers,
      request.startDate.format('YYYY-MM-DD'),
      request.endDate.format('YYYY-MM-DD'),
    ];
    
    const stmt = this.db.prepare(sql);
    return stmt.all(params) as StockDataPoint[];
  }

  /**
   * Writes new data points to the cache using an efficient UPSERT operation.
   */
  async updateStockData(dataPoints: StockDataPoint[]): Promise<void> {
    if (dataPoints.length === 0) return;

    const insertSql = `
      INSERT OR REPLACE INTO stock_data (ticker, date, open, high, low, close, volume, adjClose)
      VALUES (@ticker, @date, @open, @high, @low, @close, @volume, @adjClose);
    `;
    const insertStmt = this.db.prepare(insertSql);

    const insertMany = this.db.transaction((points) => {
      for (const point of points) {
        insertStmt.run(point);
      }
    });

    insertMany(dataPoints);
  }

  /**
   * Analyzes the cache to find which date ranges are missing for each ticker in a given request.
   */
  async analyzeCacheCoverage(request: ValidatedStockRequest): Promise<CacheCoverage> {
    const missingRangesByTicker = new Map<string, DateRange[]>();

    const sql = `SELECT date FROM stock_data WHERE ticker = ? AND date >= ? AND date <= ? ORDER BY date ASC;`;
    const stmt = this.db.prepare(sql);

    for (const ticker of request.tickers) {
      const params = [
        ticker,
        request.startDate.format('YYYY-MM-DD'),
        request.endDate.format('YYYY-MM-DD'),
      ];
      
      const results: { date: string }[] = stmt.all(params) as { date: string }[];
      const cachedDates = new Set(results.map(row => row.date));
      const tickerMissingRanges: DateRange[] = [];
      let currentDay = request.startDate.clone();
      
      while (currentDay.isBefore(request.endDate) || currentDay.isSame(request.endDate)) {
        const dateStr = currentDay.format('YYYY-MM-DD');

        if (!cachedDates.has(dateStr)) {
          const rangeStart = currentDay.clone();

          while ((currentDay.isBefore(request.endDate) || currentDay.isSame(request.endDate)) && !cachedDates.has(currentDay.format('YYYY-MM-DD'))) {
            currentDay = currentDay.add(1, 'day');
          }
          const rangeEnd = currentDay.subtract(1, 'day');
          tickerMissingRanges.push({ startDate: rangeStart, endDate: rangeEnd });
        } else {
          currentDay = currentDay.add(1, 'day');
        }
      }
      
      if (tickerMissingRanges.length > 0) {
        missingRangesByTicker.set(ticker, tickerMissingRanges);
      }
    }
    
    return { missingRangesByTicker };
  }
}
