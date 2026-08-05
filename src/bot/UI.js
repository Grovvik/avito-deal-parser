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
            .text(`${i18n.t('interval')}: ${config.intervalMinutes} ${i18n.t('minutes')}`, 'set_interval')
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

    static buildEditSearchKeyboard(index) {
        return new InlineKeyboard()
            .text(`🔗 ${i18n.t('edit_url')}`, `edit_param_url_${index}`)
            .text(`💰 ${i18n.t('edit_max_price')}`, `edit_param_max_price_${index}`)
            .row()
            .text(`📌 ${i18n.t('edit_mandatory_kw')}`, `edit_param_mandatory_${index}`)
            .row()
            .text(`💡 ${i18n.t('edit_optional_kw')}`, `edit_param_optional_${index}`)
            .row()
            .text(`🗑 ${i18n.t('delete_search')}`, `delete_search_${index}`)
            .row()
            .text(i18n.t('manage_searches'), 'manage_searches');
    }

    static buildCancelKeyboard(cancelAction = 'back_to_dashboard') {
        return new InlineKeyboard().text(`❌ ${i18n.t('cancel')}`, cancelAction);
    }

    static renderDashboardMessage(config, sentCount) {
        let searchesStr = '<code>No active searches</code>';
        if (config.searches && config.searches.length > 0) {
            searchesStr = config.searches.map((s, i) => {
                let words = '[No Keywords]';
                const mandatory = s.mandatoryKeywords || s.keywords?.mandatory || (Array.isArray(s.keywords) ? s.keywords : []);
                const optional = s.optionalKeywords || s.keywords?.optional || [];
                const m = mandatory.length ? `Req: ${mandatory.join(', ')}` : '';
                const o = optional.length ? `Opt: ${optional.join(', ')}` : '';
                const parts = [m, o].filter(Boolean);
                if (parts.length > 0) words = `[${parts.join(' | ')}]`;
                return `${i + 1}. <a href="${s.url}">Link</a> | 💰 <b>≤ ${s.maxPrice} ₽</b> | ${this.escapeHtml(words)}`;
            }).join('\n');
        }

        return `🤖 <b>${i18n.t('dashboard_title')}</b>\n\n` +
               `<b>${i18n.t('polling_status')}:</b> ${config.isPollingEnabled ? '🟢 ' + i18n.t('enabled') : '🔴 ' + i18n.t('disabled')}\n` +
               `<b>${i18n.t('interval')}:</b> <code>${config.intervalMinutes} ${i18n.t('minutes')}</code>\n` +
               `<b>${i18n.t('total_deals')}:</b> <code>${sentCount} items</code>\n\n` +
               `<b>Active Search Tasks (${config.searches?.length || 0}):</b>\n${searchesStr}`;
    }

    static renderManageSearchesMessage(searchesCount) {
        if (searchesCount === 0) {
            return `⚙️ <b>${i18n.t('manage_searches_title')}</b>\n\n<i>No active search tasks found. Click "Add Search Task" on dashboard to create one.</i>`;
        }
        return `⚙️ <b>${i18n.t('manage_searches_title')}</b>\nSelect a task from the list below to edit its parameters:`;
    }

    static renderEditSearchMessage(search, index) {
        let reqWords = '<i>None</i>';
        let optWords = '<i>None</i>';

        const mandatory = search.mandatoryKeywords || search.keywords?.mandatory || (Array.isArray(search.keywords) ? search.keywords : []);
        const optional = search.optionalKeywords || search.keywords?.optional || [];

        if (mandatory.length) {
            reqWords = mandatory.map(w => `<code>${this.escapeHtml(w)}</code>`).join(' ');
        }
        if (optional.length) {
            optWords = optional.map(w => `<code>${this.escapeHtml(w)}</code>`).join(' ');
        }

        return `✏️ <b>Editing Search Task #${index + 1}</b>\n\n` +
               `🔗 <b>URL:</b> <a href="${search.url}">Open Link</a>\n` +
               `💰 <b>Max Price:</b> <code>${search.maxPrice} ₽</code>\n` +
               `📌 <b>Mandatory Keywords:</b> ${reqWords}\n` +
               `💡 <b>Optional Keywords:</b> ${optWords}\n\n` +
               `Choose a parameter to edit:`;
    }

    static renderDealNotification(item, price, url) {
        const location = item.geo?.formattedAddress || item.location?.name || item.location || 'Not specified';
        const category = item.category?.name || item.category || 'Not specified';
        const ratingInfo = item.rating?.score 
            ? `⭐️ ${item.rating.score} (${item.rating.summary || ''})` 
            : null;
    
        let infoBlock = `📍 <b>Location:</b> ${this.escapeHtml(location)}\n` +
                        `📁 <b>Category:</b> ${this.escapeHtml(category)}`;
        
        if (ratingInfo) {
            infoBlock += `\n👤 <b>Seller:</b> ${this.escapeHtml(ratingInfo)}`;
        }
    
        return `${i18n.t('deal_alert')}\n\n` +
               `📌 <b>Title:</b> ${this.escapeHtml(item.title)}\n` +
               `💰 <b>${i18n.t('price')}:</b> <code>${price} ₽</code>\n` +
               `🆔 <b>ID:</b> <code>${item.id}</code>\n\n` +
               `${infoBlock}\n\n` +
               `🔗 <a href="${url}">Open on Avito</a>`;
    }
}

module.exports = UI;