const { Bot, session } = require('grammy');
const { SocksProxyAgent } = require('socks-proxy-agent');
const Logger = require('../utils/logger');
const UI = require('./UI');

class TelegramBot {
    constructor(token, adminId, configManager, scheduler, proxyUrl = null) {
        this.logger = new Logger('TelegramBot');
        this.adminId = Number(adminId);
        this.configManager = configManager;
        this.scheduler = scheduler;

        const agent = proxyUrl ? new SocksProxyAgent(proxyUrl) : null;
        this.bot = new Bot(token, {
            client: { baseFetchConfig: { agent, compress: true } }
        });

        this.initMiddleware();
        this.initHandlers();
    }

    initMiddleware() {
        this.bot.use(session({
            initial: () => ({
                adminState: null,
                dashboardMessageId: null,
                promptMessageId: null,
                managePage: 0,
                editingSearchIndex: null,
                tempSearchUrl: null,
                tempMaxPrice: null,
                tempMandatoryKeywords: null
            })
        }));

        this.bot.use(async (ctx, next) => {
            if (ctx.from?.id !== this.adminId) return;
            await next();
        });
    }

    async safeDeleteMessage(ctx, messageId) {
        if (!messageId) return;
        try { await ctx.api.deleteMessage(ctx.chat.id, messageId); } catch (e) {}
    }

    async safeEditDashboard(ctx, messageId) {
        const config = this.configManager.config;
        const text = UI.renderDashboardMessage(config, this.configManager.sentIds.size);
        const options = {
            parse_mode: 'HTML',
            link_preview_options: { is_disabled: true },
            reply_markup: UI.buildControlPanelKeyboard(config)
        };

        if (messageId) {
            try {
                await ctx.api.editMessageText(ctx.chat.id, messageId, text, options);
                ctx.session.dashboardMessageId = messageId;
                return;
            } catch (err) {
                if (err.message?.includes('message is not modified')) return;
                await this.safeDeleteMessage(ctx, messageId);
            }
        }

        const sent = await ctx.reply(text, options);
        ctx.session.dashboardMessageId = sent.message_id;
    }

    async safeEditManageSearches(ctx, messageId) {
        const searches = this.configManager.config.searches || [];
        const page = ctx.session.managePage || 0;
        const text = UI.renderManageSearchesMessage(searches.length);
        const options = {
            parse_mode: 'HTML',
            reply_markup: UI.buildManageSearchesKeyboard(searches, page, 6)
        };

        if (messageId) {
            try {
                await ctx.api.editMessageText(ctx.chat.id, messageId, text, options);
                ctx.session.dashboardMessageId = messageId;
                return;
            } catch (err) {
                if (err.message?.includes('message is not modified')) return;
                await this.safeDeleteMessage(ctx, messageId);
            }
        }

        const sent = await ctx.reply(text, options);
        ctx.session.dashboardMessageId = sent.message_id;
    }

    async safeEditSearchTask(ctx, messageId, index) {
        const searches = this.configManager.config.searches || [];
        const search = searches[index];
        if (!search) {
            return this.safeEditManageSearches(ctx, messageId);
        }

        const text = UI.renderEditSearchMessage(search, index);
        const options = {
            parse_mode: 'HTML',
            link_preview_options: { is_disabled: true },
            reply_markup: UI.buildEditSearchKeyboard(index)
        };

        if (messageId) {
            try {
                await ctx.api.editMessageText(ctx.chat.id, messageId, text, options);
                ctx.session.dashboardMessageId = messageId;
                return;
            } catch (err) {
                if (err.message?.includes('message is not modified')) return;
                await this.safeDeleteMessage(ctx, messageId);
            }
        }

        const sent = await ctx.reply(text, options);
        ctx.session.dashboardMessageId = sent.message_id;
    }

    async sendDealAlert(item, price, url) {
        const message = UI.renderDealNotification(item, price, url);
        try {
            await this.bot.api.sendMessage(this.adminId, message, {
                parse_mode: 'HTML',
                link_preview_options: { is_disabled: true }
            });
        } catch (err) {
            this.logger.error(`Failed to send alert: ${err.message}`);
        }
    }

