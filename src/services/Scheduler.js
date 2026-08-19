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
        this.lastLoggedInterval = null;
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

                    const currentDeals = [...this.dealsManager.getDeals()];

                    if (Array.isArray(rawItems) && rawItems.length > 0) {
                        const allowReserved = Boolean(search.includeReserved || search.sendReserved);
                        const activeRawIds = new Set(
                            rawItems
                                .filter(item => allowReserved ? true : !item.isReserved)
                                .map(item => String(item.id))
                        );
                        let expiredCount = 0;

                        for (const deal of currentDeals) {
                            if (deal.searchUrl === search.url || deal.url === search.url) {
                                if (!activeRawIds.has(String(deal.id))) {
                                    this.logger.info(`Deal ${deal.id} ("${deal.title}") is reserved or no longer active on Avito. Deleting deal...`);
                                    this.dealsManager.deleteDeal(deal.id);
                                    this.configManager.removeSentId(deal.id);
                                    expiredCount++;
                                }
                            }
                        }

                        if (expiredCount > 0) {
                            this.logger.info(`Deleted ${expiredCount} expired/reserved deal(s) for search URL [${search.url}]`);
                        }
                    }

                    const deals = this.analyzer.analyze(rawItems, search.maxPrice, search);

                    for (const item of deals) {
                        const existingDeal = currentDeals.find(d => String(d.id) === String(item.id));

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
                        } else if (existingDeal && item.price < existingDeal.price) {
                            const priceDropType = config.priceDropNotificationType || 'update';
                            
                            if (priceDropType !== 'none') {
                                const priceDropInfo = {
                                    oldPrice: existingDeal.price,
                                    newPrice: item.price,
                                    type: priceDropType
                                };
                                await this.notificationRegistry.broadcastDeal(item, item.price, search.url, config, priceDropInfo);
                            }
                            
                            this.dealsManager.updateDealPrice(item.id, item.price);
                        }
                    }
                } catch (err) {
                    this.logger.error(`Error processing search URL [${search.url}]: ${err.message}`);
                }

                if (i < searches.length - 1) {
                    const delayMs = Math.floor(Math.random() * 5000) + 5000; // 5 to 10 seconds delay
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

    isCurrentlyNight() {
        const config = this.configManager.config;
        if (config.nightModeEnabled === false) return false;

        const startHour = Number.isInteger(config.nightStartHour) ? config.nightStartHour : 1;
        const endHour = Number.isInteger(config.nightEndHour) ? config.nightEndHour : 5;

        // Moscow is UTC+3 (no daylight saving time)
        const now = new Date();
        const utcHours = now.getUTCHours();
        const utcMinutes = now.getUTCMinutes();
        const mskHours = (utcHours + 3) % 24;

        const currentTotalMinutes = mskHours * 60 + utcMinutes;
        const startTotalMinutes = startHour * 60;
        const endTotalMinutes = endHour * 60;

        if (startTotalMinutes < endTotalMinutes) {
            return currentTotalMinutes >= startTotalMinutes && currentTotalMinutes < endTotalMinutes;
        } else {
            return currentTotalMinutes >= startTotalMinutes || currentTotalMinutes < endTotalMinutes;
        }
    }

    getActiveIntervalMinutes() {
        const config = this.configManager.config;
        const defaultDayInterval = Number(config.intervalMinutes) || 5;
        const defaultNightInterval = Number(config.nightIntervalMinutes) || 15;

        if (this.isCurrentlyNight()) {
            return defaultNightInterval;
        }
        return defaultDayInterval;
    }

    scheduleNext() {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }

        const config = this.configManager.config;
        if (!config.isPollingEnabled) {
            return;
        }

        const intervalMinutes = this.getActiveIntervalMinutes();
        const isNight = this.isCurrentlyNight();
        const currentModeKey = isNight ? `night_${intervalMinutes}` : `day_${intervalMinutes}`;

        if (this.lastLoggedInterval !== currentModeKey) {
            if (isNight) {
                this.logger.info(`Switched to night polling interval: ${intervalMinutes}m (01:00-05:00 MSK)`);
            } else {
                this.logger.info(`Switched to day polling interval: ${intervalMinutes}m`);
            }
            this.lastLoggedInterval = currentModeKey;
        }

        const intervalMs = intervalMinutes * 60 * 1000;
        this.logger.info(`Next check scheduled in ${intervalMinutes}m.`);

        this.timer = setTimeout(async () => {
            try {
                await this.runTask();
            } finally {
                this.scheduleNext();
            }
        }, intervalMs);
    }

    async runManualCheck() {
        await this.runTask();
    }

    restart() {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }

        const config = this.configManager.config;
        if (config.isPollingEnabled) {
            const intervalMinutes = this.getActiveIntervalMinutes();
            const isNight = this.isCurrentlyNight();
            this.lastLoggedInterval = isNight ? `night_${intervalMinutes}` : `day_${intervalMinutes}`;
            if (isNight) {
                this.logger.info(`Polling started with night interval: ${intervalMinutes}m (01:00-05:00 MSK)`);
            } else {
                this.logger.info(`Polling started with day interval: ${intervalMinutes}m`);
            }
            this.scheduleNext();
        } else {
            this.logger.info('Polling is paused.');
        }
    }
}

module.exports = Scheduler;