import { ConsoleJsonOutput } from './consoleJson.js';
import { CsvOutput } from './csv.js';
import { IOutput } from './IOutput.js';

export class OutputFactory {
  /**
   * Creates an instance of an output handler based on the specified format.
   * @param format - The name of the output format (e.g., "csv", "json").
   * @returns An instance of a class that implements IOutput.
   */
  public static create(format: string): IOutput {
    switch (format.toLowerCase()) {
      case 'csv':
        return new CsvOutput();
      case 'json':
        return new ConsoleJsonOutput();
      // case 'parquet':
      //   return new ParquetOutput();
      // case 'gsheet':
      //   return new GoogleSheetOutput();
      default:
        throw new Error(`Unsupported output format: "${format}"`);
    }
  }
}