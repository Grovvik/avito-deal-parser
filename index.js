require('dotenv').config();

const ConfigManager = require('./src/services/ConfigManager');
const Scheduler = require('./src/services/Scheduler');
const TelegramBot = require('./src/bot/TelegramBot');
const Logger = require('./src/utils/logger');
const AvitoJsonScraper = require('./src/scrapers/AvitoJsonScraper');
const DealAnalyzer = require('./src/utils/DealAnalyzer');

const logger = new Logger('App');

const { TELEGRAM_BOT_TOKEN, TELEGRAM_ADMIN_ID, PROXY, AVITO_PROXY } = process.env;

if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_ADMIN_ID) {
    logger.error('CRITICAL: TELEGRAM_BOT_TOKEN and TELEGRAM_ADMIN_ID must be set!');
    process.exit(1);
}

const configManager = new ConfigManager('data/');

const scraper = new AvitoJsonScraper(configManager.getCookiesFilePath(), AVITO_PROXY);
const analyzer = new DealAnalyzer();

const scheduler = new Scheduler(configManager, scraper, analyzer);

const bot = new TelegramBot(
    TELEGRAM_BOT_TOKEN,
    TELEGRAM_ADMIN_ID,
    configManager,
    scheduler,
    PROXY
);

scheduler.setBot(bot);

logger.info('Initializing system...');
scheduler.restart();

if (configManager.config.isPollingEnabled) {
    scheduler.runTask();
}

bot.start();