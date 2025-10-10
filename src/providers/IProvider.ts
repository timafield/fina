export interface OHLCV {
  ticker: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface IDataProvider {
  readonly name: string;

  getHistory(tickers: string[], startDate: Date, endDate: Date): Promise<OHLCV[]>;
}