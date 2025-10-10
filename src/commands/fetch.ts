import { getDataProvider } from '../providers/providerFactory';

export async function fetchHistoryCommand(options: { tickers: string[] }) {
  try {
    const dataProvider = getDataProvider();
    
    console.log(`Using data provider: ${dataProvider.name}`);

    const historyData = await dataProvider.getHistory(
      options.tickers,
      new Date('2024-01-01'),
      new Date('2024-12-31')
    );

    console.log(`Successfully fetched ${historyData.length} data points.`);

  } catch (error: unknown) {
    console.error('Error fetching history:', (error as Error).message);
  }
}