    initHandlers() {
        this.bot.command('start', async (ctx) => {
            await this.safeDeleteMessage(ctx, ctx.message.message_id);
            if (ctx.session.promptMessageId) {
                await this.safeDeleteMessage(ctx, ctx.session.promptMessageId);
                ctx.session.promptMessageId = null;
            }
            ctx.session.adminState = null;
            await this.safeEditDashboard(ctx, null);
        });

        this.bot.on('callback_query:data', async (ctx) => {
            const action = ctx.callbackQuery.data;
            ctx.session.dashboardMessageId = ctx.callbackQuery.message?.message_id;

            if (action === 'noop') {
                await ctx.answerCallbackQuery();
                return;
            }

            if (action === 'back_to_dashboard') {
                if (ctx.session.promptMessageId) {
                    await this.safeDeleteMessage(ctx, ctx.session.promptMessageId);
                    ctx.session.promptMessageId = null;
                }
                ctx.session.adminState = null;
                await this.safeEditDashboard(ctx, ctx.session.dashboardMessageId);
                await ctx.answerCallbackQuery();
                return;
            }

            if (action === 'cancel_add_search') {
                if (ctx.session.promptMessageId) {
                    await this.safeDeleteMessage(ctx, ctx.session.promptMessageId);
                    ctx.session.promptMessageId = null;
                }
                ctx.session.adminState = null;
                ctx.session.tempSearchUrl = null;
                ctx.session.tempMaxPrice = null;
                ctx.session.tempMandatoryKeywords = null;
                await this.safeEditDashboard(ctx, ctx.session.dashboardMessageId);
                await ctx.answerCallbackQuery('Cancelled');
                return;
            }

            if (action.startsWith('cancel_edit_search_')) {
                const index = parseInt(action.replace('cancel_edit_search_', ''), 10);
                if (ctx.session.promptMessageId) {
                    await this.safeDeleteMessage(ctx, ctx.session.promptMessageId);
                    ctx.session.promptMessageId = null;
                }
                ctx.session.adminState = null;
                await this.safeEditSearchTask(ctx, ctx.session.dashboardMessageId, index);
                await ctx.answerCallbackQuery('Cancelled');
                return;
            }

            if (action === 'manage_searches') {
                if (ctx.session.promptMessageId) {
                    await this.safeDeleteMessage(ctx, ctx.session.promptMessageId);
                    ctx.session.promptMessageId = null;
                }
                ctx.session.adminState = null;
                await this.safeEditManageSearches(ctx, ctx.session.dashboardMessageId);
                await ctx.answerCallbackQuery();
                return;
            }

            if (action.startsWith('manage_page_')) {
                const page = parseInt(action.replace('manage_page_', ''), 10);
                ctx.session.managePage = isNaN(page) ? 0 : page;
                await this.safeEditManageSearches(ctx, ctx.session.dashboardMessageId);
                await ctx.answerCallbackQuery();
                return;
            }

            if (action.startsWith('select_search_')) {
                const index = parseInt(action.replace('select_search_', ''), 10);
                ctx.session.editingSearchIndex = index;
                await this.safeEditSearchTask(ctx, ctx.session.dashboardMessageId, index);
                await ctx.answerCallbackQuery();
                return;
            }

            if (action.startsWith('delete_search_')) {
                const index = parseInt(action.replace('delete_search_', ''), 10);
                const searches = [...(this.configManager.config.searches || [])];
                if (index >= 0 && index < searches.length) {
                    searches.splice(index, 1);
                    this.configManager.saveConfig({ searches });
                }
                await this.safeEditManageSearches(ctx, ctx.session.dashboardMessageId);
                await ctx.answerCallbackQuery('Task deleted');
                return;
            }

            if (action.startsWith('edit_param_url_')) {
                const index = parseInt(action.replace('edit_param_url_', ''), 10);
                ctx.session.editingSearchIndex = index;
                ctx.session.adminState = 'editing_search_url';
                const current = this.configManager.config.searches[index]?.url || '';

                const prompt = await ctx.reply(
                    `🔗 <b>Editing #${index + 1} - URL</b>\n\n` +
                    `Current URL:\n<code>${UI.escapeHtml(current)}</code>\n\n` +
                    `Send the new <b>Avito Search URL</b>:`,
                    { parse_mode: 'HTML', reply_markup: UI.buildCancelKeyboard(`cancel_edit_search_${index}`) }
                );
                ctx.session.promptMessageId = prompt.message_id;
                await ctx.answerCallbackQuery();
                return;
            }

            if (action.startsWith('edit_param_max_price_')) {
                const index = parseInt(action.replace('edit_param_max_price_', ''), 10);
                ctx.session.editingSearchIndex = index;
                ctx.session.adminState = 'editing_search_max_price';
                const current = this.configManager.config.searches[index]?.maxPrice || 0;

                const prompt = await ctx.reply(
                    `💰 <b>Editing #${index + 1} - Max Price</b>\n\n` +
                    `Current Max Price: <code>${current} ₽</code>\n\n` +
                    `Send the new <b>Max Price Limit</b> in ₽:`,
                    { parse_mode: 'HTML', reply_markup: UI.buildCancelKeyboard(`cancel_edit_search_${index}`) }
                );
                ctx.session.promptMessageId = prompt.message_id;
                await ctx.answerCallbackQuery();
                return;
            }

            if (action.startsWith('edit_param_mandatory_')) {
                const index = parseInt(action.replace('edit_param_mandatory_', ''), 10);
                ctx.session.editingSearchIndex = index;
                ctx.session.adminState = 'editing_search_mandatory';
                const search = this.configManager.config.searches[index];
                let currentStr = 'none';
                if (Array.isArray(search?.keywords)) currentStr = search.keywords.join(' ') || 'none';
                else if (search?.keywords?.mandatory?.length) currentStr = search.keywords.mandatory.join(' ');

                const prompt = await ctx.reply(
                    `📌 <b>Editing #${index + 1} - Mandatory Keywords</b>\n\n` +
                    `Current Mandatory Keywords: <code>${UI.escapeHtml(currentStr)}</code>\n\n` +
                    `Send keywords that <b>MUST ALL</b> be present (separated by space) or write <code>none</code>:`,
                    { parse_mode: 'HTML', reply_markup: UI.buildCancelKeyboard(`cancel_edit_search_${index}`) }
                );
                ctx.session.promptMessageId = prompt.message_id;
                await ctx.answerCallbackQuery();
                return;
            }

            if (action.startsWith('edit_param_optional_')) {
                const index = parseInt(action.replace('edit_param_optional_', ''), 10);
                ctx.session.editingSearchIndex = index;
                ctx.session.adminState = 'editing_search_optional';
                const search = this.configManager.config.searches[index];
                let currentStr = 'none';
                if (search?.keywords?.optional?.length) currentStr = search.keywords.optional.join(' ');

                const prompt = await ctx.reply(
                    `💡 <b>Editing #${index + 1} - Optional Keywords</b>\n\n` +
                    `Current Optional Keywords: <code>${UI.escapeHtml(currentStr)}</code>\n\n` +
                    `Send keywords where <b>AT LEAST ONE</b> must be present (separated by space) or write <code>none</code>:`,
                    { parse_mode: 'HTML', reply_markup: UI.buildCancelKeyboard(`cancel_edit_search_${index}`) }
                );
                ctx.session.promptMessageId = prompt.message_id;
                await ctx.answerCallbackQuery();
                return;
            }

            if (action === 'action_run_now') {
                await ctx.answerCallbackQuery('Starting check...');
                const msg = await ctx.reply('🔎 Manual check started...', { parse_mode: 'HTML' });
                await this.scheduler.runManualCheck();
                setTimeout(() => this.safeDeleteMessage(ctx, msg.message_id), 3000);
                return;
            }

            if (action === 'action_toggle_polling') {
                const isEnabled = !this.configManager.config.isPollingEnabled;
                this.configManager.saveConfig({ isPollingEnabled: isEnabled });
                this.scheduler.restart();
                await ctx.answerCallbackQuery(isEnabled ? 'Started' : 'Paused');
            } else if (action === 'set_interval') {
                ctx.session.adminState = 'awaiting_interval';
                const prompt = await ctx.reply('⏱ Send new <b>Polling Interval</b> in minutes (e.g. <code>5</code>):', {
                    parse_mode: 'HTML',
                    reply_markup: UI.buildCancelKeyboard('back_to_dashboard')
                });
                ctx.session.promptMessageId = prompt.message_id;
                await ctx.answerCallbackQuery();
                return;
            } else if (action === 'add_search') {
                ctx.session.adminState = 'awaiting_search_url';
                const prompt = await ctx.reply('🔗 <b>Step 1/4:</b> Send the new <b>Avito Search URL</b>:', {
                    parse_mode: 'HTML',
                    reply_markup: UI.buildCancelKeyboard('cancel_add_search')
                });
                ctx.session.promptMessageId = prompt.message_id;
                await ctx.answerCallbackQuery();
                return;
            }

            await this.safeEditDashboard(ctx, ctx.session.dashboardMessageId);
        });

        this.bot.on('message:text', async (ctx) => {
            if (ctx.message.text.startsWith('/')) {
                await this.safeDeleteMessage(ctx, ctx.message.message_id);
                return;
            }

            const state = ctx.session.adminState;
            if (!state) return;

            const textInput = ctx.message.text.trim();
            const userMsgId = ctx.message.message_id;

            if (state === 'awaiting_interval') {
                const parsedInterval = parseInt(textInput, 10);
                if (!isNaN(parsedInterval) && parsedInterval >= 1) {
                    this.configManager.saveConfig({ intervalMinutes: parsedInterval });
                    this.scheduler.restart();
                }
                await this.safeDeleteMessage(ctx, userMsgId);
                if (ctx.session.promptMessageId) {
                    await this.safeDeleteMessage(ctx, ctx.session.promptMessageId);
                    ctx.session.promptMessageId = null;
                }
                ctx.session.adminState = null;
                await this.safeEditDashboard(ctx, ctx.session.dashboardMessageId);
                return;
            }

            if (state === 'awaiting_search_url') {
                if (textInput.startsWith('http')) {
                    ctx.session.tempSearchUrl = textInput;
                    ctx.session.adminState = 'awaiting_search_max_price';

                    await this.safeDeleteMessage(ctx, userMsgId);
                    if (ctx.session.promptMessageId) await this.safeDeleteMessage(ctx, ctx.session.promptMessageId);

                    const prompt = await ctx.reply('💰 <b>Step 2/4:</b> Send the <b>Max Price Limit</b> in ₽ for this search (e.g. <code>5000</code>):', {
                        parse_mode: 'HTML',
                        reply_markup: UI.buildCancelKeyboard('cancel_add_search')
                    });
                    ctx.session.promptMessageId = prompt.message_id;
                    return;
                }
            } else if (state === 'awaiting_search_max_price') {
                const parsedPrice = parseInt(textInput, 10);
                if (!isNaN(parsedPrice) && parsedPrice > 0) {
                    ctx.session.tempMaxPrice = parsedPrice;
                    ctx.session.adminState = 'awaiting_search_mandatory_keywords';

                    await this.safeDeleteMessage(ctx, userMsgId);
                    if (ctx.session.promptMessageId) await this.safeDeleteMessage(ctx, ctx.session.promptMessageId);

                    const prompt = await ctx.reply('📌 <b>Step 3/4: Mandatory Keywords</b>\nSend keywords that <b>MUST ALL</b> be present (separated by space) or write <code>none</code>:', {
                        parse_mode: 'HTML',
                        reply_markup: UI.buildCancelKeyboard('cancel_add_search')
                    });
                    ctx.session.promptMessageId = prompt.message_id;
                    return;
                }
            } else if (state === 'awaiting_search_mandatory_keywords') {
                let mandatory = [];
                if (textInput.toLowerCase() !== 'none') {
                    mandatory = textInput.split(' ').map(k => k.trim().toLowerCase()).filter(Boolean);
                }
                ctx.session.tempMandatoryKeywords = mandatory;
                ctx.session.adminState = 'awaiting_search_optional_keywords';

                await this.safeDeleteMessage(ctx, userMsgId);
                if (ctx.session.promptMessageId) await this.safeDeleteMessage(ctx, ctx.session.promptMessageId);

                const prompt = await ctx.reply('💡 <b>Step 4/4: Optional Keywords</b>\nSend keywords where <b>AT LEAST ONE</b> must be present (separated by space) or write <code>none</code>:', {
                    parse_mode: 'HTML',
                    reply_markup: UI.buildCancelKeyboard('cancel_add_search')
                });
                ctx.session.promptMessageId = prompt.message_id;
                return;
            } else if (state === 'awaiting_search_optional_keywords') {
                let optional = [];
                if (textInput.toLowerCase() !== 'none') {
                    optional = textInput.split(' ').map(k => k.trim().toLowerCase()).filter(Boolean);
                }

                const currentSearches = this.configManager.config.searches || [];
                currentSearches.push({
                    url: ctx.session.tempSearchUrl,
                    maxPrice: ctx.session.tempMaxPrice,
                    keywords: {
                        mandatory: ctx.session.tempMandatoryKeywords || [],
                        optional: optional
                    }
                });

                this.configManager.saveConfig({ searches: currentSearches });

                ctx.session.tempSearchUrl = null;
                ctx.session.tempMaxPrice = null;
                ctx.session.tempMandatoryKeywords = null;

                await this.safeDeleteMessage(ctx, userMsgId);
                if (ctx.session.promptMessageId) {
                    await this.safeDeleteMessage(ctx, ctx.session.promptMessageId);
                    ctx.session.promptMessageId = null;
                }

                ctx.session.adminState = null;
                await this.safeEditDashboard(ctx, ctx.session.dashboardMessageId);
                return;
            }

            const index = ctx.session.editingSearchIndex;

            if (state === 'editing_search_url') {
                if (textInput.startsWith('http')) {
                    const searches = [...(this.configManager.config.searches || [])];
                    if (searches[index]) {
                        searches[index].url = textInput;
                        this.configManager.saveConfig({ searches });
                    }
                    await this.safeDeleteMessage(ctx, userMsgId);
                    if (ctx.session.promptMessageId) {
                        await this.safeDeleteMessage(ctx, ctx.session.promptMessageId);
                        ctx.session.promptMessageId = null;
                    }
                    ctx.session.adminState = null;
                    await this.safeEditSearchTask(ctx, ctx.session.dashboardMessageId, index);
                    return;
                }
            } else if (state === 'editing_search_max_price') {
                const parsedPrice = parseInt(textInput, 10);
                if (!isNaN(parsedPrice) && parsedPrice > 0) {
                    const searches = [...(this.configManager.config.searches || [])];
                    if (searches[index]) {
                        searches[index].maxPrice = parsedPrice;
                        this.configManager.saveConfig({ searches });
                    }
                    await this.safeDeleteMessage(ctx, userMsgId);
                    if (ctx.session.promptMessageId) {
                        await this.safeDeleteMessage(ctx, ctx.session.promptMessageId);
                        ctx.session.promptMessageId = null;
                    }
                    ctx.session.adminState = null;
                    await this.safeEditSearchTask(ctx, ctx.session.dashboardMessageId, index);
                    return;
                }
            } else if (state === 'editing_search_mandatory') {
                let mandatory = [];
                if (textInput.toLowerCase() !== 'none') {
                    mandatory = textInput.split(' ').map(k => k.trim().toLowerCase()).filter(Boolean);
                }
                const searches = [...(this.configManager.config.searches || [])];
                if (searches[index]) {
                    const currentOpt = searches[index].keywords?.optional || [];
                    searches[index].keywords = {
                        mandatory: mandatory,
                        optional: currentOpt
                    };
                    this.configManager.saveConfig({ searches });
                }
                await this.safeDeleteMessage(ctx, userMsgId);
                if (ctx.session.promptMessageId) {
                    await this.safeDeleteMessage(ctx, ctx.session.promptMessageId);
                    ctx.session.promptMessageId = null;
                }
                ctx.session.adminState = null;
                await this.safeEditSearchTask(ctx, ctx.session.dashboardMessageId, index);
                return;
            } else if (state === 'editing_search_optional') {
                let optional = [];
                if (textInput.toLowerCase() !== 'none') {
                    optional = textInput.split(' ').map(k => k.trim().toLowerCase()).filter(Boolean);
                }
                const searches = [...(this.configManager.config.searches || [])];
                if (searches[index]) {
                    let currentMandatory = [];
                    if (Array.isArray(searches[index].keywords)) {
                        currentMandatory = searches[index].keywords;
                    } else if (searches[index].keywords?.mandatory) {
                        currentMandatory = searches[index].keywords.mandatory;
                    }
                    searches[index].keywords = {
                        mandatory: currentMandatory,
                        optional: optional
                    };
                    this.configManager.saveConfig({ searches });
                }
                await this.safeDeleteMessage(ctx, userMsgId);
                if (ctx.session.promptMessageId) {
                    await this.safeDeleteMessage(ctx, ctx.session.promptMessageId);
                    ctx.session.promptMessageId = null;
                }
                ctx.session.adminState = null;
                await this.safeEditSearchTask(ctx, ctx.session.dashboardMessageId, index);
                return;
            }

            await this.safeDeleteMessage(ctx, userMsgId);
        });
    }

    start() {
        this.bot.start({ onStart: (botInfo) => this.logger.info(`Bot started as @${botInfo.username}`) });
    }
}

module.exports = TelegramBot;