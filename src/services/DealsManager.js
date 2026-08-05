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
            return JSON.parse(fs.readFileSync(this.dealsFile, 'utf8'));
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
        // Prepend new deal to the list
        this.deals.unshift({
            ...deal,
            sentAt: new Date().toISOString()
        });
        
        // Keep only the last 500 deals to prevent file from growing indefinitely
        if (this.deals.length > 500) {
            this.deals = this.deals.slice(0, 500);
        }
        
        this.saveDeals();
        if (typeof this.onDealAdded === 'function') {
            this.onDealAdded(deal);
        }
    }

    getDeals() {
        return this.deals;
    }

    deleteDeal(id) {
        this.deals = this.deals.filter(d => String(d.id) !== String(id));
        this.saveDeals();
    }
}

module.exports = DealsManager;
