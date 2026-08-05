const Logger = require('../../utils/logger');
const mqtt = require('mqtt');

class MqttNotifier {
    constructor() {
        this.logger = new Logger('MqttNotifier');
        this.clients = new Map(); // url -> client cache
    }

    _getClient(config) {
        const { brokerUrl, username, password } = config;
        const cacheKey = `${brokerUrl}_${username || ''}_${password || ''}`;

        if (this.clients.has(cacheKey)) {
            return this.clients.get(cacheKey);
        }
        
        const options = {};
        if (username) options.username = username;
        if (password) options.password = password;

        const client = mqtt.connect(brokerUrl, options);
        
        client.on('error', (err) => {
            this.logger.error(`MQTT Client Error (${brokerUrl}): ${err.message}`);
        });

        this.clients.set(cacheKey, client);
        return client;
    }

    async sendDealAlert(item, price, url, config) {
        if (!config || !config.brokerUrl || !config.topic) {
            this.logger.warn('MQTT broker URL or topic not configured, skipping.');
            return;
        }

        try {
            const client = this._getClient(config);
            const payload = JSON.stringify({
                id: String(item.id),
                title: item.title || '',
                description: item.description || '',
                price: price ?? item.price ?? 0,
                url: item.url || '',
                image: item.image || '',
                category: item.category || '',
                location: item.location || '',
                searchUrl: url,
                timestamp: new Date().toISOString()
            });

            client.publish(config.topic, payload, { qos: 1 }, (err) => {
                if (err) {
                    this.logger.error(`MQTT publish failed: ${err.message}`);
                }
            });
        } catch (err) {
            this.logger.error(`MQTT alert failed: ${err.message}`);
        }
    }
}

module.exports = MqttNotifier;
