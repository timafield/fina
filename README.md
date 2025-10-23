<p align="center">
  <img src="docs/assets/logo.png" alt="Fina CLI Logo" width="200"/>
</p>

# Fina

**Your Financial Data Swiss Army Knife for the Command Line.**

Stop wrestling with clunky web UIs and manual CSV exports. **Fina** is a blazingly fast, expert-focused command-line interface for fetching, filtering, and formatting financial market data. It's designed for developers, quants, and traders who live in the terminal and demand power and precision.

## Key Features 🚀

* 💰 **Stock & Options Data:** Pull historical data for both stocks and complex options chains.

* 🔬 **Advanced Filtering:** A powerful mini-language to surgically select the exact options contracts you need by strike, expiration, and moneyness.

* ⏱️ **Flexible Timeframes:** Fetch anything from years of daily history to intraday bars.

* 💾 **Multiple Output Formats:** Save data directly to **CSV**, **Parquet**, **SQLite**, or **Google Sheets**.

* ⚡ **Intelligent Caching:** Smart local caching to minimize API calls and speed up subsequent requests.

* 📝 **Execution Plans:** Preview your data pulls before you run them to see exactly what you're getting.

## Installation

```bash
npm install -g fina-cli
```

## Quick Start ⚡

Get a feel for the power of Fina in seconds.

### 1. Getting Security History

Let's get the last year of daily data for Apple and Tesla, and save each as a Parquet file.

```bash
fina fetch security -t AAPL TSLA -d -1y:0d -of parquet --op "$ticker$-1y.parquet"
```

> This command will create `AAPL-1y.parquet` and `TSLA-1y.parquet` in your current directory.

### 2. Unleash the Options Engine

This is where Fina shines. Find all **SPY calls** that expire in the **next 30 days** and are within **5% of the at-the-money price**, then show us the plan before fetching.

```bash
fina fetch options -t SPY -c -e "<=30d" -s "+-5%m" --plan
```

The `--plan` flag gives you a preview of the operation without using any API credits:

```
Execution Plan:
----------------
Operation:          Fetch Options History
Ticker:             SPY
Date Range:         2025-10-09 (previous day snapshot)
Filters:            Type=calls, Expiration<=30d, Strike=+/-5% of ATM
----------------
[Step 1/2] Discovering relevant strikes based on the underlying's price...
Found 42 unique strikes between $565.00 and $620.00 that match the criteria.

[Step 2/2] Fetching 1 day of history for all 42 discovered strikes.
Estimated API Calls:  ~42-45 calls
----------------
To execute this plan, run the same command without '--plan' or with '-y'.
```

## A Query Language for the Command Line

Fina's power comes from its argument format that acts like a mini-query language, especially for dates, strikes, and expirations. You can combine them to ask incredibly specific questions.

For a deep dive into every command and the full syntax for filters, see our comprehensive guide.

➡️ [**Read the Full Documentation**](docs/README.md) ⬅️

## Contributing

We love contributions! If you have an idea for a new feature, data provider, or output format, please open an issue or submit a pull request.

## License

This project is licensed under the **MIT License**. See the [LICENSE](./LICENSE) file for details.