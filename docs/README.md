<p align="center">
  <img src="docs/assets/logo.png" alt="Fina CLI Logo" width="200"/>
</p>

# Fina CLI - Full Documentation

Welcome to the comprehensive documentation for Fina CLI. This guide provides in-depth information on all commands, argument formats, configuration, and advanced features.

For a quick overview and installation instructions, please see the main [project README](../README.md).

---

## Table of Contents

### Getting Started
* **[Configuration](./configuration.md)**: How to set up your API keys and default settings.
* **[Core Concepts](./core-concepts.md)**: Understanding providers, outputs, and the caching layer.

### Commands
A detailed reference for each primary command.
* **[fina fetch security](./commands/fetch-security.md)**: In-depth guide to fetching historical security data.
* **[fina fetch options](./commands/fetch-options.md)**: In-depth guide to fetching historical options data.

### Argument Format Guides
Detailed explanations of the powerful mini-language used in command-line flags.
* **[Date Range Formatting](./guides/date-format.md)**: A complete guide to specifying time periods.
* **[Strike Filter Formatting](./guides/strike-filters.md)**: Mastering the art of selecting options strikes.
* **[Expiration Filter Formatting](./guides/expiration-filters.md)**: A complete guide to selecting expirations.

### Advanced Guides
* **[Output & Formatting](./guides/outputs.md)**: Configuring and using different output formats like Parquet, SQLite, and Google Sheets.
* **[Extending Fina](./guides/extending.md)**: A guide for developers who want to add new data providers or output formats.