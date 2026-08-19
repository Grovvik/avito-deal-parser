const { InlineKeyboard } = require('grammy');
const i18n = require('../utils/i18n');

class UI {
    static escapeHtml(str) {
        return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    static buildControlPanelKeyboard(config) {
        return new InlineKeyboard()
            .text(i18n.t('run_check_now'), 'action_run_now')
            .text(config.isPollingEnabled ? i18n.t('pause_polling') : i18n.t('start_polling'), 'action_toggle_polling')
            .row()
            .text(i18n.t('add_search_task'), 'add_search')
            .text(i18n.t('manage_searches'), 'manage_searches')
            .row()
            .text(`⏱ ${i18n.t('interval')}: ${config.intervalMinutes || 5} ${i18n.t('minutes')}`, 'set_interval')
            .text(`🌙 ${i18n.t('night_interval')}: ${config.nightIntervalMinutes || 15} ${i18n.t('minutes')}`, 'set_night_interval')
            .row()
            .text(i18n.t('refresh_dashboard'), 'refresh_dashboard');
    }

    static buildManageSearchesKeyboard(searches, page = 0, pageSize = 6) {
        const kb = new InlineKeyboard();
        const totalPages = Math.ceil(searches.length / pageSize) || 1;
        const currentPage = Math.max(0, Math.min(page, totalPages - 1));

        const startIdx = currentPage * pageSize;
        const pageItems = searches.slice(startIdx, startIdx + pageSize);

        pageItems.forEach((s, relativeIdx) => {
            const globalIdx = startIdx + relativeIdx;
            let title = `#${globalIdx + 1}`;
            if (s.keywords?.mandatory?.length) {
                title += `: ${s.keywords.mandatory.join(', ')}`;
            } else if (Array.isArray(s.keywords) && s.keywords.length) {
                title += `: ${s.keywords.join(', ')}`;
            }
            kb.text(`✏️ ${title} | 💰 ${s.maxPrice} ₽`, `select_search_${globalIdx}`).row();
        });

        if (searches.length > pageSize) {
            const prevPage = currentPage > 0 ? currentPage - 1 : currentPage;
            const nextPage = currentPage < totalPages - 1 ? currentPage + 1 : currentPage;

            kb.text(currentPage > 0 ? '⬅️' : '⛔️', `manage_page_${prevPage}`)
              .text(`${currentPage + 1}/${totalPages}`, 'noop')
              .text(currentPage < totalPages - 1 ? '➡️' : '⛔️', `manage_page_${nextPage}`)
              .row();
        }

        kb.text(i18n.t('back_to_dashboard'), 'back_to_dashboard');
        return kb;
    }

    static buildEditSearchKeyboard(index, search = {}) {
        const includeReserved = Boolean(search.includeReserved || search.sendReserved);
        const onlyDelivery = Boolean(search.onlyDelivery || search.requireDelivery);

        const reservedText = `🔒 ${i18n.t('toggle_reserved')}: ${includeReserved ? '🟢 ' + i18n.t('reserved_allowed') : '🔴 ' + i18n.t('reserved_skipped')}`;
        const deliveryText = `🚚 ${i18n.t('toggle_delivery')}: ${onlyDelivery ? '🟢 ' + i18n.t('delivery_only') : '⚪️ ' + i18n.t('delivery_any')}`;

        return new InlineKeyboard()
            .text(`🔗 ${i18n.t('edit_url')}`, `edit_param_url_${index}`)
            .text(`💰 ${i18n.t('edit_max_price')}`, `edit_param_max_price_${index}`)
            .row()
            .text(`📌 ${i18n.t('edit_mandatory_kw')}`, `edit_param_mandatory_${index}`)
            .row()
            .text(`💡 ${i18n.t('edit_optional_kw')}`, `edit_param_optional_${index}`)
            .row()
            .text(reservedText, `toggle_search_reserved_${index}`)
            .row()
            .text(deliveryText, `toggle_search_delivery_${index}`)
            .row()
            .text(`🗑 ${i18n.t('delete_search')}`, `delete_search_${index}`)
            .row()
            .text(i18n.t('manage_searches'), 'manage_searches');
    }

    static buildCancelKeyboard(cancelAction = 'back_to_dashboard') {
        return new InlineKeyboard().text(`❌ ${i18n.t('cancel')}`, cancelAction);
    }

    static renderDashboardMessage(config, sentCount) {
        let searchesStr = `<code>${i18n.t('no_active_searches')}</code>`;
        if (config.searches && config.searches.length > 0) {
            searchesStr = config.searches.map((s, i) => {
                let words = `[${i18n.t('no_keywords')}]`;
                const mandatory = s.mandatoryKeywords || s.keywords?.mandatory || (Array.isArray(s.keywords) ? s.keywords : []);
                const optional = s.optionalKeywords || s.keywords?.optional || [];
                const m = mandatory.length ? `${i18n.t('req_short')}: ${mandatory.join(', ')}` : '';
                const o = optional.length ? `${i18n.t('opt_short')}: ${optional.join(', ')}` : '';
                const parts = [m, o].filter(Boolean);
                if (parts.length > 0) words = `[${parts.join(' | ')}]`;

                const flags = [];
                if (s.includeReserved || s.sendReserved) flags.push('🔒 ' + i18n.t('reserved_allowed'));
                if (s.onlyDelivery || s.requireDelivery) flags.push('🚚 ' + i18n.t('delivery_only'));
                const flagsStr = flags.length ? ` | <i>${flags.join(', ')}</i>` : '';

                return `${i + 1}. <a href="${s.url}">${i18n.t('link')}</a> | 💰 <b>≤ ${s.maxPrice} ₽</b> | ${this.escapeHtml(words)}${flagsStr}`;
            }).join('\n');
        }

        return `🤖 <b>${i18n.t('dashboard_title')}</b>\n\n` +
               `<b>${i18n.t('polling_status')}:</b> ${config.isPollingEnabled ? '🟢 ' + i18n.t('enabled') : '🔴 ' + i18n.t('disabled')}\n` +
               `<b>${i18n.t('interval')}:</b> <code>${config.intervalMinutes} ${i18n.t('minutes')}</code>\n` +
               `<b>${i18n.t('total_deals')}:</b> <code>${sentCount} ${i18n.t('items_unit')}</code>\n\n` +
               `<b>${i18n.t('active_search_tasks')} (${config.searches?.length || 0}):</b>\n${searchesStr}`;
    }

    static renderManageSearchesMessage(searchesCount) {
        if (searchesCount === 0) {
            return `⚙️ <b>${i18n.t('manage_searches_title')}</b>\n\n<i>${i18n.t('no_active_searches_hint')}</i>`;
        }
        return `⚙️ <b>${i18n.t('manage_searches_title')}</b>\n${i18n.t('select_task_to_edit')}`;
    }

    static renderEditSearchMessage(search, index) {
        let reqWords = `<i>${i18n.t('none')}</i>`;
        let optWords = `<i>${i18n.t('none')}</i>`;

        const mandatory = search.mandatoryKeywords || search.keywords?.mandatory || (Array.isArray(search.keywords) ? search.keywords : []);
        const optional = search.optionalKeywords || search.keywords?.optional || [];

        if (mandatory.length) {
            reqWords = mandatory.map(w => `<code>${this.escapeHtml(w)}</code>`).join(' ');
        }
        if (optional.length) {
            optWords = optional.map(w => `<code>${this.escapeHtml(w)}</code>`).join(' ');
        }

        const includeReserved = Boolean(search.includeReserved || search.sendReserved);
        const onlyDelivery = Boolean(search.onlyDelivery || search.requireDelivery);

        const reservedStatus = includeReserved ? '🟢 ' + i18n.t('reserved_allowed') : '🔴 ' + i18n.t('reserved_skipped');
        const deliveryStatus = onlyDelivery ? '🟢 ' + i18n.t('delivery_only') : '⚪️ ' + i18n.t('delivery_any');

        return `✏️ <b>${i18n.t('editing_search_task')} #${index + 1}</b>\n\n` +
               `🔗 <b>${i18n.t('url')}:</b> <a href="${search.url}">${i18n.t('open_link')}</a>\n` +
               `💰 <b>${i18n.t('max_price')}:</b> <code>${search.maxPrice} ₽</code>\n` +
               `📌 <b>${i18n.t('mandatory_keywords')}:</b> ${reqWords}\n` +
               `💡 <b>${i18n.t('optional_keywords')}:</b> ${optWords}\n` +
               `🔒 <b>${i18n.t('toggle_reserved')}:</b> ${reservedStatus}\n` +
               `🚚 <b>${i18n.t('toggle_delivery')}:</b> ${deliveryStatus}\n\n` +
               `${i18n.t('choose_param_to_edit')}`;
    }

    static renderDealNotification(item, price, url, priceDropInfo = null) {
        const location = item.geo?.formattedAddress || item.location?.name || item.location || i18n.t('not_specified');
        const category = item.category?.name || item.category || i18n.t('not_specified');
        const ratingInfo = item.rating?.score 
            ? `⭐️ ${item.rating.score} (${item.rating.summary || ''})` 
            : null;
    
        let infoBlock = `📍 <b>${i18n.t('location')}:</b> ${this.escapeHtml(location)}\n` +
                        `📁 <b>${i18n.t('category')}:</b> ${this.escapeHtml(category)}`;
        
        if (ratingInfo) {
            infoBlock += `\n👤 <b>${i18n.t('seller')}:</b> ${this.escapeHtml(ratingInfo)}`;
        }

        const isUpdate = priceDropInfo && priceDropInfo.type === 'update';
        const titleText = isUpdate ? i18n.t('price_update_alert') : i18n.t('deal_alert');
        
        let priceText = `<code>${price} ₽</code>`;
        if (isUpdate && priceDropInfo.oldPrice) {
            priceText = `<s>${priceDropInfo.oldPrice} ₽</s> ➡️ <code>${price} ₽</code>`;
        }
    
        return `${titleText}\n\n` +
               `📌 <b>${i18n.t('title')}:</b> ${this.escapeHtml(item.title)}\n` +
               `💰 <b>${i18n.t('price')}:</b> ${priceText}\n` +
               `🆔 <b>ID:</b> <code>${item.id}</code>\n\n` +
               `${infoBlock}\n\n` +
               `🔗 <a href="${item.url || url}">${i18n.t('open_on_avito')}</a>`;
    }
}

module.exports = UI;