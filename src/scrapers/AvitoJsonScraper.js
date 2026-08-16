const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
const fs = require('fs');
const Logger = require('../utils/logger');

chromium.use(stealth);

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

    normalizeItem(raw, pageDefaults = {}) {
        let price = 0;
        if (typeof raw.price === 'number') price = raw.price;
        else if (raw.priceDetailed?.value) price = Number(raw.priceDetailed.value);
        else if (raw.price?.current) {
            const parsed = parseInt(String(raw.price.current).replace(/\D/g, ''), 10);
            price = isNaN(parsed) ? 0 : parsed;
        }
        else if (typeof raw.price === 'string') {
            const parsed = parseInt(raw.price.replace(/\D/g, ''), 10);
            price = isNaN(parsed) ? 0 : parsed;
        }

        const rawUrl = raw.urlPath || raw.url || raw.absoluteUrl || raw.link || raw.uri;
        const url = rawUrl
            ? (rawUrl.startsWith('http') ? rawUrl : `https://www.avito.ru${rawUrl.split('?')[0]}`)
            : `https://www.avito.ru/items/${raw.id}`;

        const isReserved = Boolean(
            raw.isReserved ||
            raw.status === 'reserved' ||
            (Array.isArray(raw.badges) && raw.badges.some(b => b.type === 'reserved' || b.title?.toLowerCase().includes('забронирован') || b.title?.toLowerCase().includes('бронь'))) ||
            (Array.isArray(raw.badgeBar?.badges) && raw.badgeBar.badges.some(b => b.type === 'reserved' || b.title?.toLowerCase().includes('забронирован') || b.title?.toLowerCase().includes('бронь')))
        );

        const hasDelivery = Boolean(
            raw.hasDelivery ||
            raw.isDelivery ||
            raw.delivery ||
            (Array.isArray(raw.contacts) && raw.contacts.some(c => c.contactType === 'cart' || c.contactTitle?.toLowerCase().includes('корзин'))) ||
            (Array.isArray(raw.badges) && raw.badges.some(b => b.title?.toLowerCase().includes('доставк') || b.type?.toLowerCase().includes('delivery'))) ||
            (Array.isArray(raw.badgeBar?.badges) && raw.badgeBar.badges.some(b => b.title?.toLowerCase().includes('доставк') || b.type?.toLowerCase().includes('delivery')))
        );

        let image = '';
        if (typeof raw.image === 'string') {
            image = raw.image;
        } else if (raw.image && typeof raw.image === 'object') {
            image = raw.image.src || raw.image.url || '';
        } else if (Array.isArray(raw.images) && raw.images.length > 0) {
            const firstImg = raw.images[0];
            if (typeof firstImg === 'string') {
                image = firstImg;
            } else if (firstImg && typeof firstImg === 'object') {
                image = firstImg['640x480'] || firstImg['1280x960'] || firstImg['140x105'] || firstImg.url || firstImg.src || '';
            }
        } else if (Array.isArray(raw.galleryItems) && raw.galleryItems.length > 0) {
            const firstGallery = raw.galleryItems[0]?.value || raw.galleryItems[0];
            if (typeof firstGallery === 'string') {
                image = firstGallery;
            } else if (firstGallery && typeof firstGallery === 'object') {
                image = firstGallery['678x678'] || firstGallery['558x558'] || firstGallery['507x507'] || firstGallery['372x372'] || firstGallery['140x140'] || firstGallery.url || firstGallery.src || '';
            }
        }

        const location = raw.geo?.formattedAddress ||
            raw.location?.name ||
            (typeof raw.location === 'string' ? raw.location : '') ||
            raw.sellerInfo?.logoImageAlt ||
            raw.address ||
            (raw.imageAlt && raw.imageAlt.includes(', ') ? raw.imageAlt.split(', ').pop().trim() : '') ||
            pageDefaults.location ||
            '';

        const category = raw.category?.name ||
            (typeof raw.category === 'string' ? raw.category : '') ||
            raw.categoryName ||
            pageDefaults.category ||
            '';

        return {
            id: String(raw.id || raw.itemId),
            title: raw.title || '',
            description: raw.descriptionSnippet || raw.description || '',
            price: price,
            url: url,
            image: image,
            isReserved: isReserved,
            hasDelivery: hasDelivery,
            category: category,
            location: location
        };
    }

    extractItemsFromState(stateData) {
        if (!stateData) return [];

        let pageCategory = '';
        let pageLocation = '';

        const searchObj = stateData.search || stateData.state?.loaderData?.search || stateData.loaderData?.search;
        if (searchObj) {
            const catFilter = (searchObj.filters || []).find(f => f.type === 'categoryNodes' || f.isCategoryNode || f.id === 'categoryNodes');
            if (catFilter?.title) {
                pageCategory = catFilter.title;
            }
            if (searchObj.header?.subTitle?.title) {
                pageLocation = searchObj.header.subTitle.title;
            }
        }

        const pageDefaults = {
            category: pageCategory,
            location: pageLocation
        };

        const isAvitoItem = (obj) => {
            if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
            const hasId = obj.id !== undefined || obj.itemId !== undefined;
            const hasTitle = typeof obj.title === 'string' && obj.title.trim().length > 0;
            const hasPrice = obj.price !== undefined || obj.priceDetailed !== undefined;
            const hasItemMarkers = Boolean(obj.galleryItems || obj.sellerInfo || obj.badgeBar || obj.contacts || obj.categoryId);
            const isSuggestion = typeof obj.uri === 'string' && (obj.uri.includes('?q=') || obj.uri.includes('/search?'));
            return hasId && hasTitle && hasPrice && (hasItemMarkers || !isSuggestion);
        };

        const visited = new Set();
        const allItems = [];
        const findItemsArray = (current) => {
            if (!current || typeof current !== 'object') return;
            if (visited.has(current)) return;
            visited.add(current);

            if (Array.isArray(current)) {
                if (current.length > 0) {
                    const unwrapped = current.map(c => (c && typeof c === 'object' && c.value && typeof c.value === 'object') ? c.value : c);
                    const validItems = unwrapped.filter(isAvitoItem);
                    if (validItems.length > 0 && (validItems.length / unwrapped.length) >= 0.3) {
                        allItems.push(...validItems);
                    }
                }
                for (const element of current) {
                    findItemsArray(element);
                }
                return;
            }

            for (const key of Object.keys(current)) {
                if (key === 'i18n' || key === 'translations') continue;
                findItemsArray(current[key]);
            }
        };

        const searchRoot = searchObj || stateData.state?.loaderData || stateData.loaderData || stateData;
        findItemsArray(searchRoot);

        // Remove duplicates by ID
        const uniqueItems = [];
        const seenIds = new Set();
        for (const item of allItems) {
            const id = String(item.id || item.itemId);
            if (!seenIds.has(id)) {
                seenIds.add(id);
                uniqueItems.push(item);
            }
        }

        return uniqueItems.map(item => this.normalizeItem(item, pageDefaults));
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
                'upgrade-insecure-requests': '1'
            },
            ...(storageState && { storageState })
        });

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