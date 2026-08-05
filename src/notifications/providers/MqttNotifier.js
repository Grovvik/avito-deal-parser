const Logger = require('../../utils/logger');
const mqtt = require('mqtt');

class MqttNotifier {
    constructor() {
        this.logger = new Logger('MqttNotifier');
        this.clients = new Map(); // url -> client cache
    }

    _getClient(brokerUrl) {
        if (this.clients.has(brokerUrl)) {
            return this.clients.get(brokerUrl);
        }
        
        const client = mqtt.connect(brokerUrl);
        
        client.on('error', (err) => {
            this.logger.error(`MQTT Client Error (${brokerUrl}): ${err.message}`);
        });

        this.clients.set(brokerUrl, client);
        return client;
    }

    async sendDealAlert(item, price, url, config) {
        if (!config || !config.brokerUrl || !config.topic) {
            this.logger.warn('MQTT broker URL or topic not configured, skipping.');
            return;
        }

        try {
            const client = this._getClient(config.brokerUrl);
            const payload = JSON.stringify({
                item,
                price,
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
