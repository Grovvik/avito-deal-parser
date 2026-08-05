const UI = require('../../bot/UI');
const Logger = require('../../utils/logger');

class TelegramNotifier {
    constructor(botInstance, adminId) {
        this.bot = botInstance;
        this.adminId = adminId;
        this.logger = new Logger('TelegramNotifier');
    }

    async sendDealAlert(item, price, url, config) {
        const targetChatId = config?.chatId || this.adminId || process.env.TELEGRAM_ADMIN_ID;
        if (!this.bot || !targetChatId) return;
        
        const message = UI.renderDealNotification(item, price, url);
        try {
            await this.bot.api.sendMessage(targetChatId, message, {
                parse_mode: 'HTML',
                link_preview_options: { is_disabled: true }
            });
        } catch (err) {
            this.logger.error(`Telegram alert failed: ${err.message}`);
        }
    }
}

module.exports = TelegramNotifier;
