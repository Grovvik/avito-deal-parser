const fs = require('fs');
const path = require('path');
const Logger = require('../utils/logger');

class ConfigManager {
    constructor(dataDir = 'data/') {
        this.logger = new Logger('ConfigManager');
        this.dataDir = dataDir;
        this.configFile = path.join(this.dataDir, 'config.json');
        this.sentIdsFile = path.join(this.dataDir, 'sent_ids.json');
        this.cookiesFile = path.join(this.dataDir, 'cookies.json');

        this.ensureDirectoryExists();
        this.config = this.loadConfig();
        this.sentIds = this.loadSentIds();
    }

    ensureDirectoryExists() {
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }
    }

    loadConfig() {
        if (!fs.existsSync(this.configFile)) {
            const initialConfig = {
                searches: [], // { url: string, maxPrice: number, keywords: string[] }
                intervalMinutes: 5,
                isPollingEnabled: false
            };
            this.config = initialConfig;
            this.saveConfig(initialConfig);
            return initialConfig;
        }
        try {
            return JSON.parse(fs.readFileSync(this.configFile, 'utf8'));
        } catch (err) {
            this.logger.error(`Failed to read config: ${err.message}`);
            return { searches: [], intervalMinutes: 5, isPollingEnabled: false };
        }
    }

    saveConfig(newConfig) {
        try {
            this.config = { ...this.config, ...newConfig };
            fs.writeFileSync(this.configFile, JSON.stringify(this.config, null, 2));
            this.logger.info('Configuration saved.');
        } catch (err) {
            this.logger.error(`Failed to save config: ${err.message}`);
        }
    }

    loadSentIds() {
        if (!fs.existsSync(this.sentIdsFile)) return new Set();
        try {
            const data = JSON.parse(fs.readFileSync(this.sentIdsFile, 'utf8'));
            return new Set(data);
        } catch (err) {
            return new Set();
        }
    }

    saveSentIds() {
        try {
            fs.writeFileSync(this.sentIdsFile, JSON.stringify(Array.from(this.sentIds), null, 2));
        } catch (err) {}
    }

    isItemSent(id) {
        return this.sentIds.has(String(id));
    }

    markItemAsSent(id) {
        this.sentIds.add(String(id));
        this.saveSentIds();
    }

    getCookiesFilePath() {
        return this.cookiesFile;
    }
}

module.exports = ConfigManager;