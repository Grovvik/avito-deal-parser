import React from 'react';
import { Menu } from 'lucide-react';
import avitoLogo from '../../assets/avito.svg';

const MobileHeader = ({ t, setIsMobileMenuOpen }) => (
  <div className="flex items-center justify-between mb-4 md:hidden pb-3 border-b">
    <button
      onClick={() => setIsMobileMenuOpen(true)}
      className="p-2 rounded-lg border bg-card text-foreground shadow-sm hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
      aria-label={t('openNavigation')}
    >
      <Menu size={22} />
    </button>
    <div className="flex items-center space-x-2 font-semibold text-lg">
      <img src={avitoLogo} alt="Avito Logo" className="h-6 w-auto object-contain" />
      <span>Avito<span className="text-primary">Parser</span></span>
    </div>
  </div>
);

export default MobileHeader;
