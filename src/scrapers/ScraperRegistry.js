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
     * Iterates through registered scrapers in order.
     * Returns results from the first scraper that successfully fetches items without throwing an error.
     * @param {string} url Search URL
     * @returns {Promise<Array>} Array of raw items
     */
    async fetchItemsWithFallback(url) {
        if (this.scrapers.length === 0) {
            this.logger.error('No scrapers registered!');
            return [];
        }

        for (const scraper of this.scrapers) {
            try {
                this.logger.info(`Attempting to fetch with scraper: ${scraper.name}`);
                // Assuming all scrapers have a fetchRawItems(url) method
                const items = await scraper.instance.fetchRawItems(url);
                return items; // Success! Return items (even if empty, 0 results is a valid response)
            } catch (err) {
                this.logger.warn(`Scraper ${scraper.name} failed: ${err.message}. Trying next (if any)...`);
            }
        }

        this.logger.error('All scrapers failed for URL: ' + url);
        throw new Error('All scrapers failed');
    }
}

module.exports = ScraperRegistry;
