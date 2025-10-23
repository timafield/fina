import { IOutput, OutputOptions } from './IOutput.js';
import { StorageSecurityBar } from '../cache/ICache.js';
import { Parser } from 'json2csv';
import fs from 'fs/promises';
import path from 'path';
import dayjs from 'dayjs';
import { createLogger } from '../../utils/logger.js';

export class CsvOutput implements IOutput {
  public readonly name = 'csv';

  async write(data: StorageSecurityBar[], options: OutputOptions): Promise<void> {
    const logger = createLogger('csv output');

    if (!options.path) {
      throw new Error('An output path is required for CSV format.');
    }

    if (data.length === 0) {
      logger.warn('(Output) No data to write. Skipping CSV creation.');
      return;
    }

    const resolvedPath = this.resolvePath(options.path, data);

    logger.info(`(Output) Writing ${data.length} records to CSV file: ${resolvedPath}`);

    const parser = new Parser({ fields: Object.keys(data[0]) });
    const csv = parser.parse(data);

    await fs.mkdir(path.dirname(resolvedPath), { recursive: true });
    await fs.writeFile(resolvedPath, csv);
  }

  private resolvePath(templatePath: string, data: StorageSecurityBar[]): string {
    const ticker = data.length > 0 ? data[0].ticker : 'data';
    const date = dayjs().format('YYYY-MM-DD');
    const timestamp = dayjs().format('YYYYMMDDTHHmmss');
    return templatePath
      .replace('$ticker$', ticker)
      .replace('$date$', date)
      .replace('$timestamp$', timestamp)
  }
}