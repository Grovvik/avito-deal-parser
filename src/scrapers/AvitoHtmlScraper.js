const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
const fs = require('fs');
const Logger = require('../utils/logger');

chromium.use(stealth);

class AvitoHtmlScraper {
    constructor(proxyUrl = null, cookiesFilePath = null) {
        this.logger = new Logger('AvitoHtmlScraper');
        this.proxyUrl = proxyUrl;
        this.cookiesFilePath = cookiesFilePath;
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
        if (!this.cookiesFilePath || !fs.existsSync(this.cookiesFilePath)) return null;
        try {
            const raw = fs.readFileSync(this.cookiesFilePath, 'utf8');
            return { cookies: JSON.parse(raw).map(c => this.normalizeCookie(c)) };
        } catch (err) {
            return null;
        }
    }

    async saveCookies(context) {
        if (!this.cookiesFilePath) return;
        try {
            const freshState = await context.storageState();
            fs.writeFileSync(this.cookiesFilePath, JSON.stringify(freshState.cookies, null, 2));
        } catch (err) {}
    }

    async fetchRawItems(targetUrl) {
        const storageState = this.loadCookies();
        const launchOptions = { headless: true };
        if (this.proxyUrl) launchOptions.proxy = { server: this.proxyUrl };

        const browser = await chromium.launch(launchOptions);
        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            viewport: { width: 1920, height: 1080 },
            locale: 'ru-RU',
            timezoneId: 'Europe/Moscow',
            extraHTTPHeaders: {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
                'sec-ch-ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"Windows"',
                'sec-fetch-dest': 'document',
                'sec-fetch-mode': 'navigate',
                'sec-fetch-site': 'none',
                'sec-fetch-user': '?1',
                'upgrade-insecure-requests': '1'
            },
            ...(storageState && { storageState })
        });

        const page = await context.newPage();

        try {
            this.logger.info(`Fetching HTML page: ${targetUrl}`);
            await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

            const items = await page.$$eval('[data-marker="item"]', (elements) => {
                return elements.map(el => {
                    const id = el.getAttribute('data-item-id') || el.getAttribute('id') || '';
                    
                    const titleEl = el.querySelector('[itemprop="name"]') || el.querySelector('[data-marker="item-title"]');
                    const title = titleEl ? titleEl.textContent.trim() : '';

                    const priceEl = el.querySelector('[itemprop="price"]');
                    let price = 0;
                    if (priceEl) {
                        const contentAttr = priceEl.getAttribute('content');
                        if (contentAttr) price = Number(contentAttr);
                        else {
                            const rawText = priceEl.textContent.replace(/\D/g, '');
                            price = parseInt(rawText, 10) || 0;
                        }
                    } else {
                        const priceTextEl = el.querySelector('[data-marker="item-price"]');
                        if (priceTextEl) {
                            const rawText = priceTextEl.textContent.replace(/\D/g, '');
                            price = parseInt(rawText, 10) || 0;
                        }
                    }

                    const urlEl = el.querySelector('[itemprop="url"]') || el.querySelector('a[data-marker="item-title"]');
                    let url = urlEl ? urlEl.getAttribute('href') : '';
                    if (url && !url.startsWith('http')) {
                        url = 'https://www.avito.ru' + url;
                    }

                    const descEl = el.querySelector('[itemprop="description"]');
                    const description = descEl ? descEl.getAttribute('content') || descEl.textContent.trim() : '';

                    const imgEl = el.querySelector('img');
                    const image = imgEl ? (imgEl.getAttribute('src') || imgEl.getAttribute('data-src') || '') : '';

                    const fullText = el.textContent || '';
                    const isReserved = fullText.toLowerCase().includes('забронирован');

                    return {
                        id: String(id),
                        title,
                        description,
                        price,
                        url,
                        image,
                        isReserved,
                        category: '',
                        location: ''
                    };
                }).filter(item => item.id && item.title);
            });

            this.logger.info(`Successfully scraped ${items.length} items from HTML.`);
            await this.saveCookies(context);
            return items;
        } catch (err) {
            this.logger.error(`HTML Scraping error: ${err.message}`);
            throw err;
        } finally {
            await browser.close();
        }
    }
}

module.exports = AvitoHtmlScraper;
