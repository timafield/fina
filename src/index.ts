#!/usr/bin/env node

import { Command } from 'commander';
import { fetchSecurityCommand } from './commands/fetchSecurity.js';
import { setupCommand } from './commands/setupCommand.js';

const program = new Command();

program
  .name('fina')
  .description('A command-line interface (CLI) for financial analysis and data fetching.')
  .version('0.1.0')
  .option('-C, --config <path>', 'Specify a custom configuration file path')
  .option('--silent', 'Suppress all non-error output')
  .option('--verbose', 'Print detailed output');

const fetchCmd = program.command('fetch')
  .description('Fetch financial data from various sources.');

fetchCmd.command('security')
  .description('Fetch historical price data for securities.')
  .requiredOption('-t, --ticker <TICKERS...>', 'Security ticker(s) to fetch')
  .option('-d, --date <range>', 'Date range for history (e.g., -5y:0d, 2024-01-01:2024-12-31)', '-1d')
  .option('-g, --granularity <interval>', 'Time interval or granularity (e.g., d, 1h, 5m)', 'd')
  .option('-f, --fields <fields>', 'Data fields to retrieve (o,h,l,c,v,a,d)', 'ohlcvad')
  .option('--of, --output-format <format>', 'Output format (csv, parquet, sqlite, gsheet)')
  .option('--op, --output-path <path>', 'Output file path with templates (e.g., /data/$ticker$.csv)')
  .option('--cache-policy <policy>', 'Cache policy (use, ignore, refresh)', 'use')
  .option('--plan', 'Show the execution plan without running')
  .option('-y, --yes', 'Automatically answer yes to all prompts')
  .action(async (opts) => {
    await setupCommand(opts);
    await fetchSecurityCommand(opts);
  })
  .addHelpText('after', `
Examples:
  $ fina fetch security -t AAPL -d -1y:0d
  $ fina fetch security -t TSLA NVDA -g 1h -d -10d:0d --of parquet --op /data/$ticker$.parquet

Date Range Format (--date, -d):
  The date range is specified as '[start]:[end]'. Both ends are optional.

  Relative Dates:
    -5y:      From 5 years ago until today
    -30d:0d:  From 30 days ago until today
    -1d:      A snapshot for the previous trading day

  Absolute Dates (YYYY-MM-DD):
    2024-01-01:2024-12-31:  The full year of 2024
    :2025-01-01:             From the beginning of data until Jan 1, 2025
`);

fetchCmd.command('options')
  .description('Fetch historical options chain data for an underlying ticker.')
  .requiredOption('-t, --ticker <TICKERS...>', 'Underlying security ticker(s)')
  .option('-c, --calls', 'Fetch calls only')
  .option('-p, --puts', 'Fetch puts only')
  .option('-s, --strike <expression>', 'Strike filter expression (e.g., "+-10%m", ">=450")')
  .option('-e, --expiration <expression>', 'Expiration filter (e.g., "<=30d", "2025-12-19")')
  .option('--moneyness <types...>', 'Filter by moneyness (itm, atm, otm)')
  .option('-d, --date <range>', 'Date range for history (e.g., -30d:0d)', '-1d')
  .option('-g, --granularity <interval>', 'Time interval or granularity (e.g., 1d, 1h)', '1d')
  .option('-f, --fields <fields>', 'Data fields to retrieve (ohlcvi, g for greeks, iv30, etc.)', 'ohlcvi')
  .option('--of, --output-format <format>', 'Output format (csv, parquet, sqlite, gsheet)')
  .option('--op, --output-path <path>', 'Output file path with templates (e.g., /data/$ticker$-options.csv)')
  .option('--cache-policy <policy>', 'Cache policy (use, ignore, refresh)', 'use')
  .option('--plan', 'Show the execution plan without running')
  .option('-y, --yes', 'Automatically answer yes to all prompts')
  .option('--silent', 'Suppress all non-error output')
  // .action(fetchOptionsCommand)
  .action(() => { throw new Error('Unimplemented.'); })
  .addHelpText('after', `
Examples:
  $ fina fetch options -t SPY -d -1d -c --otm -e "<=30d"
  $ fina fetch options -t TSLA -d -30d:0d -s ">=20$l,<=40$l" -e 2026-01-16

Argument Formats:

  Date Range (--date, -d):
    -5y:0d, 2024-01-01:2024-12-31, -1d

  Strike Filter (--strike, -s): [operator][value][unit][relative_to]
    Operators: >, <, >=, <=, +-
    Units: $ (default), %
    Relative To: m (at-the-money), o (open), h (high), l (low)
    Examples: "-s 500", "-s '>=500,<=510'", "-s "+-10%m"

  Expiration Filter (--expiration, -e):
    Specific Date: "2025-12-19"
    Relative Date: "<=30d" (within 30 days from now)
    Date Range: ">=2025-10-01,<=2025-12-31"
    Specific List: "2025-10-17,2025-11-28"
`);

program.parse(process.argv);