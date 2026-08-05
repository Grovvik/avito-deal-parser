const Logger = require('../../utils/logger');
const https = require('https');
const http = require('http');
const { URL } = require('url');
const { SocksProxyAgent } = require('socks-proxy-agent');
const { HttpsProxyAgent } = require('https-proxy-agent');

class DiscordNotifier {
    constructor() {
        this.logger = new Logger('DiscordNotifier');
    }

    async postJson(urlStr, data, proxyUrl) {
        return new Promise((resolve, reject) => {
            const parsedUrl = new URL(urlStr);
            const postData = JSON.stringify(data);
            
            const options = {
                hostname: parsedUrl.hostname,
                port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
                path: parsedUrl.pathname + parsedUrl.search,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData)
                }
            };

            if (proxyUrl) {
                if (proxyUrl.startsWith('socks')) {
                    options.agent = new SocksProxyAgent(proxyUrl);
                } else {
                    options.agent = new HttpsProxyAgent(proxyUrl);
                }
            }

            const transport = parsedUrl.protocol === 'https:' ? https : http;
            const req = transport.request(options, (res) => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve();
                } else {
                    reject(new Error(`HTTP error! status: ${res.statusCode}`));
                }
            });

            req.on('error', (err) => reject(err));
            req.write(postData);
            req.end();
        });
    }

    async sendDealAlert(item, price, url, config) {
        if (!config || !config.webhookUrl) {
            this.logger.warn('Discord webhook URL not configured, skipping.');
            return;
        }

        const embed = {
            title: `New Deal: ${item.title || 'Unknown Title'}`,
            url: item.url,
            color: 0x0099ff,
            fields: [
                { name: 'Price', value: `${price} ₽`, inline: true },
                { name: 'Search URL', value: `[Link](${url})`, inline: true }
            ],
            timestamp: new Date().toISOString(),
        };

        if (item.image) {
            embed.thumbnail = { url: item.image };
        }

        try {
            await this.postJson(config.webhookUrl, { embeds: [embed] }, config.proxyUrl);
        } catch (err) {
            this.logger.error(`Discord alert failed: ${err.message}`);
        }
    }
}

module.exports = DiscordNotifier;
