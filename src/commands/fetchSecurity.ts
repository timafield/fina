import dayjs, { Dayjs } from 'dayjs';
import inquirer from 'inquirer';
import { AppConfig, fetchCachedConfig } from '../utils/config.js';
import { createLogger } from '../utils/logger.js';
import { CacheFactory } from '../services/cache/cacheFactory.js';
import { DateRange, StorageSecurityBar } from '../services/cache/ICache.js';
import { ProviderFactory } from '../providers/providerFactory.js';
import { IOutput } from '../services/output/IOutput.js';
import { OutputFactory } from '../services/output/outputFactory.js';
import { groupByKeyFn } from '../utils/array.js';

interface FetchSecurityOptions {
  ticker: string[];
  date: string;
  granularity: string;
  fields: string;
  unadjusted: boolean;
  outputFormat?: string;
  outputPath?: string;
  cachePolicy: 'use' | 'ignore' | 'refresh';
  plan: boolean;
  yes: boolean;
  config?: string;
}

export interface ValidatedSecurityRequest {
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
  ranges: Map<string, DateRange[]>;
}

/**
 * Main handler for the 'fina fetch security' command.
 * Orchestrates the entire process of fetching, caching, and outputting data.
 * @param options - The raw options object from Commander.js.
 */
export const fetchSecurityCommand = async (options: FetchSecurityOptions) => {
  const logger = createLogger('fetch security');
  try {
    const userConfig = await fetchCachedConfig();
    const request = validateAndBuildRequest(options, userConfig);
    const cache = CacheFactory.create(userConfig);

    // --- Execution Plan & Interactive Confirmation ---
    if (options.plan) {
      logger.info('--- Execution Plan ---');
      logger.info(`Provider: ${request.providerName}`);
      logger.info(`Tickers: ${request.tickers.join(', ')}`);
      logger.info(`Full Date Range: ${request.startDate.format('YYYY-MM-DD')} to ${request.endDate.format('YYYY-MM-DD')}`);

      const coverage = await cache.analyzeCacheCoverage(request);
      const missingCount = [...coverage.missingRangesByTicker.values()].reduce((sum, r) => sum + r.length, 0);

      if (missingCount > 0) {
        logger.info('Cache Status: Found existing data. Missing ranges will be fetched.');
      } else {
        logger.info('Cache Status: All requested data appears to be in the cache.');
      }

      if (missingCount > 0) {
        const dataToFetch = { ...request, ranges: coverage.missingRangesByTicker };
        const provider = ProviderFactory.create(request.providerName, userConfig);
        const fetchPlan = await provider.planFetch(dataToFetch);
        logger.info(`API Calls: An estimated ${fetchPlan.estimatedApiCallCount} API call(s) will be made.`);
      } else {
        logger.info('API Calls: No API calls needed.');
      }
      
      logger.info(`Output: ${request.output.format} to ${request.output.path || 'console'}`);
      logger.info('--------------------');
      
      // Interactive prompt to proceed, unless -y is specified
      if (!options.yes) {
        const { proceed } = await inquirer.prompt([{
          type: 'confirm',
          name: 'proceed',
          message: 'Proceed with this execution plan?',
          default: true,
        }]);
        if (!proceed) {
          logger.info('Operation cancelled by user.');
          return;
        }
      }
    }

    let finalData: StorageSecurityBar[] = [];
    if (request.cachePolicy === 'ignore') {
      logger.info('Cache policy is "ignore". Fetching all data from provider.');
      const provider = ProviderFactory.create(request.providerName, userConfig);
      finalData = await provider.getHistory(request);
    } else if (request.cachePolicy === 'refresh') {
      logger.info('Cache policy is "refresh". Fetching all data and updating cache.');
      const provider = ProviderFactory.create(request.providerName, userConfig);
      const freshData = await provider.getHistory(request);
      await cache.updateSecurityData(freshData);
      finalData = freshData;
    } else { // 'use' policy is default
      logger.info('Cache policy is "use". Checking cache for existing data.');
      const coverage = await cache.analyzeCacheCoverage(request);

      let cachedData: StorageSecurityBar[] = [];
      const missingTickers = new Set([...coverage.missingRangesByTicker.entries()].filter(entry => entry[1].length).map(entry => entry[0]));
      if (request.tickers.length > missingTickers.size) {
        const cacheRequest = {
          ...request,
          tickers: request.tickers.filter(t => !missingTickers.has(t)),
        }
        cachedData = await cache.getSecurityData(cacheRequest);
      }

      if (missingTickers.size > 0) {
        logger.info(`Found missing range(s). Fetching from provider.`);
        const missingDataRequest = { ...request, ranges: coverage.missingRangesByTicker };
        const provider = ProviderFactory.create(request.providerName, userConfig);
        const newData = await provider.getHistory(missingDataRequest);

        if (newData.length > 0) {
          await cache.updateSecurityData(newData);
        }

        finalData = groupByKeyFn([...cachedData, ...newData], (r => `${r.ticker}|${r.interval}|${r.datetime}`))
          .map(bar => bar[1][0])
          .sort((a, b) => dayjs(a.datetime).diff(dayjs(b.datetime)));
      } else {
        logger.info('All requested data was found in the cache.');
        finalData = cachedData;
      }
    }

    const output: IOutput = OutputFactory.create(request.output.format);
    await output.write(finalData, { path: request.output.path });
    
    logger.info('✅ Fetch security data command executed successfully.');

  } catch (error) {
    logger.error(`❌ Error fetching security data: ${(error as Error).message}`);
    process.exit(1);
  }
};

