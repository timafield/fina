import { ValidatedSecurityRequest } from '../../commands/fetchSecurity.js';
import { createLogger } from '../../utils/logger.js';
import { OutputSecurityBar } from '../output/IOutput.js';

export type TransformFunction = (data: OutputSecurityBar[], request: ValidatedSecurityRequest) => OutputSecurityBar[];

/**
 * Transformation: Adjusts historical OHLC, Volume, and Dividend data based on the adjusted close price.
 * This ensures all historical data is comparable to the present-day security price.
 */
const adjustPricesTransform: TransformFunction = (data, request) => {
  const logger = createLogger('adjustPricesTransform');
  const wantsAdjusted = request.fields.some(f => ['a', 'd', 'r'].includes(f));
  if (!wantsAdjusted) {
    logger.debug('Skipping price adjustment due to --unadjusted flag.');
    return data;
  }

  logger.debug('Applying price adjustments...');
  return data.map(point => {
    if (!point.splitCoefficient || !point.adjClose || !point.close || point.close === 0) {
      return point;
    }
    const ratio = point.splitCoefficient || point.adjClose / point.close;
    return {
      ...point,
      open: point.open && parseFloat((point.open * ratio).toFixed(4)) || point.open,
      high: point.high && parseFloat((point.high * ratio).toFixed(4)) || point.high,
      low: point.low && parseFloat((point.low * ratio).toFixed(4)) || point.low,
      close: point.close && parseFloat((point.close * ratio).toFixed(4)) || point.close,
      // If dividends are supplied they must be adjusted for number of shares already. Does not need further adjustment.
      volume: point.volume && Math.round(point.volume / ratio) || point.volume,
    };
  });
};

/**
 * Transformation: Calculates period-over-period returns based on the previous bar's close.
 */
const calculateReturnsTransform: TransformFunction = (data, request) => {
  const logger = createLogger('calculateReturnsTransform');
  if (!request.fields.includes('r')) {
    logger.debug('Skipping return calculation.');
    return data;
  }
  logger.debug('Applying return calculations...');
  const transformedData: OutputSecurityBar[] = [];

  for (let i = 0; i < data.length; i++) {
    const current = data[i];
    const prev = i > 0 ? data[i - 1] : null;

    const newPoint = { ...current };

    if (prev && prev.close !== 0) {
      if (request.fields.includes('o') && current.open && prev.close) newPoint.open_return = (current.open / prev.close) - 1;
      if (request.fields.includes('h') && current.high && prev.close) newPoint.high_return = (current.high / prev.close) - 1;
      if (request.fields.includes('l') && current.low && prev.close) newPoint.low_return = (current.low / prev.close) - 1;
      if (request.fields.includes('c') && current.close && prev.close) newPoint.close_return = (current.close / prev.close) - 1;
    }
    transformedData.push(newPoint);
  }
  return transformedData;
};

/**
 * Transformation: Maps the final data to include only the columns requested by the user.
 * This is the final step before outputting the data.
 */
const mapColumnsTransform: TransformFunction = (data, request) => {
  const logger = createLogger('mapColumnsTransform');
  const fields = new Set(request.fields);
  logger.debug(`Finalizing output columns based on fields: ${[...fields].join('')}`);

  if (fields.size === 0) {
    return data;
  }

  const wantsReturns = fields.has('r');
  const wantsOnlyReturns = wantsReturns && !['o', 'h', 'l', 'c'].some(o => fields.has(o))

  return data.map(point => {
    const newPoint: OutputSecurityBar = {
      ticker: point.ticker,
      datetime: point.datetime,
      interval: point.interval,
    };

    if (wantsOnlyReturns) {
      if (point.open_return !== undefined) newPoint.open_return = point.open_return;
      if (point.high_return !== undefined) newPoint.high_return = point.high_return;
      if (point.low_return !== undefined) newPoint.low_return = point.low_return;
      if (point.close_return !== undefined) newPoint.close_return = point.close_return;
    } else {
      if (fields.has('o')) newPoint.open = point.open;
      if (fields.has('h')) newPoint.high = point.high;
      if (fields.has('l')) newPoint.low = point.low;
      if (fields.has('c')) newPoint.close = point.close;
      if (fields.has('a')) newPoint.adjClose = point.adjClose;
    }

    if (fields.has('v')) newPoint.volume = point.volume;
    if (fields.has('d')) newPoint.dividendAmount = point.dividendAmount;
    if (fields.has('s')) newPoint.dividendAmount = point.dividendAmount;

    if (wantsReturns) {
      if (fields.has('o') && point.open_return !== undefined) newPoint.open_return = point.open_return;
      if (fields.has('h') && point.high_return !== undefined) newPoint.high_return = point.high_return;
      if (fields.has('l') && point.low_return !== undefined) newPoint.low_return = point.low_return;
      if (fields.has('c') && point.close_return !== undefined) newPoint.close_return = point.close_return;
    }

    return newPoint;
  });
};

const TRANSFORMATION_PIPELINE: TransformFunction[] = [
  adjustPricesTransform,
  calculateReturnsTransform, // adjusting prices must happen before calculating returns
  mapColumnsTransform, // dropping columns must happen last
];

/**
 * The main entry point for the transformation service. It applies a series of data
 * transformations in a predefined order.
 * @param data The raw data fetched from the provider/cache.
 * @param request The validated user request which determines which transforms to run.
 * @returns The fully transformed data, ready for output.
 */
export function applyTransforms(data: OutputSecurityBar[], request: ValidatedSecurityRequest): OutputSecurityBar[] {
  let transformedData = [...data];
  const logger = createLogger('applyTransforms');
  logger.info('Applying output transformations...');
  for (const transform of TRANSFORMATION_PIPELINE) {
    transformedData = transform(transformedData, request);
  }
  return transformedData;
}
