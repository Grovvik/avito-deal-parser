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
        if (!keywordsConfig) return { keywordGroups: [], exclude: [] };

        if (Array.isArray(keywordsConfig)) {
            const words = this.extractWords(keywordsConfig);
            return { keywordGroups: words.map(w => [w]), exclude: [] };
        }

        if (typeof keywordsConfig === 'object') {
            const excludeRaw = keywordsConfig.excludeKeywords || keywordsConfig.exclude || keywordsConfig.negative || [];
            const exclude = this.extractWords(excludeRaw);

            // New format
            if (keywordsConfig.keywordGroups) {
                const keywordGroups = keywordsConfig.keywordGroups
                    .map(g => this.extractWords(g))
                    .filter(g => g.length > 0);
                return { keywordGroups, exclude };
            }

            // Legacy format migration
            const mandatoryRaw = keywordsConfig.mandatoryKeywords || keywordsConfig.mandatory || keywordsConfig.required || [];
            const optionalRaw = keywordsConfig.optionalKeywords || keywordsConfig.optional || [];

            const mandatoryWords = this.extractWords(mandatoryRaw);
            const optionalWords = this.extractWords(optionalRaw);
            
            const keywordGroups = [];
            mandatoryWords.forEach(w => keywordGroups.push([w]));
            if (optionalWords.length > 0) {
                keywordGroups.push(optionalWords);
            }

            return { keywordGroups, exclude };
        }

        if (typeof keywordsConfig === 'string') {
            const words = this.extractWords(keywordsConfig);
            return { keywordGroups: words.map(w => [w]), exclude: [] };
        }

        return { keywordGroups: [], exclude: [] };
    }

    isAccessoryTitle(title, keywordGroups) {
        const titleLower = title.toLowerCase();
        
        // Flatten all words from all groups into a single set
        const allUserWords = keywordGroups.flat();
        const userWordsSet = new Set(allUserWords);

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
        const { keywordGroups, exclude } = this.normalizeKeywords(keywordsConfig);

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

            if (this.isAccessoryTitle(item.title, keywordGroups)) {
                return false;
            }

            if (keywordGroups.length > 0) {
                const matchesAllGroups = keywordGroups.every(group => {
                    return group.some(word => fullText.includes(word));
                });
                if (!matchesAllGroups) return false;
            }

            return true;
        });

        return filtered.sort((a, b) => a.price - b.price);
    }
}

module.exports = DealAnalyzer;