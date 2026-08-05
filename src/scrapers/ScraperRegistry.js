const Logger = require('../utils/logger');

class ScraperRegistry {
    constructor() {
        this.logger = new Logger('ScraperRegistry');
        this.scrapers = [];
    }

    /**
     * Registers a scraper.
     * @param {string} id Unique identifier for the scraper
     * @param {string} name Human-readable name
     * @param {object} instance Scraper instance
     */
    register(id, name, instance) {
        this.scrapers.push({ id, name, instance });
        this.logger.info(`Registered scraper: ${name} (${id})`);
    }

    getScrapers() {
        return this.scrapers;
    }

    /**
     * Iterates through registered scrapers in order (optionally sorted by scrapersOrder).
     * Returns results from the first scraper that successfully fetches items (> 0 items).
     * @param {string} url Search URL
     * @param {Array<string>} [scrapersOrder] Optional array of scraper IDs defining priority order
     * @returns {Promise<Array>} Array of raw items
     */
    async fetchItemsWithFallback(url, scrapersOrder = null) {
        if (this.scrapers.length === 0) {
            this.logger.error('No scrapers registered!');
            return [];
        }

        let orderedScrapers = [...this.scrapers];
        if (Array.isArray(scrapersOrder) && scrapersOrder.length > 0) {
            orderedScrapers.sort((a, b) => {
                const indexA = scrapersOrder.indexOf(a.id);
                const indexB = scrapersOrder.indexOf(b.id);
                const posA = indexA === -1 ? 999 : indexA;
                const posB = indexB === -1 ? 999 : indexB;
                return posA - posB;
            });
        }

        for (const scraper of orderedScrapers) {
            try {
                this.logger.info(`Attempting to fetch with scraper: ${scraper.name}`);
                const items = await scraper.instance.fetchRawItems(url);
                if (Array.isArray(items) && items.length > 0) {
                    return items;
                }
                this.logger.warn(`Scraper ${scraper.name} returned 0 items. Trying next fallback scraper...`);
            } catch (err) {
                this.logger.warn(`Scraper ${scraper.name} failed: ${err.message}. Trying next (if any)...`);
            }
        }

        this.logger.warn('All scrapers finished for URL (no items returned or all failed): ' + url);
        return [];
    }
}

module.exports = ScraperRegistry;
