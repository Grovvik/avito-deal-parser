# Avito Deal Parser

A powerful monitoring system for Avito listings featuring an extensible architecture for scrapers, multiple notification channels, and a modern React web dashboard. It uses Playwright to parse both JSON state and HTML of search results, filtering items by price, keywords, and item type.

[Features](#features) • [Configuration](#configuration) • [Web Panel](#web-panel) • [Installation](#installation) • [Deployment](#deployment)

## Features

* **Extensible Scraper Architecture**: Automatically falls back to HTML scraping if the primary JSON state scraper fails.
* **Modern Web Panel (React + Vite)**: A sleek, responsive dashboard to manage search tasks, view deal history with images, and configure application settings on the fly.
* **Multi-Channel Notifications**:
  * **Telegram Bot**: Inline keyboard interface for managing tasks and receiving alerts.
  * **Discord Webhook**: Supports embedding deal information with images. Includes Proxy support!
  * **MQTT Broker**: Send deal payloads to IoT or automation services (e.g. Home Assistant).
* **Advanced Keyword Filtering**: Filters items using Mandatory (must include all) and Optional (must include at least one) keyword logic.
* **Proxy Support**: Connect via proxies for Telegram, Discord, and Playwright browsers.
* **Session Management**: Saves browser cookies to reduce Captcha triggers.

## Prerequisites

* Node.js v18+ (for manual installation)
* Docker and Docker Compose (recommended)

## Configuration

Create a `.env` file in the project root. All modules are independent and start conditionally based on provided environment variables:

```env
# Web Server Configuration
WEB_PORT=3000                                # Starts the Web Panel on port 3000

# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNO # Starts the Telegram bot
TELEGRAM_ADMIN_ID=987654321

# Proxy Configuration
PROXY=socks5://user:pass@proxy_host:1080     # Proxy for Telegram & Discord (HTTP/HTTPS/SOCKS5)
AVITO_PROXY=http://user:pass@proxy_host:8080 # Proxy for Playwright/Avito fetching
```

## Web Panel

To access the Web Panel, simply specify `WEB_PORT` in your `.env` file.
1. Navigate to `http://localhost:<WEB_PORT>`
2. Manage your active searches via visual modal windows.
3. Access **Deals Analytics**, dark mode theming, and adjust notification intervals dynamically from the **Settings** tab.

## Installation

Clone the repository:
```bash
git clone https://github.com/Grovvik/avito-deal-parser.git
cd avito-deal-parser
```

### Manual Installation

1. Install backend dependencies and browser binaries:
```bash
npm install
npx playwright install chromium --with-deps
```

2. Compile the React frontend:
```bash
cd frontend
npm install
npm run build
cd ..
```

3. Start the application:
```bash
node index.js
```

## Deployment

### Docker Compose

1. Create a `data` directory to store persistent configurations and history:
```bash
mkdir -p data
```

2. Start the container:
```bash
docker compose up -d --build
```
*(Ensure `docker-compose.yml` maps port `3000:3000` if you plan to use the Web Panel).*

### Docker CLI

```bash
docker build -t avito-deal-parser .

docker run -d \
  --name avito_deal_parser \
  --restart unless-stopped \
  --env-file .env \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  avito-deal-parser
```

## Data Storage

The `/app/data` volume contains:
* `config.json`: Search tasks, intervals, polling settings, and dynamic notification credentials.
* `deals.json`: The historical payload of the 500 most recently sent deals (used by the Web Panel).
* `cookies.json`: Browser cookies saved automatically to bypass anti-bot mechanisms.
* `sent_ids.json`: Processed item IDs to prevent duplicate alerts.

## License

Distributed under the MIT License. See [LICENSE](https://www.google.com/search?q=LICENSE) for more information.
