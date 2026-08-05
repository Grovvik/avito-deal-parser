const Logger = require('../utils/logger');

class Scheduler {
    constructor(configManager, scraper, analyzer) {
        this.logger = new Logger('Scheduler');
        this.configManager = configManager;
        this.scraper = scraper;
        this.analyzer = analyzer;
        this.bot = null;
        this.timer = null;
    }

    setBot(bot) {
        this.bot = bot;
    }

    async runTask() {
        this.logger.info('Starting scheduled check...');
        const searches = this.configManager.config.searches || [];

        for (const search of searches) {
            try {
                const rawItems = await this.scraper.fetchRawItems(search.url);

                const deals = this.analyzer.analyze(rawItems, search.maxPrice, search.keywords);

                for (const item of deals) {
                    if (!this.configManager.isItemSent(item.id)) {
                        if (this.bot) {
                            await this.bot.sendDealAlert(item, item.price, item.url);
                            this.configManager.markItemAsSent(item.id);
                        }
                    }
                }
            } catch (err) {
                this.logger.error(`Error processing search URL [${search.url}]: ${err.message}`);
            }
        }
        this.logger.info('Scheduled check finished.');
    }

    async runManualCheck() {
        await this.runTask();
    }

    restart() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }

        const config = this.configManager.config;
        if (config.isPollingEnabled && config.intervalMinutes > 0) {
            const intervalMs = config.intervalMinutes * 60 * 1000;
            this.logger.info(`Polling started. Interval: ${config.intervalMinutes}m`);
            this.timer = setInterval(() => this.runTask(), intervalMs);
        } else {
            this.logger.info('Polling is paused.');
        }
    }
}

module.exports = Scheduler;