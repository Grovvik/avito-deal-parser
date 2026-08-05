import React from 'react';
import { Trash2 } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';

const DealCard = ({ deal, t, setDeleteDealId }) => {
  return (
    <Card className="flex flex-col">
      {deal.image && <img src={deal.image} alt={deal.title} className="w-full h-48 object-cover rounded-md mb-4" />}
      <h3 className="font-semibold text-lg line-clamp-2 mb-2" title={deal.title}>{deal.title}</h3>
      <div className="text-2xl font-semibold text-primary mb-4">{deal.price} ₽</div>
      <div className="mt-auto pt-4 flex items-center justify-between border-t">
        <a href={deal.url} target="_blank" rel="noreferrer" className="text-sm text-blue-500 hover:underline">{t('avitoLink')}</a>
        <Button variant="ghost" className="text-destructive h-8 px-2" onClick={() => setDeleteDealId(deal.id)}>
          <Trash2 size={16} />
        </Button>
      </div>
    </Card>
  );
};

export default DealCard;
