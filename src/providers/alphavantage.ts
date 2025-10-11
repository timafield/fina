import { IDataProvider, FetchPlan } from './IProvider';
import { ValidatedStockRequest } from '../commands/fetchStock';
import { StockDataPoint } from '../services/cache/ICache';
import axios from 'axios';
import dayjs from 'dayjs';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * A concrete implementation of IDataProvider for the Alpha Vantage API.
 * This class encapsulates all logic specific to interacting with Alpha Vantage.
 */
export class AlphaVantageProvider implements IDataProvider {
  public readonly name = 'alphavantage';
  private readonly baseUrl = 'https://www.alphavantage.co/query';
  private apiKey: string;
  private rateLimitDelay: number;

  constructor(apiKey: string, rateLimitPerMinute: number = 5) {
    if (!apiKey) {
      throw new Error('Alpha Vantage API key is required.');
    }
    this.apiKey = apiKey;

    if (rateLimitPerMinute <= 0) {
      this.rateLimitDelay = 0;
    } else {
      this.rateLimitDelay = (60 * 1000) / rateLimitPerMinute * 1.1;
    }
    
    console.log(`(Provider) Alpha Vantage rate limit configured to ${rateLimitPerMinute} calls/min. Delay between calls: ${this.rateLimitDelay.toFixed(0)}ms.`);
  }

  /**
   * Plans the API calls required to fulfill a request.
   */
  async planFetch(request: ValidatedStockRequest): Promise<FetchPlan> {
    const estimatedApiCallCount = request.tickers.length;
    return { estimatedApiCallCount };
  }

  /**
   * Fetches historical stock data from the Alpha Vantage API.
   */
  async getHistory(request: ValidatedStockRequest): Promise<StockDataPoint[]> {
    let allData: StockDataPoint[] = [];

    for (const ticker of request.tickers.filter(t => request.ranges.get(t)?.length)) {
      if (this.rateLimitDelay > 0) {
        await delay(this.rateLimitDelay);
      }

      console.log(`(Provider) Fetching data for ${ticker} from Alpha Vantage...`);

      const apiFunction = this.getApiFunction(request.granularity);
      
      const params = {
        function: apiFunction,
        symbol: ticker,
        apikey: this.apiKey,
        outputsize: 'full',
        datatype: 'json',
      };

      const response = await axios.get(this.baseUrl, { params });

      if (response.data['Error Message']) {
        throw new Error(`Alpha Vantage API Error for ${ticker}: ${response.data['Error Message']}`);
      }

      if (response.data['Note']) {
        console.warn(`(Provider) Alpha Vantage API Note for ${ticker}: ${response.data['Note']}`);
      }

      const transformedData = this.transformData(response.data, ticker);
      allData = allData.concat(transformedData);
    }

    return allData;
  }

  /**
   * Determines the correct Alpha Vantage API function based on the requested granularity.
   */
  private getApiFunction(granularity: string): string {
    if (granularity.endsWith('d')) return 'TIME_SERIES_DAILY_ADJUSTED';
    if (granularity.endsWith('w')) return 'TIME_SERIES_WEEKLY_ADJUSTED';
    if (granularity.endsWith('m')) return 'TIME_SERIES_MONTHLY_ADJUSTED';

    throw new Error(`Unsupported granularity for Alpha Vantage: ${granularity}`);
  }

  /**
   * Transforms the quirky, nested JSON response from Alpha Vantage into our clean,
   * standardized array of StockDataPoint objects.
   */
  private transformData(apiResponse: TimeseriesResponse, ticker: string): StockDataPoint[] {
    // Find the time series data key, which changes based on the function
    const seriesKey = Object.keys(apiResponse).find(k => k.includes('Time Series'));
    if (!seriesKey) {
      console.warn(`(Provider) No time series data found in Alpha Vantage response for ${ticker}.`);
      return [];
    }

    const timeSeries = apiResponse[seriesKey];
    const dataPoints: StockDataPoint[] = Object.entries(timeSeries).map(([date, entry]) => ({
        ticker: ticker,
        date: dayjs(date).format('YYYY-MM-DD'),
        open: parseFloat(entry['1. open']),
        high: parseFloat(entry['2. high']),
        low: parseFloat(entry['3. low']),
        close: parseFloat(entry['4. close']),
        adjClose: parseFloat(entry['5. adjusted close']),
        volume: parseInt(entry['6. volume'], 10),
    }));

    // API returns data in descending order, so we reverse it to be chronological.
    return dataPoints.reverse();
  }
}

type TimeseriesResponse = Record<string, {
  'Time Series': {
    '1. open': string;
    '2. high': string;
    '3. low': string;
    '4. close': string;
    '5. adjusted close': string;
    '6. volume': string;
  }
}>;