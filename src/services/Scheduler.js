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
        this.isPending = false;
        this.onStatusChange = null;
    }

    async runTask() {
        if (this.isPending) {
            this.logger.info('Check already in progress, skipping...');
            return;
        }

        this.isPending = true;
        if (typeof this.onStatusChange === 'function') this.onStatusChange();

        try {
            this.logger.info('Starting scheduled check...');
            const config = this.configManager.config;
            const searches = config.searches || [];

            if (config.scrapersOrder && config.scrapersOrder.length > 0) {
                const allScrapers = this.scraperRegistry.getScrapers();
                const orderedScrapers = [];
                for (const id of config.scrapersOrder) {
                    const s = allScrapers.find(x => x.id === id);
                    if (s) orderedScrapers.push(s);
                }
                for (const s of allScrapers) {
                    if (!orderedScrapers.find(x => x.id === s.id)) {
                        orderedScrapers.push(s);
                    }
                }
                this.scraperRegistry.scrapers = orderedScrapers;
            }

            for (let i = 0; i < searches.length; i++) {
                const search = searches[i];
                try {
                    const rawItems = await this.scraperRegistry.fetchItemsWithFallback(search.url, config.scrapersOrder);

                    if (Array.isArray(rawItems) && rawItems.length > 0) {
                        const rawIds = new Set(rawItems.map(item => String(item.id)));
                        const currentDeals = [...this.dealsManager.getDeals()];
                        let expiredCount = 0;

                        for (const deal of currentDeals) {
                            if (deal.searchUrl === search.url || deal.url === search.url) {
                                if (!rawIds.has(String(deal.id))) {
                                    this.logger.info(`Deal ${deal.id} ("${deal.title}") is no longer active on Avito. Removing from deals...`);
                                    this.dealsManager.deleteDeal(deal.id);
                                    expiredCount++;
                                }
                            }
                        }

                        if (expiredCount > 0) {
                            this.logger.info(`Removed ${expiredCount} expired deal(s) for search URL [${search.url}]`);
                        }
                    }

                    const deals = this.analyzer.analyze(rawItems, search.maxPrice, search.keywords || search);

                    for (const item of deals) {
                        if (!this.configManager.isItemSent(item.id)) {
                            await this.notificationRegistry.broadcastDeal(item, item.price, search.url, config);

                            this.configManager.markItemAsSent(item.id);

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

                if (i < searches.length - 1) {
                    const delayMs = Math.floor(Math.random() * 4000) + 2000;
                    this.logger.info(`Waiting ${(delayMs / 1000).toFixed(1)}s before fetching next search task...`);
                    await new Promise(resolve => setTimeout(resolve, delayMs));
                }
            }
            this.logger.info('Scheduled check finished.');
        } finally {
            this.isPending = false;
            if (typeof this.onStatusChange === 'function') this.onStatusChange();
        }
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