const Logger = require('../utils/logger');
const { HttpsProxyAgent } = require('https-proxy-agent');

class AvitoMobileFetchScraper {
    constructor(proxyUrl = null) {
        this.logger = new Logger('AvitoMobileScraper');
        this.proxyUrl = proxyUrl;
    }

    normalizeItem(raw) {
        let price = 0;
        if (typeof raw.price === 'number') price = raw.price;
        else if (raw.priceDetailed?.value) price = Number(raw.priceDetailed.value);
        else if (raw.price?.current) {
            const parsed = parseInt(raw.price.current.replace(/\D/g, ''), 10);
            price = isNaN(parsed) ? 0 : parsed;
        }
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
        }

        return {
            id: String(raw.id || raw.itemId),
            title: raw.title || '',
            description: raw.descriptionSnippet || raw.description || '',
            price: price,
            url: url,
            image: image,
            isReserved: isReserved,
            category: raw.category?.name || '',
            location: raw.location?.name || ''
        };
    }

    extractItemsFromState(stateData) {
        if (!stateData) return [];

        const isAvitoItem = (obj) => {
            if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
            const hasId = obj.id !== undefined || obj.itemId !== undefined;
            const hasTitle = typeof obj.title === 'string';
            const hasPrice = obj.price !== undefined || obj.priceDetailed !== undefined;
            const hasUri = typeof obj.uri === 'string' || typeof obj.url === 'string' || typeof obj.urlPath === 'string';
            return hasId && hasTitle && (hasPrice || hasUri);
        };

        const visited = new Set();

        const findItemsArray = (current) => {
            if (!current || typeof current !== 'object') return null;
            if (visited.has(current)) return null;
            visited.add(current);

            if (Array.isArray(current)) {
                if (current.length > 0) {
                    const unwrapped = current.map(c => (c && typeof c === 'object' && c.value && typeof c.value === 'object') ? c.value : c);
                    const validItems = unwrapped.filter(isAvitoItem);
                    if (validItems.length > 0 && (validItems.length / unwrapped.length) >= 0.3) {
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
        // dynamically import got-scraping because it is an ES module
        const { gotScraping } = await import('got-scraping');

        // convert www.avito.ru to m.avito.ru if needed
        const url = targetUrl.replace('www.avito.ru', 'm.avito.ru');

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
