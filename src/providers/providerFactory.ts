import { IDataProvider } from './IProvider';
import { AlphaVantageProvider } from './alphavantage';

export type ProviderName = 'alphavantage'

export function getDataProvider(): IDataProvider {
  const providerName: ProviderName = process.env.DATA_PROVIDER as ProviderName || 'alphavantage';

  switch (providerName) {
    case 'alphavantage':
      if (process.env.ALPHAVANTAGE_API_KEY) {
        return new AlphaVantageProvider();
      }
      throw new Error('ALPHAVANTAGE_API_KEY is not set for the alphavantage provider.');
    default:
      throw new Error(`Unsupported data provider: ${providerName}`);
  }
}