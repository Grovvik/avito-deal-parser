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
    price_update_alert: '🔄 <b>Price Updated!</b>',
    price: 'Price',
    url: 'URL',
    search_url: 'Search URL',
    toggle_reserved: 'Reserved',
    toggle_delivery: 'Delivery',
    reserved_allowed: 'Allowed',
    reserved_skipped: 'Skipped',
    delivery_only: 'Only Delivery',
    delivery_any: 'All',
    no_active_searches: 'No active searches',
    no_keywords: 'No Keywords',
    req_short: 'Req',
    opt_short: 'Opt',
    link: 'Link',
    items_unit: 'items',
    active_search_tasks: 'Active Search Tasks',
    no_active_searches_hint: 'No active search tasks found. Click "Add Search Task" on dashboard to create one.',
    select_task_to_edit: 'Select a task from the list below to edit its parameters:',
    none: 'None',
    editing_search_task: 'Editing Search Task',
    open_link: 'Open Link',
    max_price: 'Max Price',
    mandatory_keywords: 'Mandatory Keywords',
    optional_keywords: 'Optional Keywords',
    choose_param_to_edit: 'Choose a parameter to edit or toggle:',
    not_specified: 'Not specified',
    location: 'Location',
    category: 'Category',
    seller: 'Seller',
    title: 'Title',
    open_on_avito: 'Open on Avito'
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
    price_update_alert: '🔄 <b>Обновление цены!</b>',
    price: 'Цена',
    url: 'Ссылка',
    search_url: 'Ссылка поиска',
    toggle_reserved: 'Забронированные',
    toggle_delivery: 'Доставка',
    reserved_allowed: 'Разрешены',
    reserved_skipped: 'Пропускать',
    delivery_only: 'Только доставка',
    delivery_any: 'Любая',
    no_active_searches: 'Нет активных поисков',
    no_keywords: 'Без ключевых слов',
    req_short: 'Обяз',
    opt_short: 'Доп',
    link: 'Ссылка',
    items_unit: 'шт.',
    active_search_tasks: 'Активные поисковые задачи',
    no_active_searches_hint: 'Активных поисковых задач не найдено. Нажмите «Добавить поиск» в меню.',
    select_task_to_edit: 'Выберите задачу из списка ниже для редактирования:',
    none: 'Нет',
    editing_search_task: 'Редактирование задачи',
    open_link: 'Открыть ссылку',
    max_price: 'Макс. цена',
    mandatory_keywords: 'Обязательные слова',
    optional_keywords: 'Дополнительные слова',
    choose_param_to_edit: 'Выберите параметр для редактирования или переключения:',
    not_specified: 'Не указано',
    location: 'Локация',
    category: 'Категория',
    seller: 'Продавец',
    title: 'Название',
    open_on_avito: 'Открыть на Авито'
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
