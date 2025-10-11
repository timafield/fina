import { Dayjs } from 'dayjs';
import { ValidatedStockRequest } from '../../commands/fetchStock';

/**
 * Defines the standardized structure for a single historical stock data point.
 * All providers must return data in this format, and it will be stored this way in the cache.
 */
export interface StockDataPoint {
  ticker: string;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adjClose?: number;
}

/**
 * A simple object to represent a continuous range of dates.
 */
export interface DateRange {
  startDate: Dayjs;
  endDate: Dayjs;
}

/**
 * An object that describes which parts of a user's request are already
 * present in the cache and which parts are missing.
 */
export interface CacheCoverage {
  cachedRanges: DateRange[];
  missingRanges: DateRange[];
}

/**
 * Defines the contract for any cache implementation (e.g., SQLite, in-memory).
 * This ensures that the command handler can interact with the cache in a consistent way.
 */
export interface ICacheService {
  /**
   * Retrieves all available stock data from the cache that falls within the
   * date range specified in the request.
   * @param request - The validated user request.
   * @returns A promise that resolves to an array of cached data points.
   */
  getStockData(request: ValidatedStockRequest): Promise<StockDataPoint[]>;

  /**
   * Writes an array of new data points to the cache.
   * This method should handle upserting (inserting or updating) data to avoid duplicates.
   * @param dataPoints - The new data points to be stored.
   * @returns A promise that resolves when the operation is complete.
   */
  updateStockData(dataPoints: StockDataPoint[]): Promise<void>;

  /**
   * Analyzes the cache to determine which portions of a request are already stored
   * and which portions need to be fetched from a provider.
   * @param request - The validated user request.
   * @returns A promise that resolves to a CacheCoverage object detailing the missing date ranges.
   */
  analyzeCacheCoverage(request: ValidatedStockRequest): Promise<CacheCoverage>;
}
