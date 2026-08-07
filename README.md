# Avito Deal Parser

[Прочитать на Русском](README.ru.md)

A powerful monitoring system for Avito listings featuring an extensible architecture for scrapers, multiple notification channels, and a modern React web dashboard. It uses Playwright to parse both JSON state and HTML of search results, filtering items by price, keywords, and item type.

[Features](#features) • [Configuration](#configuration) • [Web Panel](#web-panel) • [Installation](#installation) • [Deployment](#deployment)

## Features

* **Extensible Scraper Architecture**: Automatically falls back to HTML scraping if the primary JSON state scraper fails. Automatically maintains and saves fresh browser cookies.
* **Modern Web Panel**: A sleek, responsive dashboard built with React, Vite и Shadcn UI to manage search tasks, view deal history with images, and configure application settings.
* **Password Protection**: Protect your Web Panel with a password defined in `.env`. Password is hashed on the client side via SHA-256 before transmission.
* **Real-time Socket.IO Integration**: Fast, bi-directional communication between the Web Panel and backend server.
* **Telegram Bot**: In addition to the web panel, management is also available directly via the Telegram bot.
* **Variative types of notifications**:
  * **Telegram Bot**: Inline keyboard interface for managing tasks and receiving alerts with direct item links.
  * **Discord Webhook**: Supports embedding deal information with images and proxy support.
  * **MQTT Broker**: Sends clean, standardized JSON deal payloads to home automation services (e.g. Home Assistant).
* **Notification Management**: Toggle providers on/off and configure settings (Webhooks, Broker URLs, Chat IDs, Proxies) via dedicated modal windows.
* **Advanced Keyword Filtering**: Filters items using Mandatory (must include all) and Optional (must include at least one) keyword logic.
* **Proxy Support**: Connect via proxies for Telegram, Discord, and Playwright browsers.

## Prerequisites

* Node.js v18+ (for manual installation)
* Docker and Docker Compose (recommended)

## Configuration

Create a `.env` file in the project root. All modules are independent and start conditionally based on provided environment variables:

```env
# Web Server Configuration
WEB_PORT=3000                                # Starts the Web Panel on port 3000
WEB_PASSWORD=secret_password                 # Optional: Password authentication for Web Panel (SHA-256 protected)

# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNO # Starts the Telegram bot
TELEGRAM_ADMIN_ID=987654321

# Proxy Configuration
PROXY=socks5://user:pass@proxy_host:1080     # Proxy for Telegram & Discord (HTTP/HTTPS/SOCKS5)
AVITO_PROXY=http://user:pass@proxy_host:8080 # Proxy for Playwright/Avito fetching
```

## Web Panel

To access the Web Panel, specify `WEB_PORT` in your `.env` file.
1. Navigate to `http://localhost:<WEB_PORT>`
2. If `WEB_PASSWORD` is configured, log in using your password (hashed with SHA-256).
3. Manage active search tasks, cookies, and notification settings using interactive modal dialogs and switch toggles.
4. View real-time **System Status** (`Active`, `Paused`, `Pending`), analytics charts, and clear sent history as needed.

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
* `sent_ids.json`: Processed item IDs to prevent duplicate alerts (can be cleared via Web Panel).

## License

Distributed under the MIT License. See [LICENSE](https://www.google.com/search?q=LICENSE) for more information.
