const Logger = require('../utils/logger');

class Scheduler {
    constructor(configManager, dealsManager, scraperRegistry, notificationRegistry, analyzer) {
        this.logger = new Logger('Scheduler');
        this.configManager = configManager;
        this.dealsManager = dealsManager;
        this.scraperRegistry = scraperRegistry;
        this.notificationRegistry = notificationRegistry;
        this.analyzer = analyzer;
        this.timer = null;
    }

    async runTask() {
        this.logger.info('Starting scheduled check...');
        const config = this.configManager.config;
        const searches = config.searches || [];

        // Apply scraper ordering if defined in config
        if (config.scrapersOrder && config.scrapersOrder.length > 0) {
            const allScrapers = this.scraperRegistry.getScrapers();
            const orderedScrapers = [];
            for (const id of config.scrapersOrder) {
                const s = allScrapers.find(x => x.id === id);
                if (s) orderedScrapers.push(s);
            }
            // Add any missing scrapers at the end
            for (const s of allScrapers) {
                if (!orderedScrapers.find(x => x.id === s.id)) {
                    orderedScrapers.push(s);
                }
            }
            this.scraperRegistry.scrapers = orderedScrapers;
        }

        for (const search of searches) {
            try {
                // Use fallback logic
                const rawItems = await this.scraperRegistry.fetchItemsWithFallback(search.url);

                const deals = this.analyzer.analyze(rawItems, search.maxPrice, search.keywords);

                for (const item of deals) {
                    if (!this.configManager.isItemSent(item.id)) {
                        // Broadcast via registries
                        await this.notificationRegistry.broadcastDeal(item, item.price, search.url, config);
                        
                        // Mark as sent
                        this.configManager.markItemAsSent(item.id);
                        
                        // Add to deal history
                        this.dealsManager.addDeal({
                            id: item.id,
                            title: item.title,
                            price: item.price,
                            url: item.url,
                            image: item.image,
                            searchUrl: search.url
                        });
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