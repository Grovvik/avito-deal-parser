const fs = require('fs');
const path = require('path');
const Logger = require('../utils/logger');

class DealsManager {
    constructor(dataDir = 'data/') {
        this.logger = new Logger('DealsManager');
        this.dealsFile = path.join(dataDir, 'deals.json');
        this.deals = this.loadDeals();
    }

    loadDeals() {
        if (!fs.existsSync(this.dealsFile)) {
            return [];
        }
        try {
            const parsed = JSON.parse(fs.readFileSync(this.dealsFile, 'utf8'));
            return Array.isArray(parsed) ? parsed.filter(d => !d.hidden) : [];
        } catch (err) {
            this.logger.error(`Failed to read deals: ${err.message}`);
            return [];
        }
    }

    saveDeals() {
        try {
            fs.writeFileSync(this.dealsFile, JSON.stringify(this.deals, null, 2));
        } catch (err) {
            this.logger.error(`Failed to save deals: ${err.message}`);
        }
    }

    addDeal(deal) {
        const { hidden, ...cleanDeal } = deal;
        this.deals.unshift({
            ...cleanDeal,
            sentAt: new Date().toISOString()
        });

        if (this.deals.length > 500) {
            this.deals = this.deals.slice(0, 500);
        }

        this.saveDeals();
        if (typeof this.onDealAdded === 'function') {
            this.onDealAdded(deal);
        }
        if (typeof this.onDealsChanged === 'function') {
            this.onDealsChanged(this.deals);
        }
    }

    getDeals() {
        return this.deals;
    }

    deleteDeal(id) {
        const index = this.deals.findIndex(d => String(d.id) === String(id));
        if (index !== -1) {
            this.deals.splice(index, 1);
            this.saveDeals();
            if (typeof this.onDealsChanged === 'function') {
                this.onDealsChanged(this.deals);
            }
        }
    }

    updateDealPrice(id, newPrice) {
        const deal = this.deals.find(d => String(d.id) === String(id));
        if (deal) {
            deal.price = newPrice;
            this.saveDeals();
            if (typeof this.onDealsChanged === 'function') {
                this.onDealsChanged(this.deals);
            }
        }
    }

    clearDeals() {
        this.deals = [];
        this.saveDeals();
        this.logger.info('Deals list cleared.');
        if (typeof this.onDealsChanged === 'function') {
            this.onDealsChanged(this.deals);
        }
    }
}

module.exports = DealsManager;
