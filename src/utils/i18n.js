const en = {
    dashboard_title: 'Avito Deal Parser Dashboard',
    total_deals: 'Total Deals Sent',
    polling_status: 'Polling Status',
    enabled: 'Enabled',
    disabled: 'Disabled',
    interval: 'Interval',
    minutes: 'minutes',
    bot_uptime: 'Bot Uptime',
    run_check_now: '🔄 Run Check Now',
    pause_polling: '⏸ Pause Polling',
    start_polling: '▶ Start Polling',
    add_search_task: '➕ Add Search Task',
    manage_searches: '⚙️ Manage Searches',
    set_interval: '⏱ Set Interval',
    refresh_dashboard: '📊 Refresh Dashboard',
    back_to_dashboard: '🔙 Back to Dashboard',
    manage_searches_title: 'Manage Searches',
    page: 'Page',
    of: 'of',
    edit_url: 'Edit URL',
    edit_max_price: 'Edit Max Price',
    edit_mandatory_kw: 'Edit Mandatory Keywords',
    edit_optional_kw: 'Edit Optional Keywords',
    delete_search: 'Delete Search',
    cancel: 'Cancel',
    manual_check_started: '🔎 Manual check started...',
    starting_check: 'Starting check...',
    started: 'Started',
    paused: 'Paused',
    deal_alert: '🚨 <b>New Deal Found!</b>',
    price: 'Price',
    url: 'URL',
    search_url: 'Search URL'
};

const ru = {
    dashboard_title: 'Панель управления Avito Парсером',
    total_deals: 'Отправлено предложений',
    polling_status: 'Статус опроса',
    enabled: 'Включен',
    disabled: 'Выключен',
    interval: 'Интервал',
    minutes: 'минут',
    bot_uptime: 'Время работы бота',
    run_check_now: '🔄 Проверить сейчас',
    pause_polling: '⏸ Пауза',
    start_polling: '▶ Запустить опрос',
    add_search_task: '➕ Добавить поиск',
    manage_searches: '⚙️ Управление поисками',
    set_interval: '⏱ Изменить интервал',
    refresh_dashboard: '📊 Обновить панель',
    back_to_dashboard: '🔙 Назад в меню',
    manage_searches_title: 'Управление поисками',
    page: 'Страница',
    of: 'из',
    edit_url: 'Изменить URL',
    edit_max_price: 'Изменить макс. цену',
    edit_mandatory_kw: 'Изменить обяз. слова',
    edit_optional_kw: 'Изменить доп. слова',
    delete_search: 'Удалить поиск',
    cancel: 'Отмена',
    manual_check_started: '🔎 Ручная проверка запущена...',
    starting_check: 'Запуск проверки...',
    started: 'Запущено',
    paused: 'Остановлено',
    deal_alert: '🚨 <b>Новое предложение!</b>',
    price: 'Цена',
    url: 'Ссылка',
    search_url: 'Ссылка поиска'
};

class I18n {
    constructor() {
        this.locales = { en, ru };
        this.currentLocale = 'en'; // Default
    }

    setLocale(locale) {
        if (this.locales[locale]) {
            this.currentLocale = locale;
        }
    }

    t(key, params = {}) {
        let text = this.locales[this.currentLocale][key] || this.locales['en'][key] || key;
        
        for (const [k, v] of Object.entries(params)) {
            text = text.replace(`{${k}}`, v);
        }
        
        return text;
    }
}

// Singleton instance
module.exports = new I18n();
