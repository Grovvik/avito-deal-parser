require('dotenv').config();

const ConfigManager = require('./src/services/ConfigManager');
const DealsManager = require('./src/services/DealsManager');
const Scheduler = require('./src/services/Scheduler');
const TelegramBot = require('./src/bot/TelegramBot');
const Logger = require('./src/utils/logger');
const DealAnalyzer = require('./src/utils/DealAnalyzer');

// Scrapers
const ScraperRegistry = require('./src/scrapers/ScraperRegistry');
const AvitoJsonScraper = require('./src/scrapers/AvitoJsonScraper');
const AvitoHtmlScraper = require('./src/scrapers/AvitoHtmlScraper');

// Notifications
const NotificationRegistry = require('./src/notifications/NotificationRegistry');
const TelegramNotifier = require('./src/notifications/providers/TelegramNotifier');
const DiscordNotifier = require('./src/notifications/providers/DiscordNotifier');
const MqttNotifier = require('./src/notifications/providers/MqttNotifier');

// Web Server
const WebServer = require('./src/web/WebServer');

const pkg = require('./package.json');
const logger = new Logger('App');
logger.info(`Starting Avito Deal Parser v${pkg.version}...`);

const { TELEGRAM_BOT_TOKEN, TELEGRAM_ADMIN_ID, PROXY, AVITO_PROXY, WEB_PORT } = process.env;

const configManager = new ConfigManager('data/');
const dealsManager = new DealsManager('data/');
const analyzer = new DealAnalyzer();

// Setup Scraper Registry
const scraperRegistry = new ScraperRegistry();
scraperRegistry.register('json', 'Avito JSON Scraper', new AvitoJsonScraper(configManager.getCookiesFilePath(), AVITO_PROXY));
scraperRegistry.register('html', 'Avito HTML Scraper', new AvitoHtmlScraper(AVITO_PROXY, configManager.getCookiesFilePath()));

// Setup Notification Registry
const notificationRegistry = new NotificationRegistry();
let telegramBotInstance = null;

const scheduler = new Scheduler(configManager, dealsManager, scraperRegistry, notificationRegistry, analyzer);

if (TELEGRAM_BOT_TOKEN && TELEGRAM_ADMIN_ID) {
    logger.info('Starting Telegram Bot...');
    const bot = new TelegramBot(
        TELEGRAM_BOT_TOKEN,
        TELEGRAM_ADMIN_ID,
        configManager,
        scheduler,
        PROXY
    );
    telegramBotInstance = bot.bot;
    bot.start();
} else {
    logger.info('Telegram Bot feature disabled (Missing TELEGRAM_BOT_TOKEN or TELEGRAM_ADMIN_ID).');
}

// Register Notification Providers
notificationRegistry.register('telegram', 'Telegram Bot', new TelegramNotifier(telegramBotInstance, TELEGRAM_ADMIN_ID));
notificationRegistry.register('discord', 'Discord Webhook', new DiscordNotifier());
notificationRegistry.register('mqtt', 'MQTT Broker', new MqttNotifier());

// Start Scheduler
logger.info('Initializing scheduler...');
scheduler.restart();
if (configManager.config.isPollingEnabled) {
    scheduler.runTask();
}

// Start Web Server
if (WEB_PORT) {
    logger.info(`Starting Web Server on port ${WEB_PORT}...`);
    const webServer = new WebServer(WEB_PORT, configManager, dealsManager, scraperRegistry, notificationRegistry, scheduler);
    dealsManager.onDealAdded = () => {
        webServer.broadcastDeals();
        webServer.broadcastStatus();
    };
    webServer.start();
} else {
    logger.info('Web Server feature disabled (Missing WEB_PORT).');
}