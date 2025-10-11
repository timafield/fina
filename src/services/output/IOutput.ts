import { StockDataPoint } from '../cache/ICache';

/**
 * Defines the options that can be passed to an output service's write method.
 * This allows for flexible control over the output destination.
 */
export interface OutputOptions {
  /**
   * The file path or destination identifier. Can include template variables
   * like $ticker$ or $date$ that the output service should resolve.
   */
  path?: string;
}

/**
 * Defines the contract for any output implementation (e.g., CsvOutput, ParquetOutput).
 * This ensures the command handler can write data in a consistent way.
 */
export interface IOutput {
  readonly name: string;

  /**
   * Writes an array of standardized data points to the specified destination.
   * @param data - The array of data to be written.
   * @param options - An object containing options like the output path.
   * @returns A promise that resolves when the write operation is complete.
   */
  write(data: StockDataPoint[], options: OutputOptions): Promise<void>;
}