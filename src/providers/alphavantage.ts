import { ValidatedStockRequest } from '../commands/fetchStock';
import { StockDataPoint } from '../services/cache/ICache';
import { FetchPlan, IDataProvider } from './IProvider';


export class AlphaVantageProvider implements IDataProvider {
  public readonly name = 'alphavantage';
  private apiKey: string;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('Alpha Vantage API key is required.');
    }
    this.apiKey = apiKey;
  }

  async getHistory(request: ValidatedStockRequest): Promise<StockDataPoint[]> {
    console.log(`(Provider) [TODO] Fetching data from Alpha Vantage for ${request.tickers.join(', ')}.`);
    // TODO: Implement the logic to call Alpha Vantage API.
    // - Handle "compact" vs "full" endpoints.
    // - Handle monthly chunks for intraday data.
    // - Transform the API response into the standardized StockDataPoint[] format.
    return [];
  }

  async planFetch(request: ValidatedStockRequest): Promise<FetchPlan> {
    console.log('(Provider) [TODO] Planning fetch for Alpha Vantage.');
    // TODO: Implement logic to calculate API calls.
    // - For daily/weekly/monthly, it's likely 1 call per ticker for the "full" dataset.
    // - For intraday, calculate how many months the date range spans.
    const estimatedApiCallCount = request.tickers.length; // Simplified placeholder
    return { estimatedApiCallCount };
  }
}