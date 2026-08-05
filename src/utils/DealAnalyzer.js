class DealAnalyzer {
    constructor() {
        this.DEFAULT_ACCESSORY_STOP_WORDS = [
            'линза', 'доп', 'чехол', 'стекло', 'аккумулятор', 'батарея', 
            'запчасти', 'запчасть', 'корпус', 'коробка', 'сумка', 'кабель', 
            'адаптер', 'пакет', 'пластина', 'антенна', 'крепление', 'подставка', 
            'амбушюры', 'фильтр', 'накладка', 'защита', 'тушка', 'донор', 'комплект поставки'
        ];
    }

    extractWords(input) {
        if (!input) return [];
        if (Array.isArray(input)) {
            return input.flatMap(k => String(k).toLowerCase().split(/\s+/)).map(w => w.trim()).filter(Boolean);
        }
        if (typeof input === 'string') {
            return input.toLowerCase().split(/\s+/).map(w => w.trim()).filter(Boolean);
        }
        return [];
    }

    normalizeKeywords(keywordsConfig) {
        if (!keywordsConfig) return { mandatory: [], optional: [], exclude: [] };

        if (Array.isArray(keywordsConfig)) {
            return { mandatory: this.extractWords(keywordsConfig), optional: [], exclude: [] };
        }

        if (typeof keywordsConfig === 'object') {
            const mandatoryRaw = keywordsConfig.mandatoryKeywords || keywordsConfig.mandatory || keywordsConfig.required || [];
            const optionalRaw = keywordsConfig.optionalKeywords || keywordsConfig.optional || [];
            const excludeRaw = keywordsConfig.excludeKeywords || keywordsConfig.exclude || keywordsConfig.negative || [];

            return {
                mandatory: this.extractWords(mandatoryRaw),
                optional: this.extractWords(optionalRaw),
                exclude: this.extractWords(excludeRaw)
            };
        }

        if (typeof keywordsConfig === 'string') {
            return { mandatory: this.extractWords(keywordsConfig), optional: [], exclude: [] };
        }

        return { mandatory: [], optional: [], exclude: [] };
    }

    isAccessoryTitle(title, mandatoryUserWords, optionalUserWords) {
        const titleLower = title.toLowerCase();
        const userWordsSet = new Set([...mandatoryUserWords, ...optionalUserWords]);

        for (const stopWord of this.DEFAULT_ACCESSORY_STOP_WORDS) {
            if (titleLower.includes(stopWord)) {
                if (!userWordsSet.has(stopWord)) {
                    return true;
                }
            }
        }
        return false;
    }

    analyze(items, maxPrice, keywordsConfig) {
        const { mandatory, optional, exclude } = this.normalizeKeywords(keywordsConfig);

        const filtered = items.filter(item => {
            if (item.isReserved) return false;

            if (item.price > maxPrice || item.price <= 0) return false;

            const title = (item.title || '').toLowerCase();
            const description = (item.description || '').toLowerCase();
            const fullText = `${title} ${description} ${(item.category || '')} ${(item.location || '')}`.toLowerCase();

            if (exclude.length > 0) {
                const hasExcluded = exclude.some(word => fullText.includes(word));
                if (hasExcluded) return false;
            }

            if (this.isAccessoryTitle(item.title, mandatory, optional)) {
                return false;
            }

            if (mandatory.length > 0) {
                const hasAllMandatory = mandatory.every(word => fullText.includes(word));
                if (!hasAllMandatory) return false;
            }

            if (optional.length > 0) {
                const hasAnyOptional = optional.some(word => fullText.includes(word));
                if (!hasAnyOptional) return false;
            }

            return true;
        });

        return filtered.sort((a, b) => a.price - b.price);
    }
}

module.exports = DealAnalyzer;