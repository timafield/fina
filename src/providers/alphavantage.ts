import { IDataProvider, FetchPlan, MissingFeatureError } from './IProvider.js';
import { ValidatedStockRequest } from '../commands/fetchStock.js';
import { StorageSecurityBar } from '../services/cache/ICache.js';
import axios from 'axios';
import dayjs from 'dayjs';
import inquirer from 'inquirer';
import { createLogger, Logger } from '../utils/logger.js';
import { fetchCachedConfig } from '../utils/config.js';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface GranularityInfo {
  isAdjusted: boolean;
  apiFunction: string;
  baseIntervalMinutes: number | null; // For intraday resampling
}

/**
 * A concrete implementation of IDataProvider for the Alpha Vantage API.
 */
export class AlphaVantageProvider implements IDataProvider {
  public readonly name = 'alphavantage';
  private readonly baseUrl = 'https://www.alphavantage.co/query';
  private apiKey: string;
  private rateLimitDelay: number;
  private isPremium: boolean;
  private logger: Logger = createLogger('AlphaVantageProvider');

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('Alpha Vantage API key is required.');
    }
    this.apiKey = apiKey;

    const config = fetchCachedConfig();
    this.isPremium = config?.providers?.['alphavantage']?.capabilities?.some(c => c === 'premium') === true;
    const rateLimitPerMinute = config?.providers?.['alphavantage']?.rateLimitPerMinute ?? 5;
    
    this.rateLimitDelay = rateLimitPerMinute > 0 ? (60 * 1000) / rateLimitPerMinute : 0;
    this.logger.debug(`Alpha Vantage key is ${this.isPremium ? 'premium' : 'free'}. Rate limit configured to ${rateLimitPerMinute} calls/min.`);
  }

  async planFetch(request: ValidatedStockRequest): Promise<FetchPlan> {
    // TODO: This could be enhanced to calculate number of api calls needed when intraday and spans months.
    const estimatedApiCallCount = request.tickers.length;
    // TODO: implement estimated time based on calculated number of calls and calls per minute rate limit.
    return { estimatedApiCallCount, estimatedTime: 0 };
  }

  async getHistory(request: ValidatedStockRequest): Promise<StorageSecurityBar[]> {
    let allData: StorageSecurityBar[] = [];
    const { unadjusted } = request;

    const wantsAdjusted = !unadjusted;
    if (wantsAdjusted && !this.isPremium) {
      const { proceed } = await inquirer.prompt([{
        type: 'confirm',
        name: 'proceed',
        message: `Warning: The current Alpha Vantage API key is not marked as premium. Adjusted data is not be available.
To fix, add 'premium' to the alphavantage capabilities list in the providers property on your config or use the --unadjusted flag.
Continue with unadjusted data?`,
          default: true,
      }]);
      if (!proceed) {
        throw new Error('Operation cancelled by user due to premium data warning.');
      }
    }

    let firstCall = true;
    for (const ticker of request.tickers.filter(t => request.ranges.get(t)?.length)) {
      if (!firstCall && this.rateLimitDelay > 0) {
        await delay(this.rateLimitDelay);
      }
      firstCall = false;

      this.logger.debug(`Fetching data for ${ticker} from Alpha Vantage...`);

      const granularityInfo = this.getGranularityInfo(request.granularity, unadjusted);

      const params = {
        function: granularityInfo.apiFunction,
        symbol: ticker,
        apikey: this.apiKey,
        outputsize: 'full',
        datatype: 'json',
        interval: undefined as unknown as string,
        adjusted: undefined as unknown as boolean,
      };

      if (granularityInfo.apiFunction === 'TIME_SERIES_INTRADAY') {
        params.interval = `${granularityInfo.baseIntervalMinutes}min`;

        if (!granularityInfo.isAdjusted) {
          params.adjusted = false;
        }

        // TODO: add support for extended_hours qs flag (log warning if --extended-hours flag provided when non-sec, min, or hr interval requested)
        // TODO: intraday supports a "months" parameter. Need to set it based on the range provided, and must fetch multiple if intraday and the range is greater than one month.
        // TODO: intraday support a "outputsize" parameter. If compact (default), last 100 bars returned. If full, returns trailing 30 days if months not provided.
      }

      const response = await axios.get(this.baseUrl, { params });

      if (response.data['Error Message']) {
        throw new Error(`Alpha Vantage API Error for ${ticker}: ${response.data['Error Message']}`);
      }

      if (response.data['Information']?.includes('premium')) {
        this.logger.error(`Operation a premium feature. Alahpavantage: ${response.data['Information']}`, { apiFunction: granularityInfo.apiFunction, params });
          throw new MissingFeatureError(`API does not support the provided operation for ${ticker}.`);
      }

      let transformedData = this.transformData(response.data, ticker, request.granularity);

      const requestedMinutes = this.parseGranularityToMinutes(request.granularity);
      if (requestedMinutes && granularityInfo.baseIntervalMinutes && requestedMinutes > granularityInfo.baseIntervalMinutes) {
        transformedData = this.resampleData(transformedData, requestedMinutes);
      }

      allData = allData.concat(transformedData);
    }

    return allData;
  }
  // TODO: parse to lowest supported bar size. If 2d provided -> 1d if 4min -> 1min if 10min -> 5min, if 2hr -> 60min etc.
  private parseGranularityToMinutes(granularity: string): number | null {
    const match = granularity.match(/^(\d+)(min|h)$/);
    if (!match) return null;
    const amount = parseInt(match[1]);
    const unit = match[2];
    return unit === 'h' ? amount * 60 : amount;
  }

  private getGranularityInfo(granularity: string, unadjusted: boolean): GranularityInfo {
    const requestedMinutes = this.parseGranularityToMinutes(granularity);

    const useAdjustedEndpoint = !unadjusted;

    if (requestedMinutes) { // Intraday
      if (requestedMinutes < 1) throw new Error('Granularity below 1 minute is not supported by Alpha Vantage.');
      const supportedIntervals = [1, 5, 15, 30, 60];
      const baseIntervalMinutes = supportedIntervals.slice().reverse().find(i => requestedMinutes % i === 0 && requestedMinutes >= i) || 60;

      return {
          isAdjusted: useAdjustedEndpoint,
          apiFunction: 'TIME_SERIES_INTRADAY', // Note: AV doesn't have adjusted intraday endpoint name
          baseIntervalMinutes,
      };
    }
    // Daily, Weekly, Monthly
    if (granularity.endsWith('d')) return { isAdjusted: useAdjustedEndpoint, apiFunction: useAdjustedEndpoint ? 'TIME_SERIES_DAILY_ADJUSTED' : 'TIME_SERIES_DAILY', baseIntervalMinutes: null };
    if (granularity.endsWith('w')) return { isAdjusted: useAdjustedEndpoint, apiFunction: useAdjustedEndpoint ? 'TIME_SERIES_WEEKLY_ADJUSTED' : 'TIME_SERIES_WEEKLY', baseIntervalMinutes: null };
    if (granularity.endsWith('m')) return { isAdjusted: useAdjustedEndpoint, apiFunction: useAdjustedEndpoint ? 'TIME_SERIES_MONTHLY_ADJUSTED' : 'TIME_SERIES_MONTHLY', baseIntervalMinutes: null };

    throw new Error(`Unsupported granularity for Alpha Vantage: ${granularity}`);
  }

  private transformData(apiResponse: GeneralTimeseriesResponse, ticker: string, interval: string): StorageSecurityBar[] {
    const seriesKey = Object.keys(apiResponse).find(k => k.includes('Time Series'));
    if (!seriesKey) {
      this.logger.warn(`No time series data found in Alpha Vantage response for ${ticker}.`);
      return [];
    }

    const timeSeries: GeneralTimeseriesResponse[''] = apiResponse[seriesKey];

    const dataPoints: StorageSecurityBar[] = Object.entries(timeSeries).map(([datetime, entry]: [string, GeneralTimeseriesResponse['']['']]) => ({
      ticker,
      interval,
      datetime: dayjs(datetime).toISOString(),
      open: parseFloat(entry['1. open']),
      high: parseFloat(entry['2. high']),
      low: parseFloat(entry['3. low']),
      close: parseFloat(entry['4. close']),
      volume: parseInt(entry['6. volume'] || entry['5. volume'] || '0', 10), // Volume key changes for intraday
      adjClose: entry['5. adjusted close'] ? parseFloat(entry['5. adjusted close']) : undefined,
      dividendAmount: entry['7. dividend amount'] ? parseFloat(entry['7. dividend amount']) : undefined,
      splitCoefficient: entry['8. split coefficient'] ? parseFloat(entry['8. split coefficient']) : undefined,
    }));

    return dataPoints.reverse();
  }

  /**
   * Formats a period in minutes into a human-readable string (e.g., 60 -> "1hr").
   */
  private formatPeriod(minutes: number): string {
    if (minutes >= 10080 && minutes % 10080 === 0) return `${minutes / 10080}w`;
    if (minutes >= 1440 && minutes % 1440 === 0) return `${minutes / 1440}d`;
    if (minutes >= 60 && minutes % 60 === 0) return `${minutes / 60}hr`;
    return `${minutes}min`;
  }

  /**
   * Adjusts a single bar's values to a new split coefficient basis.
   * This is crucial for comparing bars from before and after a split.
   */
  private adjustBarToSplit(bar: StorageSecurityBar, targetSplit: number): StorageSecurityBar {
    if (!bar.splitCoefficient || bar.splitCoefficient === targetSplit) {
      return bar; // No adjustment needed
    }
    const ratio = targetSplit / bar.splitCoefficient;
    return {
      ...bar,
      open: bar.open * ratio,
      high: bar.high * ratio,
      low: bar.low * ratio,
      close: bar.close * ratio,
      volume: bar.volume / ratio,
    };
  }

  private resampleData(data: StorageSecurityBar[], targetMinutes: number): StorageSecurityBar[] {
    this.logger.debug(`Resampling ${data.length} bars to ${this.formatPeriod(targetMinutes)} intervals.`);
    const resampled: StorageSecurityBar[] = [];
    if (data.length === 0) return [];
    
    let currentGroup: StorageSecurityBar[] = [];

    data.forEach((bar, index) => {
      currentGroup.push(bar);
      const barTime = dayjs(bar.datetime);

      // Check if we've reached the end of an interval
      if (barTime.minute() % targetMinutes === 0 || index === data.length - 1) {
        if (currentGroup.length > 0) {
          const first = currentGroup[0];
          const last = currentGroup[currentGroup.length - 1];
          const lastSplit = last.splitCoefficient || 1;

          // Adjust all bars in the group to the split basis of the LAST bar.
          const adjustedGroup = currentGroup.map(b => this.adjustBarToSplit(b, lastSplit));
          const firstAdjusted = adjustedGroup[0];

          const resampledBar: StorageSecurityBar = {
            ticker: first.ticker,
            interval: this.formatPeriod(targetMinutes),
            datetime: last.datetime,
            open: firstAdjusted.open,
            high: Math.max(...adjustedGroup.map(b => b.high)),
            low: Math.min(...adjustedGroup.map(b => b.low)),
            close: last.close,
            volume: adjustedGroup.reduce((sum, b) => sum + b.volume, 0),
            adjClose: last.adjClose,
            splitCoefficient: last.splitCoefficient,
            dividendAmount: adjustedGroup.reduce((sum, b) => sum + (b.dividendAmount || 0), 0),
          };
          resampled.push(resampledBar);
          currentGroup = []; // Reset for the next group
        }
      }
    });
    return resampled;
  }
}

interface GeneralTimeseriesResponse {
  [seriesKey: string]: Record<string, {
    '1. open': string;
    '2. high': string;
    '3. low': string;
    '4. close': string;
    '5. adjusted close'?: string;
    '5. volume'?: string;
    '6. volume'?: string;
    '7. dividend amount'?: string;
    '8. split coefficient'?: string;
  }>;
};