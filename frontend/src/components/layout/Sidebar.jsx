import React from 'react';
import { LayoutDashboard, List, Settings, Search, Server, LogOut, Wifi, RefreshCw, X, Activity } from 'lucide-react';
import avitoLogo from '../../assets/avito.svg';

const SidebarItem = ({ icon: Icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors duration-200 ${active ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground'}`}
  >
    <Icon size={20} />
    <span className="font-medium">{label}</span>
  </button>
);

const Sidebar = ({
  t,
  activeTab,
  handleTabClick,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  status,
  isAuthenticated,
  handleLogout,
  isWsConnected
}) => {
  return (
    <>
      {/* Mobile Overlay Backdrop */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-md z-40 md:hidden transition-all duration-300 ${
          isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsMobileMenuOpen(false)}
      />

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 border-r bg-card flex flex-col transform transition-transform duration-300 ease-in-out md:static md:translate-x-0 ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-16 flex items-center justify-between px-6 border-b font-semibold text-xl tracking-tight">
          <div className="flex items-center space-x-3">
            <img src={avitoLogo} alt="Avito Logo" className="h-7 w-auto object-contain" />
            <span>Avito<span className="text-primary">Parser</span></span>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground md:hidden"
            aria-label={t('closeMenu')}
          >
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          <SidebarItem icon={LayoutDashboard} label={t('dashboard')} active={activeTab === 'dashboard'} onClick={() => handleTabClick('dashboard')} />
          <SidebarItem icon={List} label={t('deals')} active={activeTab === 'deals'} onClick={() => handleTabClick('deals')} />
          <SidebarItem icon={Search} label={t('searches')} active={activeTab === 'searches'} onClick={() => handleTabClick('searches')} />
          <SidebarItem icon={Activity} label={t('logs')} active={activeTab === 'logs'} onClick={() => handleTabClick('logs')} />
          <SidebarItem icon={Settings} label={t('settings')} active={activeTab === 'settings'} onClick={() => handleTabClick('settings')} />
        </div>
        <div className="p-4 border-t text-sm text-muted-foreground flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Server size={16} />
            <span>v{status?.version || '1.0.0'}</span>
          </div>
          <div className="flex items-center space-x-2">
            {status?.authRequired && isAuthenticated && (
              <button
                onClick={handleLogout}
                className="p-1 text-muted-foreground hover:text-destructive rounded transition-colors"
                title={t('logout')}
              >
                <LogOut size={16} />
              </button>
            )}
            <div className={`flex items-center space-x-1 text-xs px-2 py-0.5 rounded-full border transition-colors ${isWsConnected ? 'bg-green-500/10 text-green-500 border-green-500/30' : 'bg-amber-500/10 text-amber-500 border-amber-500/30'}`} title={isWsConnected ? t('wsConnected') : t('pollingFallback')}>
              {isWsConnected ? <Wifi size={12} /> : <RefreshCw size={12} className="animate-spin" />}
              <span>{isWsConnected ? 'WS' : 'Polling'}</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
