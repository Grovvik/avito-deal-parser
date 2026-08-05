const { chromium } = require('playwright');
const fs = require('fs');
const Logger = require('../utils/logger');

class AvitoJsonScraper {
    constructor(cookiesFilePath, proxyUrl = null) {
        this.logger = new Logger('AvitoScraper');
        this.cookiesFilePath = cookiesFilePath;
        this.proxyUrl = proxyUrl;
    }

    normalizeCookie(cookie) {
        const c = { ...cookie };
        if (!['Strict', 'Lax', 'None'].includes(c.sameSite)) {
            c.sameSite = c.sameSite === 'no_restriction' ? 'None' : 'Lax';
        }
        if (c.expirationDate && !c.expires) {
            c.expires = c.expirationDate;
            delete c.expirationDate;
        }
        delete c.hostOnly;
        delete c.session;
        delete c.storeId;
        return c;
    }

    loadCookies() {
        if (!fs.existsSync(this.cookiesFilePath)) return null;
        try {
            const raw = fs.readFileSync(this.cookiesFilePath, 'utf8');
            return { cookies: JSON.parse(raw).map(c => this.normalizeCookie(c)) };
        } catch (err) {
            return null;
        }
    }

    async saveCookies(context) {
        try {
            const freshState = await context.storageState();
            fs.writeFileSync(this.cookiesFilePath, JSON.stringify(freshState.cookies, null, 2));
        } catch (err) {}
    }

    normalizeItem(raw) {
        let price = 0;
        if (typeof raw.price === 'number') price = raw.price;
        else if (raw.priceDetailed?.value) price = Number(raw.priceDetailed.value);
        else if (typeof raw.price === 'string') {
            const parsed = parseInt(raw.price.replace(/\D/g, ''), 10);
            price = isNaN(parsed) ? 0 : parsed;
        }

        const rawUrl = raw.urlPath || raw.url || raw.absoluteUrl || raw.link;
        const url = rawUrl
            ? (rawUrl.startsWith('http') ? rawUrl : `https://www.avito.ru${rawUrl}`)
            : `https://www.avito.ru/items/${raw.id}`;

        const isReserved = Boolean(
            raw.isReserved ||
            (Array.isArray(raw.badges) && raw.badges.some(b => b.type === 'reserved' || b.title?.toLowerCase().includes('забронирован')))
        );

        return {
            id: String(raw.id || raw.itemId),
            title: raw.title || '',
            description: raw.descriptionSnippet || raw.description || '',
            price: price,
            url: url,
            isReserved: isReserved,
            category: raw.category?.name || '',
            location: raw.location?.name || '',
            raw: raw
        };
    }

    extractItemsFromState(stateData) {
        if (!stateData) return [];

        const isAvitoItem = (obj) => {
            if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
            const hasId = obj.id !== undefined || obj.itemId !== undefined;
            const hasTitle = typeof obj.title === 'string';
            const hasPrice = obj.price !== undefined || obj.priceDetailed !== undefined;
            return hasId && (hasTitle || hasPrice);
        };

        const visited = new Set();

        const findItemsArray = (current) => {
            if (!current || typeof current !== 'object') return null;
            if (visited.has(current)) return null;
            visited.add(current);

            if (Array.isArray(current)) {
                if (current.length > 0) {
                    const validItems = current.filter(isAvitoItem);
                    if (validItems.length > 0 && (validItems.length / current.length) >= 0.5) {
                        return validItems;
                    }
                }
                for (const element of current) {
                    const res = findItemsArray(element);
                    if (res) return res;
                }
                return null;
            }

            for (const key of Object.keys(current)) {
                if (key === 'i18n' || key === 'translations') continue;
                const res = findItemsArray(current[key]);
                if (res) return res;
            }
            return null;
        };

        const searchRoot = stateData.state?.loaderData || stateData.loaderData || stateData;
        const rawItems = findItemsArray(searchRoot) || [];

        return rawItems.map(item => this.normalizeItem(item));
    }

    async fetchRawItems(targetUrl) {
        const storageState = this.loadCookies();
        const launchOptions = { headless: true };
        if (this.proxyUrl) launchOptions.proxy = { server: this.proxyUrl };

        const browser = await chromium.launch(launchOptions);
        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
            viewport: { width: 1920, height: 1080 },
            locale: 'ru-RU',
            timezoneId: 'Europe/Moscow',
            extraHTTPHeaders: {
                'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8',
                'sec-ch-ua': '"Not)A;Brand";v="99", "Google Chrome";v="127"'
            },
            ...(storageState && { storageState })
        });

        await context.addInitScript(() => { Object.defineProperty(navigator, 'webdriver', { get: () => undefined }); });
        const page = await context.newPage();

        try {
            let initialHtml = '';
            page.on('response', async (res) => {
                if (res.url() === targetUrl || res.request().resourceType() === 'document') {
                    try { initialHtml = await res.text(); } catch (e) {}
                }
            });

            this.logger.info(`Fetching page: ${targetUrl}`);
            await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
            if (!initialHtml) initialHtml = await page.content();

            const scriptLocator = page.locator('script[data-mfe-state="true"]');
            let jsonText = null;
            if (await scriptLocator.count() > 0) {
                jsonText = await scriptLocator.first().textContent();
            } else {
                const match = initialHtml.match(/<script[^>]*data-mfe-state="true"[^>]*>([\s\S]*?)<\/script>/);
                if (match) jsonText = match[1];
            }

            if (!jsonText) {
                const msg = 'Failed to extract JSON state. Blocked or Captcha.';
                this.logger.error(msg);
                throw new Error(msg);
            }

            const stateData = JSON.parse(jsonText.trim());
            const items = this.extractItemsFromState(stateData);
            await this.saveCookies(context);
            return items;
        } catch (err) {
            this.logger.error(`Scraping error: ${err.message}`);
            throw err;
        } finally {
            await browser.close();
        }
    }
}

module.exports = AvitoJsonScraper;