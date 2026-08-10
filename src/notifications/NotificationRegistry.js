const Logger = require('../utils/logger');

class NotificationRegistry {
    constructor() {
        this.logger = new Logger('NotificationRegistry');
        this.providers = new Map();
    }

    /**
     * Registers a notification provider.
     * @param {string} id Unique identifier for the provider (e.g., 'telegram', 'discord')
     * @param {string} name Human-readable name
     * @param {object} instance Provider instance
     */
    register(id, name, instance) {
        this.providers.set(id, { id, name, instance });
        this.logger.info(`Registered notification provider: ${name} (${id})`);
    }

    getProviders() {
        return Array.from(this.providers.values());
    }

    /**
     * Broadcasts a deal to all enabled notification channels.
     * @param {object} item The deal item
     * @param {number} price The extracted price
     * @param {string} url The search URL
     * @param {object} config The current application configuration
     * @param {object} [priceDropInfo] Optional price drop info { oldPrice, newPrice, type }
     */
    async broadcastDeal(item, price, url, config, priceDropInfo = null) {
        const notificationsConfig = config.notifications || {};
        
        for (const [id, providerData] of this.providers.entries()) {
            // Check if provider is enabled in config (default to false if not set, except for telegram which might be default true)
            const isEnabled = notificationsConfig[id]?.enabled === true || (id === 'telegram' && notificationsConfig[id]?.enabled !== false);
            
            if (isEnabled) {
                try {
                    await providerData.instance.sendDealAlert(item, price, url, notificationsConfig[id], priceDropInfo);
                } catch (err) {
                    this.logger.error(`Failed to send alert via ${providerData.name}: ${err.message}`);
                }
            }
        }
    }
}

module.exports = NotificationRegistry;
