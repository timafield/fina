import { StockDataPoint } from '../cache/ICache';
import { IOutput, OutputOptions } from './IOutput';

/**
 * An implementation of IOutput that prints formatted JSON to the console.
 * Useful for debugging or piping to other command-line tools like `jq`.
 */
export class ConsoleJsonOutput implements IOutput {
  public readonly name = 'json';

  async write(data: StockDataPoint[], _options: OutputOptions): Promise<void> {
    console.log(JSON.stringify(data, null, 2));
    return Promise.resolve();
  }
}