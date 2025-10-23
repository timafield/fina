import { ICacheService } from './ICache.js';
import { AppConfig } from '../../utils/config.js';
import { SqliteCacheService } from './sqlite.js';

export class CacheFactory {
  private static instance: ICacheService | null = null;

  /**
   * Creates and returns a singleton instance of the configured cache service.
   * @param config - The application's configuration object.
   * @returns An instance of a class that implements ICacheService.
   */
  public static create(config: AppConfig | null): ICacheService {
    if (this.instance) {
      return this.instance;
    }

    const cacheType = config?.cache?.type || 'sqlite';

    switch (cacheType) {
      case 'sqlite':
        this.instance = new SqliteCacheService(config);
        break;
      case 'in-memory':
        throw new Error('Not implemented.');
      case 'flat-file':
        throw new Error('Not implemented.');
      // case 'mysql':
      //   throw new Error('Not implemented.');
      // case 'postgres':
      //   throw new Error('Not implemented.');
      // case 'timescaledb':
      //   throw new Error('Not implemented.');
      // case 'redis':
      //   throw new Error('Not implemented.');
      default:
        throw new Error(`Unsupported cache type: "${cacheType}"`);
    }

    return this.instance;
  }
}