const Logger = require('../utils/logger');
const { HttpsProxyAgent } = require('https-proxy-agent');

class AvitoMobileFetchScraper {
    constructor(proxyUrl = null) {
        this.logger = new Logger('AvitoMobileScraper');
        this.proxyUrl = proxyUrl;
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
        // dynamically import got-scraping because it is an ES module
        const { gotScraping } = await import('got-scraping');

        // convert any avito url to https://m.avito.ru
        let url = targetUrl;
        try {
            const parsed = new URL(targetUrl);
            parsed.hostname = 'm.avito.ru';
            parsed.protocol = 'https:';
            url = parsed.toString();
        } catch (e) {
            url = targetUrl.replace('www.avito.ru', 'm.avito.ru').replace('avito.ru', 'm.avito.ru');
        }

        this.logger.info(`Fetching mobile page: ${url}`);

        const options = {
            url: url,
            headerGeneratorOptions: {
                browsers: ['chrome'],
                operatingSystems: ['android'],
                devices: ['mobile']
            },
            timeout: {
                request: 15000
            }
        };

        if (this.proxyUrl) {
            options.agent = {
                https: new HttpsProxyAgent(this.proxyUrl)
            };
        }

        try {
            const response = await gotScraping(options);
            const html = response.body;

            let match = html.match(/window\.__initialData__\s*=\s*decodeURIComponent\("([^"]+)"\)/);
            if (!match) {
                match = html.match(/window\.__initialData__\s*=\s*"(.*?)";/);
            }

            if (!match) {
                this.logger.error('Failed to extract JSON state. Blocked or structure changed.');
                throw new Error('Failed to extract JSON state. Blocked or structure changed.');
            }

            let stateData = null;
            const rawString = match[1];

            try {
                // First try standard decodeURIComponent
                const decoded = decodeURIComponent(rawString);
                stateData = JSON.parse(decoded);
            } catch (e) {
                // If decodeURIComponent fails, it's likely just a stringified JSON with escapes
                try {
                    const unescaped = JSON.parse(`"${rawString}"`);
                    stateData = JSON.parse(unescaped);
                } catch (e2) {
                    this.logger.error('Failed to parse the extracted JSON data.');
                    throw new Error('Failed to parse the extracted JSON data.');
                }
            }

            return this.extractItemsFromState(stateData);
        } catch (err) {
            this.logger.error(`Scraping error: ${err.message}`);
            throw err;
        }
    }
}

module.exports = AvitoMobileFetchScraper;
