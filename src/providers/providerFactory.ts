import { AppConfig } from '../utils/config';
import { AlphaVantageProvider } from './alphavantage';
import { IDataProvider } from './IProvider';

export class ProviderFactory {
  /**
   * Creates an instance of a data provider based on the application configuration.
   * @param providerName - The name of the provider to create (e.g., "alphavantage").
   * @param config - The application's configuration object, used to retrieve API keys.
   * @returns An instance of a class that implements IDataProvider.
   */
  public static create(providerName: string, config: AppConfig | null): IDataProvider {
    switch (providerName.toLowerCase()) {
      case 'alphavantage': {
        const apiKey = config?.providers?.alphaVantage?.apiKey || process.env.ALPHAVANTAGE_API_KEY;
        if (!apiKey) {
          throw new Error('Alpha Vantage API key not found in config file or environment variables.');
        }

        return new AlphaVantageProvider(apiKey);
      }

      // case 'polygon':
      //   // ... logic for Polygon provider
      //   break;

      default:
        throw new Error(`Unsupported data provider: "${providerName}"`);
    }
  }
}