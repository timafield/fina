import { ValidatedStockRequest } from '../commands/fetchStock.js';
import { StorageSecurityBar } from '../services/cache/ICache.js';

/**
 * An object that describes the provider's plan for fulfilling a fetch request.
 * Most importantly, it includes an estimate of the number of API calls required.
 */
export interface FetchPlan {
  estimatedApiCallCount: number;
  estimatedTime: number;
}

export class MissingFeatureError extends Error {}

/**
 * Defines the contract for any data provider implementation (e.g., Alpha Vantage, Polygon).
 * This ensures the command handler can interact with any data source in a consistent way.
 */
export interface IDataProvider {
  readonly name: string;

  /**
   * Fetches historical stock data based on the user's request.
   * This method is responsible for handling any API-specific logic, like pagination
   * or converting the API response into the standardized StockDataPoint format.
   * @param request - The validated user request.
   * @returns A promise that resolves to an array of standardized stock data points.
   */
  getHistory(request: ValidatedStockRequest): Promise<StorageSecurityBar[]>;

  /**
   * Analyzes a user request and returns a plan for how it would be executed,
   * focusing on the number of API calls that would be made.
   * @param request - The validated user request detailing what data is missing from the cache.
   * @returns A promise that resolves to a FetchPlan object.
   */
  planFetch(request: ValidatedStockRequest): Promise<FetchPlan>;
}