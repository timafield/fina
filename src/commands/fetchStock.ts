import dayjs, { Dayjs } from 'dayjs';
import { loadConfiguration, AppConfig } from '../utils/config';
import { createLogger } from '../utils/logger';
import { CacheFactory } from '../services/cache/cacheFactory';
import { StockDataPoint } from '../services/cache/ICache';
import { ProviderFactory } from '../providers/providerFactory';

interface FetchStockOptions {
  ticker: string[];
  date: string;
  granularity: string;
  fields: string;
  outputFormat?: string;
  outputPath?: string;
  cachePolicy: 'use' | 'ignore' | 'refresh';
  plan: boolean;
  yes: boolean;
  silent: boolean;
}

export interface ValidatedStockRequest {
  tickers: string[];
  startDate: Dayjs;
  endDate: Dayjs;
  granularity: string;
  fields: string[];
  output: {
    format: string;
    path?: string;
  };
  providerName: string;
  cachePolicy: 'use' | 'ignore' | 'refresh';
}

/**
 * Main handler for the 'fina fetch stock' command.
 * Orchestrates the entire process of fetching, caching, and outputting data.
 * @param options - The raw options object from Commander.js.
 */
export const fetchStockCommand = async (options: FetchStockOptions) => {
  const logger = createLogger('fetch stock');
  try {
    const userConfig = await loadConfiguration();

    const request = validateAndBuildRequest(options, userConfig);

    const cache = CacheFactory.create(userConfig);

    if (options.plan) {
      logger.info('--- Execution Plan ---');
      logger.info(`Provider: ${request.providerName}`);
      logger.info(`Tickers: ${request.tickers.join(', ')}`);
      logger.info(`Full Date Range: ${request.startDate.toISOString().split('T')[0]} to ${request.endDate.toISOString().split('T')[0]}`);

      const coverage = await cache.analyzeCacheCoverage(request);

      if (coverage.cachedRanges.length > 0) {
        logger.info('Cache Status: Found existing data. Only missing ranges will be fetched.');
      } else {
        logger.info('Cache Status: No relevant data found in cache.');
      }

      if (coverage.missingRanges.length > 0) {
        const dataToFetch = { ...request, ranges: coverage.missingRanges };
        const provider = ProviderFactory.create(request.providerName, userConfig);
        const fetchPlan = await provider.planFetch(dataToFetch);

        logger.info(`API Calls: An estimated ${fetchPlan.estimatedApiCallCount} API call(s) will be made.`);
      } else {
        logger.info('API Calls: All requested data is already in the cache. No API calls needed.');
      }
      
      logger.info(`Output: ${request.output.format} to ${request.output.path || 'default path'}`);
      logger.info('--------------------');
      logger.info("Run the same command without '--plan' or with '-y' to execute.");
      return;
    }

    let finalData: StockDataPoint[] = [];

    if (request.cachePolicy === 'ignore') {
      logger.info('Cache policy is "ignore". Fetching all data from provider.');
      // const provider = ProviderFactory.create(request.providerName);
      // finalData = await provider.getHistory(request);

    } else if (request.cachePolicy === 'refresh') {
      logger.info('Cache policy is "refresh". Fetching all data and updating cache.');
      // const provider = ProviderFactory.create(request.providerName);
      // const freshData = await provider.getHistory(request);
      // await cache.updateStockData(freshData); // Overwrite/update cache
      // finalData = freshData;

    } else {
      logger.info('Cache policy is "use". Checking cache for existing data.');
      const coverage = await cache.analyzeCacheCoverage(request);

      let cachedData: StockDataPoint[] = [];
      if (coverage.cachedRanges.length > 0) {
        cachedData = await cache.getStockData(request);
      }

      if (coverage.missingRanges.length > 0) {
        logger.info(`Found ${coverage.missingRanges.length} missing range(s). Fetching from provider.`);

        const missingDataRequest = { ...request, startDate: coverage.missingRanges[0].startDate, endDate: coverage.missingRanges[0].endDate };

        // const provider = ProviderFactory.create(request.providerName);
        // const newData = await provider.getHistory(missingDataRequest);
        const newData: StockDataPoint[] = [];

        if (newData.length > 0) {
          await cache.updateStockData(newData);
        }

        finalData = [...cachedData, ...newData].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      } else {
        logger.info('All requested data was found in the cache.');
        finalData = cachedData;
      }
    }

    // 8. Write the final combined data to the destination
    // const output: IOutput = OutputFactory.create(request.output.format);
    // await output.write(finalData, { path: request.output.path });
    
    if (!options.silent) {
      logger.info('✅ Fetch stock data command executed successfully.');
      logger.info('(Simulated run complete with new cache logic)');
    }

  } catch (error) {
    logger.error(`❌ Error fetching stock data: ${(error as Error).message}`);
    process.exit(1);
  }
};

