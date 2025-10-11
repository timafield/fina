import { getLogLevelFromString, LogLevel } from './logger';

import { cosmiconfig, CosmiconfigResult } from 'cosmiconfig';
import yaml from 'yaml';
import path from 'path';
import os from 'os';

export interface AppConfig {
  defaults?: {
    provider?: string;
    output?: string;
  };
  providers?: {
    [key: string]: {
      apiKey?: string;
    };
  };
  operations?: {
    [key: string]: {
      provider: string;
    };
  };
  cache?: {
    type?: 'sqlite' | 'in-memory' | 'flat-file' // | 'mysql' | 'postgres' | 'timescaledb' | 'redis';
    databasePath?: string;
  };
  logLevel?: LogLevel;
}

const yamlLoader = (filepath: string, content: string) => {
  try {
    return yaml.parse(content);
  } catch (error) {
    throw new Error(`Error parsing YAML file at ${filepath}: ${(error as Error).message}`);
  }
};

const explorer = cosmiconfig('fina', {
  searchPlaces: [
    'package.json',
    '.finarc',
    '.finarc.json',
    '.finarc.yaml',
    '.finarc.yml',
    'fina.config.js',
  ],
  loaders: {
    '.yaml': yamlLoader,
    '.yml': yamlLoader,
    noExt: yamlLoader,
  },
});

let loadedConfig: AppConfig | null = null;
let hasSearched = false;

/**
 * Searches for, loads, and parses the application configuration file.
 * Caches the result so it doesn't have to search the filesystem on subsequent calls.
 * @returns A promise that resolves to the loaded configuration object or null if not found.
 */
export async function loadConfiguration(
  options?: {
    config?: string;
    silent?: boolean;
    verbose?: boolean;
  }
): Promise<AppConfig | null> {
  if (hasSearched && !options?.config) {
    return fetchCachedConfig();
  }

  try {
    let result: CosmiconfigResult;
    if (options?.config) {
      result = await explorer.load(options.config);
    } else {
      result = await explorer.search();
    }
    hasSearched = true;

    let baseConfig: AppConfig = {};

    if (result && !result.isEmpty) {
      baseConfig = result.config as AppConfig;
    }

    loadedConfig = applyEnvironmentVariableOverrides(baseConfig);

    if (!loadedConfig.cache?.databasePath) {
      loadedConfig.cache = {
        ...loadedConfig.cache,
        databasePath: path.join(os.homedir(), '.fina', 'cache.sqlite'),
      };
    }

    if (options?.silent) {
      loadedConfig.logLevel = LogLevel.ERROR;
    }

    if (options?.verbose) {
      loadedConfig.logLevel = LogLevel.DEBUG;
    }

    return loadedConfig;
  } catch (error) {
    console.error(`❌ Error loading configuration: ${(error as Error).message}`);
    process.exit(1);
  }
}

/**
 * Synchronously retreives loaded config. Does not check that it exists.
 * @returns The configuration object if it exists.
 */
export function fetchCachedConfig(): AppConfig | null {
  return loadedConfig;
}

/**
 * Applies environment variable overrides to a configuration object.
 * This ensures that environment variables have the highest precedence.
 * @param config - The base configuration object loaded from a file.
 * @returns The configuration object with overrides applied.
 */
function applyEnvironmentVariableOverrides(config: AppConfig): AppConfig {
  const newConfig = { ...config }; // Avoid mutating the original object

  // Helper to ensure nested objects exist before setting properties
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ensurePath = (obj: any, path: string[]) => {
    let current = obj;
    for (const key of path) {
      if (current[key] === undefined) {
        current[key] = {};
      }
      current = current[key];
    }
    return current;
  };

  const providerFromEnv = process.env.FINA_DEFAULT_PROVIDER;
  if (providerFromEnv) {
    const defaults = ensurePath(newConfig, ['defaults']);
    defaults.provider = providerFromEnv;
  }

  const alphaVantageKey = process.env.ALPHAVANTAGE_API_KEY;
  if (alphaVantageKey) {
    const providerConfig = ensurePath(newConfig, ['providers', 'alphaVantage']);
    providerConfig.apiKey = alphaVantageKey;
  }

  const polygonKey = process.env.POLYGON_API_KEY;
  if (polygonKey) {
    const providerConfig = ensurePath(newConfig, ['providers', 'polygon']);
    providerConfig.apiKey = polygonKey;
  }

  const loggingLevel = process.env.LOGGING_LEVEL;
  if (loggingLevel) {
    newConfig.logLevel = getLogLevelFromString(loggingLevel);
  }
  
  return newConfig;
}
