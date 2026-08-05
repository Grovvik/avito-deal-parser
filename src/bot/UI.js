const { InlineKeyboard } = require('grammy');

class UI {
    static escapeHtml(str) {
        return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    static buildControlPanelKeyboard(config) {
        return new InlineKeyboard()
            .text('🔄 Run Check Now', 'action_run_now')
            .text(config.isPollingEnabled ? '⏸ Pause Polling' : '▶ Start Polling')
            .row()
            .text('➕ Add Search Task', 'add_search')
            .text('⚙️ Manage Searches', 'manage_searches')
            .row()
            .text(`⏱ Interval: ${config.intervalMinutes}m`, 'set_interval')
            .row()
            .text('📊 Refresh Dashboard', 'refresh_dashboard');
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

        kb.text('🔙 Back to Dashboard', 'back_to_dashboard');
        return kb;
    }

    static buildEditSearchKeyboard(index) {
        return new InlineKeyboard()
            .text('🔗 Edit URL', `edit_param_url_${index}`)
            .text('💰 Edit Max Price', `edit_param_max_price_${index}`)
            .row()
            .text('📌 Edit Mandatory Keywords', `edit_param_mandatory_${index}`)
            .row()
            .text('💡 Edit Optional Keywords', `edit_param_optional_${index}`)
            .row()
            .text('🗑 Delete Task', `delete_search_${index}`)
            .row()
            .text('⬅️ Back to Tasks List', 'manage_searches');
    }

    static buildCancelKeyboard(cancelAction = 'back_to_dashboard') {
        return new InlineKeyboard().text('❌ Cancel', cancelAction);
    }

    static renderDashboardMessage(config, sentCount) {
        let searchesStr = '<code>No active searches</code>';
        if (config.searches && config.searches.length > 0) {
            searchesStr = config.searches.map((s, i) => {
                let words = '[No Keywords]';
                if (Array.isArray(s.keywords)) {
                    if (s.keywords.length) words = `[${s.keywords.join(' ')}]`;
                } else if (s.keywords) {
                    const m = s.keywords.mandatory?.length ? `Req: ${s.keywords.mandatory.join(', ')}` : '';
                    const o = s.keywords.optional?.length ? `Opt: ${s.keywords.optional.join(', ')}` : '';
                    const parts = [m, o].filter(Boolean);
                    if (parts.length > 0) words = `[${parts.join(' | ')}]`;
                }
                return `${i + 1}. <a href="${s.url}">Link</a> | 💰 <b>≤ ${s.maxPrice} ₽</b> | ${this.escapeHtml(words)}`;
            }).join('\n');
        }

        return `🤖 <b>Avito Monitoring Control Panel</b>\n\n` +
               `<b>Status:</b> ${config.isPollingEnabled ? '🟢 Active' : '🔴 Paused'}\n` +
               `<b>Check Interval:</b> <code>${config.intervalMinutes} min</code>\n` +
               `<b>Sent Items History:</b> <code>${sentCount} items</code>\n\n` +
               `<b>Active Search Tasks (${config.searches?.length || 0}):</b>\n${searchesStr}`;
    }

    static renderManageSearchesMessage(searchesCount) {
        if (searchesCount === 0) {
            return `⚙️ <b>Manage Search Tasks</b>\n\n<i>No active search tasks found. Click "Add Search Task" on dashboard to create one.</i>`;
        }
        return `⚙️ <b>Manage Search Tasks</b>\nSelect a task from the list below to edit its parameters:`;
    }

    static renderEditSearchMessage(search, index) {
        let reqWords = '<i>None</i>';
        let optWords = '<i>None</i>';

        if (Array.isArray(search.keywords)) {
            if (search.keywords.length) reqWords = search.keywords.map(w => `<code>${this.escapeHtml(w)}</code>`).join(' ');
        } else if (search.keywords) {
            if (search.keywords.mandatory?.length) {
                reqWords = search.keywords.mandatory.map(w => `<code>${this.escapeHtml(w)}</code>`).join(' ');
            }
            if (search.keywords.optional?.length) {
                optWords = search.keywords.optional.map(w => `<code>${this.escapeHtml(w)}</code>`).join(' ');
            }
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
    
        return `🔥 <b>NEW DEAL FOUND!</b>\n\n` +
               `📌 <b>Title:</b> ${this.escapeHtml(item.title)}\n` +
               `💰 <b>Price:</b> <code>${price} ₽</code>\n` +
               `🆔 <b>ID:</b> <code>${item.id}</code>\n\n` +
               `${infoBlock}\n\n` +
               `🔗 <a href="${url}">Open on Avito</a>`;
    }
}

module.exports = UI;