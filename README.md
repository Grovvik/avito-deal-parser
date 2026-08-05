# Avito Deal Parser

A Telegram bot for monitoring Avito listings. It uses Playwright to parse the JSON state of search results and filters items by price, keywords, and item type.

[Features](#features) • [Configuration](#configuration) • [Installation](#installation) • [Deployment](#deployment) • [License](#license)

## Features

* Extracts data directly from the frontend JSON state.
* Filters out accessories, spare parts, and reserved items using a predefined stop-word list.
* Telegram inline keyboard interface for managing search tasks, mandatory/optional keywords, price limits, and polling intervals.
* Proxy support for both Telegram API and Playwright.
* Saves browser cookies to reduce captcha triggers.

## Prerequisites

* Node.js v18+ (for manual installation)
* Docker and Docker Compose
* Telegram Bot Token
* Telegram User ID

## Installation

Clone the repository and navigate to the project directory. This step is required for any of the deployment methods:

```bash
git clone https://github.com/Grovvik/avito-deal-parser.git
cd avito-deal-parser
```

## Configuration

Create a `.env` file in the project root:

```env
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyZ
TELEGRAM_ADMIN_ID=987654321
PROXY=socks5://user:pass@proxy_host:1080     # Optional
AVITO_PROXY=http://user:pass@proxy_host:8080 # Optional
```

### Cookies Setup

Export cookies from an authorized Avito session in JSON format and save them to `data/cookies.json` before starting the application.

## Deployment

### Docker Compose

1. Create a `data` directory:

```bash
mkdir -p data
```

2. Create `docker-compose.yml` (if not already included in the repository):

```yaml
version: '3.8'

services:
  avito-bot:
    build: .
    container_name: avito_deal_parser
    restart: unless-stopped
    env_file:
      - .env
    volumes:
      - ./data:/app/data
```

3. Start the container:

```bash
docker compose up -d --build
```

### Docker CLI

```bash
docker build -t avito-deal-parser .

docker run -d \
  --name avito_deal_parser \
  --restart unless-stopped \
  --env-file .env \
  -v $(pwd)/data:/app/data \
  avito-deal-parser
```

### Manual Installation

```bash
npm install
npx playwright install chromium --with-deps
npm start
```

## Data Storage

The `/app/data` volume contains:

* `config.json`: Search tasks, intervals, and polling settings.
* `cookies.json`: Browser cookies.
* `sent_ids.json`: Processed item IDs to prevent duplicate alerts.

## License

Distributed under the MIT License. See [LICENSE](https://www.google.com/search?q=LICENSE) for more information.
