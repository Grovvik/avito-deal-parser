import React from 'react';
import DealCard from '../components/deals/DealCard';

const DealsPage = ({ t, visibleDeals, setDeleteDealId }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {visibleDeals.length === 0 ? (
        <div className="col-span-full py-12 text-center text-muted-foreground">{t('noDeals')}</div>
      ) : (
        visibleDeals.map(deal => (
          <DealCard key={deal.id} deal={deal} t={t} setDeleteDealId={setDeleteDealId} />
        ))
      )}
    </div>
  );
};

export default DealsPage;