/**
 * Parses raw CLI options, merges them with defaults from the config file,
 * and returns a structured, validated request object.
 */
function validateAndBuildRequest(
  options: FetchStockOptions,
  config: AppConfig | null
): ValidatedStockRequest {
  const providerName = config?.defaults?.provider || 'alphavantage';
  const outputFormat = options.outputFormat || config?.defaults?.output || 'csv';
  
  if (!options.ticker || options.ticker.length === 0) {
    throw new Error('At least one ticker must be provided with the -t flag.');
  }

  const { startDate, endDate } = parseDateRange(options.date);

  return {
    tickers: options.ticker,
    startDate,
    endDate,
    granularity: options.granularity,
    fields: options.fields.split(''),
    output: { format: outputFormat, path: options.outputPath },
    providerName,
    cachePolicy: options.cachePolicy,
  };
}

/**
 * Parses a single date token, which can be relative (e.g., "-5y") or absolute ("2024-01-01").
 * @param token - The string token to parse.
 * @param referenceDate - The date to calculate relative units from (usually today).
 * @returns A Date object.
 */
function parseDateToken(token: string, referenceDate: Dayjs): Dayjs {
  const relativeDateRegex = /^(-?\d+)(d|w|m|y)$/i;
  const match = token.match(relativeDateRegex);

  if (token === '0d' || token === '') {
      return dayjs(referenceDate);
  }

  if (match) {
      const amount = parseInt(match[1], 10);
      const unit = match[2].toLowerCase();
      const date = dayjs(referenceDate);

      switch (unit) {
          case 'd': date.add(amount, 'day'); break;
          case 'w': date.add(amount * 7, 'day'); break;
          case 'm': date.add(amount, 'month'); break;
          case 'y': date.add(amount, 'year'); break;
      }

      return date;
  }

  const absoluteDateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (absoluteDateRegex.test(token)) {
      return dayjs(token);
  }

  throw new Error(`Invalid date token format: "${token}". Use "YYYY-MM-DD" or relative format like "-5y", "-30d".`);
}

/**
 * Parses a date range string (e.g., "-1y:2024-12-31") into start and end Date objects.
 * @param dateStr - The date string from the command line.
 * @returns An object containing the startDate and endDate.
 */
function parseDateRange(dateStr: string): { startDate: Dayjs; endDate: Dayjs } {
  const now = dayjs().endOf('day');

  if (!dateStr.includes(':')) {
      const singleDate = parseDateToken(dateStr, now);
      
      const startDate = dayjs(singleDate).startOf('day');
      const endDate = dayjs(singleDate).startOf('day');
      
      return { startDate, endDate };
  }

  const [startStr, endStr] = dateStr.split(':');
  
  const endDate = endStr ? parseDateToken(endStr, now) : now;
  const startDate = startStr ? parseDateToken(startStr, now) : dayjs('1970-01-01');
  
  if (startDate > endDate) {
    throw new Error(`Start date (${startDate.toISOString().split('T')[0]}) cannot be after end date (${endDate.toISOString().split('T')[0]}).`);
  }

  startDate.startOf('day');
  endDate.startOf('day');

  return { startDate, endDate };
}
