import { IDataProvider, OHLCV } from './IProvider';
import axios from 'axios';
import { ProviderName } from './providerFactory';

export class AlphaVantageProvider implements IDataProvider {
  public readonly name: ProviderName = 'alphavantage';
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.ALPHAVANTAGE_API_KEY || '';
    if (!this.apiKey) {
      throw new Error(`${this.name} API key is not configured.`);
    }
  }

  public async getHistory(tickers: string[], startDate: Date, endDate: Date): Promise<OHLCV[]> {
    console.log(`Fetching data from AlphaVantage for ${tickers.join(', ')}...`);
    
    const url = `https://example.com/AAPL/...&apiKey=${this.apiKey}`;
    const response = await axios.get(url);

    const normalizedData: OHLCV[] = this.normalizeData(response.data, 'symbol_history');

    return normalizedData;
  }
  
  private normalizeData(alphavantageResponse: unknown, responseType: 'symbol_history'): OHLCV[] {
    // ...logic to transform data here
    return [];
  }
}