/**
 * Parses raw CLI options, merges them with defaults from the config file,
 * and returns a structured, validated request object.
 */
function validateAndBuildRequest(
  options: FetchSecurityOptions,
  config: AppConfig | null
): ValidatedSecurityRequest {
  const providerName = config?.defaults?.provider ?? 'alphavantage';
  const outputFormat = options.outputFormat ?? config?.defaults?.outputFormat ?? 'csv';
  
  if (!options.ticker || options.ticker.length === 0) {
    throw new Error('At least one ticker must be provided with the -t flag.');
  }

  const fields = options.fields.split('');

  const { startDate, endDate } = parseDateRange(options.date);

  return {
    tickers: options.ticker,
    startDate,
    endDate,
    granularity: options.granularity,
    fields,
    output: { format: outputFormat, path: options.outputPath },
    providerName,
    cachePolicy: options.cachePolicy,
    ranges: new Map(),
  };
}

/**
 * Parses a single date token.
 */
function parseDateToken(token: string, referenceDate: Dayjs): Dayjs {
  const relativeDateRegex = /^(-?\d+)(d|w|m|y)$/i;
  const match = token.match(relativeDateRegex);

  if (token === '0d' || token === '') {
    return dayjs(referenceDate);
  }

  if (match) {
    const amount = parseInt(match[1], 10);
    const unit = match[2].toLowerCase() as 'd' | 'w' | 'm' | 'y';
    switch (unit) {
      case 'd': return referenceDate.add(amount, 'day');
      case 'w': return referenceDate.add(amount, 'week');
      case 'm': return referenceDate.add(amount, 'month');
      case 'y': return referenceDate.add(amount, 'year');
    }
  }

  const absoluteDateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (absoluteDateRegex.test(token)) {
    return dayjs(token);
  }

  throw new Error(`Invalid date token format: "${token}". Use "YYYY-MM-DD" or relative format like "-5y", "-30d".`);
}

/**
 * Parses a date range string.
 */
function parseDateRange(dateStr: string): { startDate: Dayjs; endDate: Dayjs } {
  const now = dayjs().endOf('day');

  if (!dateStr.includes(':')) {
    const singleDate = parseDateToken(dateStr, now);
    return { startDate: singleDate.startOf('day'), endDate: singleDate.endOf('day') };
  }

  const [startStr, endStr] = dateStr.split(':');
  
  const endDate = endStr ? parseDateToken(endStr, now) : now;
  const startDate = startStr ? parseDateToken(startStr, now) : dayjs('1970-01-01');
  
  if (startDate.isAfter(endDate)) {
    throw new Error(`Start date (${startDate.format('YYYY-MM-DD')}) cannot be after end date (${endDate.format('YYYY-MM-DD')}).`);
  }

  return { startDate: startDate.startOf('day'), endDate: endDate.endOf('day') };
}

