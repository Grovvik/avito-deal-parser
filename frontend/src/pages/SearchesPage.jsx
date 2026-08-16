import React from 'react';
import { Trash2, Pencil } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

const SearchesPage = ({ t, config, openSearchModal, setDeleteSearchIdx }) => {
  return (
    <Card>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">{t('activeSearches')}</h2>
          <Button onClick={() => openSearchModal(null)}>{t('addSearch')}</Button>
        </div>
        {config.searches.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t('noSearches')}</p>
        ) : (
          <div className="space-y-4">
            {config.searches.map((s, i) => (
              <div key={i} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex-1 overflow-hidden mr-4">
                  <div className="font-medium truncate" title={s.url}>{s.url}</div>
                  <div className="text-sm text-muted-foreground mt-1 flex flex-wrap gap-x-4 gap-y-1 items-center">
                    {s.maxPrice && <span>{t('maxPriceShort')}: {s.maxPrice} ₽</span>}
                    {s.keywordGroups?.length > 0 
                      ? <span>{t('keywordGroups')}: {s.keywordGroups.map(g => g.join(' | ')).join(', ')}</span>
                      : s.mandatoryKeywords?.length > 0 && <span>{t('mustHave')}: {s.mandatoryKeywords.join(', ')}</span>
                    }
                    {s.includeReserved && (
                      <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-medium">
                        {t('reservedAllowed')}
                      </span>
                    )}
                    {s.onlyDelivery && (
                      <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 font-medium">
                        {t('deliveryOnlyBadge')}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full w-9 h-9 p-0 sm:w-auto sm:h-9 sm:px-3 sm:py-1.5 sm:rounded-md"
                    onClick={() => openSearchModal(i)}
                  >
                    <Pencil size={16} className="sm:mr-1.5" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="rounded-full w-9 h-9 p-0 sm:w-auto sm:h-9 sm:px-3 sm:py-1.5 sm:rounded-md"
                    onClick={() => setDeleteSearchIdx(i)}
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};

export default SearchesPage;
