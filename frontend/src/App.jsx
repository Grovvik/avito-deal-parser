import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { LayoutDashboard, List, Settings, Search, Play, Pause, Trash2, Globe, Server, Moon, Sun, Clock, Bell, SearchCode, TrendingUp, Wifi, RefreshCw, Cookie, Sliders } from 'lucide-react';
import { io } from 'socket.io-client';
import { useTheme } from './hooks/useTheme';
import Modal from './components/Modal';
import ConfirmModal from './components/ConfirmModal';
import { useToast } from './components/Toast';
import avitoLogo from './assets/avito.svg';

const SidebarItem = ({ icon: Icon, label, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors duration-200 ${active ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground'}`}
  >
    <Icon size={20} />
    <span className="font-medium">{label}</span>
  </button>
);

const Card = ({ children, className = "" }) => (
  <div className={`bg-card text-card-foreground rounded-xl border shadow-sm p-6 ${className}`}>
    {children}
  </div>
);

const Button = ({ children, onClick, variant = 'primary', size = 'default', className = "", type="button" }) => {
  const base = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:pointer-events-none ring-offset-background";
  const variants = {
    primary: "bg-primary text-primary-foreground hover:bg-primary/90",
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
    outline: "border border-input hover:bg-accent hover:text-accent-foreground",
    ghost: "hover:bg-accent hover:text-accent-foreground"
  };
  const sizes = {
    default: "h-10 py-2 px-4",
    sm: "h-9 px-3 rounded-md",
    icon: "h-10 w-10"
  };
  return <button type={type} onClick={onClick} className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}>{children}</button>;
};

const Input = ({ label, type = "text", value, onChange, placeholder, required = false, className = "" }) => (
  <div className={`flex flex-col space-y-1.5 ${className}`}>
    {label && <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">{label}</label>}
    <input 
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
    />
  </div>
);

const Switch = ({ checked, onChange, disabled = false }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
      checked ? 'bg-primary' : 'bg-muted-foreground/30'
    }`}
  >
    <span
      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow-lg ring-0 transition duration-200 ease-in-out ${
        checked ? 'translate-x-5' : 'translate-x-0'
      }`}
    />
  </button>
);

// Custom SVG Analytics Chart
const DealsAnalyticsChart = ({ deals, t }) => {
  const [range, setRange] = useState('hourly'); // 'hourly' | 'daily' | 'weekly'
  const [hoveredPoint, setHoveredPoint] = useState(null);

  const chartData = useMemo(() => {
    const now = new Date();
    const data = [];

    if (range === 'hourly') {
      for (let i = 23; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 60 * 60 * 1000);
        const label = `${String(d.getHours()).padStart(2, '0')}:00`;
        const count = deals.filter(deal => {
          if (!deal.sentAt) return false;
          const tDate = new Date(deal.sentAt);
          return tDate >= new Date(d.getTime() - 60 * 60 * 1000) && tDate <= d;
        }).length;
        data.push({ label, count });
      }
    } else if (range === 'daily') {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        const label = d.toLocaleDateString(undefined, { weekday: 'short', month: 'numeric', day: 'numeric' });
        const count = deals.filter(deal => {
          if (!deal.sentAt) return false;
          const tDate = new Date(deal.sentAt);
          return tDate.toDateString() === d.toDateString();
        }).length;
        data.push({ label, count });
      }
    } else if (range === 'weekly') {
      for (let i = 3; i >= 0; i--) {
        const endD = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
        const startD = new Date(endD.getTime() - 7 * 24 * 60 * 60 * 1000);
        const label = `W${4 - i}`;
        const count = deals.filter(deal => {
          if (!deal.sentAt) return false;
          const tDate = new Date(deal.sentAt);
          return tDate >= startD && tDate <= endD;
        }).length;
        data.push({ label, count });
      }
    }

    return data;
  }, [deals, range]);

  const width = 650;
  const height = 220;
  const paddingX = 40;
  const paddingY = 30;

  const maxCount = Math.max(...chartData.map(d => d.count), 5);

  const points = chartData.map((d, index) => {
    const x = paddingX + (index / (chartData.length - 1 || 1)) * (width - paddingX * 2);
    const y = height - paddingY - (d.count / maxCount) * (height - paddingY * 2);
    return { x, y, ...d };
  });

  const pathD = points.length > 0 
    ? points.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`, '')
    : '';

  const areaD = points.length > 0
    ? `${pathD} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`
    : '';

  return (
    <Card>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center space-x-2">
          <TrendingUp className="text-primary" size={20} />
          <h2 className="text-lg font-semibold">{t('dealsChart')}</h2>
        </div>
        <div className="flex items-center border rounded-lg overflow-hidden bg-muted/30 p-1">
          {['hourly', 'daily', 'weekly'].map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${range === r ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {t(r)}
            </button>
          ))}
        </div>
      </div>

      <div className="relative w-full overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto min-w-[500px]">
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.4" />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {[0, 0.5, 1].map((ratio, i) => {
            const y = height - paddingY - ratio * (height - paddingY * 2);
            const val = Math.round(ratio * maxCount);
            return (
              <g key={i}>
                <line x1={paddingX} y1={y} x2={width - paddingX} y2={y} stroke="hsl(var(--border))" strokeDasharray="4 4" opacity="0.6" />
                <text x={paddingX - 8} y={y + 4} textAnchor="end" className="text-[10px] fill-muted-foreground font-mono">{val}</text>
              </g>
            );
          })}

          {areaD && <path d={areaD} fill="url(#chartGradient)" />}
          {pathD && <path d={pathD} fill="none" stroke="hsl(var(--primary))" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}

          {points.map((p, i) => (
            <g key={i} className="cursor-pointer" onMouseEnter={() => setHoveredPoint(p)} onMouseLeave={() => setHoveredPoint(null)}>
              <circle cx={p.x} cy={p.y} r="4" className="fill-primary stroke-background stroke-2 hover:r-6 transition-all" />
              {(i % Math.ceil(points.length / 7) === 0 || i === points.length - 1) && (
                <text x={p.x} y={height - 8} textAnchor="middle" className="text-[10px] fill-muted-foreground font-medium">
                  {p.label}
                </text>
              )}
            </g>
          ))}
        </svg>

        {hoveredPoint && (
          <div 
            className="absolute z-10 bg-popover text-popover-foreground border shadow-md rounded px-2.5 py-1.5 text-xs font-medium pointer-events-none transform -translate-x-1/2 -translate-y-full"
            style={{
              left: `${(hoveredPoint.x / width) * 100}%`,
              top: `${(hoveredPoint.y / height) * 100}%`
            }}
          >
            <div>{hoveredPoint.label}</div>
            <div className="text-primary font-bold">{hoveredPoint.count} deals</div>
          </div>
        )}
      </div>
    </Card>
  );
};

function App() {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const [theme, setTheme] = useTheme();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [status, setStatus] = useState(null);
  const [config, setConfig] = useState(null);
  const [deals, setDeals] = useState([]);

  // Search Modal State
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [editingSearchIndex, setEditingSearchIndex] = useState(null);
  const [searchForm, setSearchForm] = useState({ url: '', maxPrice: '', mandatoryKeywords: '', optionalKeywords: '' });

  // Confirmation Modals State
  const [deleteDealId, setDeleteDealId] = useState(null);
  const [deleteSearchIdx, setDeleteSearchIdx] = useState(null);

  // Cookies Modal State
  const [cookiesModalOpen, setCookiesModalOpen] = useState(false);
  const [cookiesJsonText, setCookiesJsonText] = useState('');

  // Notification Modal State
  const [notificationModalOpen, setNotificationModalOpen] = useState(false);
  const [editingProviderId, setEditingProviderId] = useState(null);
  const [notificationForm, setNotificationForm] = useState({});

  const [isWsConnected, setIsWsConnected] = useState(false);

  const openCookiesModal = async () => {
    try {
      const res = await fetch('/api/cookies');
      const data = await res.json();
      setCookiesJsonText(JSON.stringify(data, null, 2));
    } catch (e) {
      setCookiesJsonText('[]');
    }
    setCookiesModalOpen(true);
  };

  const handleIntervalChange = async (minutes) => {
    if (isNaN(minutes) || minutes < 1) return;
    const newConfig = { ...config, intervalMinutes: minutes };
    setConfig(newConfig);
    await saveConfig(newConfig);
  };

  const handleSaveCookies = async (e) => {
    e.preventDefault();
    try {
      const parsed = JSON.parse(cookiesJsonText);
      const res = await fetch('/api/cookies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cookies: parsed })
      });
      if (!res.ok) throw new Error('Save failed');
      setCookiesModalOpen(false);
      toast.success(t('cookiesSaved'));
      fetchData();
    } catch (e) {
      toast.error(t('invalidJson'));
    }
  };

  const fetchData = async () => {
    try {
      const [statusRes, configRes, dealsRes] = await Promise.all([
        fetch('/api/status'),
        fetch('/api/config'),
        fetch('/api/deals')
      ]);
      setStatus(await statusRes.json());
      
      const configData = await configRes.json();
      setConfig(configData);
      if (configData.locale && configData.locale !== i18n.language) {
        i18n.changeLanguage(configData.locale);
      }

      setDeals(await dealsRes.json());
    } catch (e) {
      console.error("Failed to fetch data", e);
    }
  };

  useEffect(() => {
    fetchData();

    const socket = io({
      path: '/ws',
      transports: ['websocket', 'polling'],
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000
    });

    socket.on('connect', () => {
      setIsWsConnected(true);
    });

    socket.on('disconnect', () => {
      setIsWsConnected(false);
    });

    socket.on('connect_error', () => {
      setIsWsConnected(false);
    });

    socket.on('status_update', (newStatus) => {
      setStatus(newStatus);
    });

    socket.on('config_update', (newConfig) => {
      setConfig(newConfig);
      if (newConfig.locale && newConfig.locale !== i18n.language) {
        i18n.changeLanguage(newConfig.locale);
      }
    });

    socket.on('deals_update', (newDeals) => {
      setDeals(newDeals);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Fallback to HTTP polling if WS is disconnected
  useEffect(() => {
    if (isWsConnected) return;

    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [isWsConnected]);

  const saveConfig = async (newConfig) => {
    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig)
      });
      fetchData();
    } catch (e) {
      toast.error("Failed to save configuration");
    }
  };

  const togglePolling = async () => {
    try {
      await fetch('/api/action/toggle-polling', { method: 'POST' });
      fetchData();
      toast.info(status.isPollingEnabled ? t('paused') : t('active'));
    } catch (e) {
      toast.error("Action failed");
    }
  };

  const runManualCheck = async () => {
    try {
      await fetch('/api/action/run-check', { method: 'POST' });
      toast.success(t('manualCheckStarted'));
    } catch (e) {
      toast.error("Failed to start check");
    }
  };

  const confirmDeleteDeal = async () => {
    if (!deleteDealId) return;
    try {
      await fetch(`/api/deals/${deleteDealId}`, { method: 'DELETE' });
      fetchData();
      toast.success(t('dealDeleted'));
    } catch (e) {
      toast.error("Failed to delete deal");
    } finally {
      setDeleteDealId(null);
    }
  };

  const changeLanguage = async (lng) => {
    i18n.changeLanguage(lng);
    if (config) {
      await saveConfig({ ...config, locale: lng });
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const handleNotificationToggle = async (providerId) => {
    const notifications = config.notifications || {};
    const provider = notifications[providerId] || {};
    const updatedNotifications = {
      ...notifications,
      [providerId]: { ...provider, enabled: !provider.enabled }
    };
    const newConfig = { ...config, notifications: updatedNotifications };
    setConfig(newConfig);
    await saveConfig(newConfig);
  };

  const openNotificationModal = (providerId) => {
    setEditingProviderId(providerId);
    const currentProviderConfig = config.notifications?.[providerId] || {};
    setNotificationForm({ ...currentProviderConfig });
    setNotificationModalOpen(true);
  };

  const saveNotificationModal = async (e) => {
    e.preventDefault();
    if (!editingProviderId) return;

    const newNotifications = {
      ...config.notifications,
      [editingProviderId]: {
        ...config.notifications?.[editingProviderId],
        ...notificationForm
      }
    };
    const newConfig = { ...config, notifications: newNotifications };
    setConfig(newConfig);
    await saveConfig(newConfig);
    setNotificationModalOpen(false);
    toast.success(t('settingsSaved'));
  };

  const handleNotificationFormChange = (field, value) => {
    setNotificationForm(prev => ({ ...prev, [field]: value }));
  };

  const handleNotificationChange = (providerId, field, value) => {
    setConfig({
      ...config,
      notifications: {
        ...config.notifications,
        [providerId]: {
          ...config.notifications[providerId],
          [field]: value
        }
      }
    });
  };

  const saveNotifications = async () => {
    await saveConfig(config);
    toast.success(t('settingsSaved'));
  };

  // Searches Logic
  const openSearchModal = (index = null) => {
    if (index !== null) {
      const s = config.searches[index];
      setSearchForm({ 
        url: s.url || '', 
        maxPrice: s.maxPrice || '', 
        mandatoryKeywords: (s.mandatoryKeywords || []).join(', '), 
        optionalKeywords: (s.optionalKeywords || []).join(', ') 
      });
      setEditingSearchIndex(index);
    } else {
      setSearchForm({ url: '', maxPrice: '', mandatoryKeywords: '', optionalKeywords: '' });
      setEditingSearchIndex(null);
    }
    setSearchModalOpen(true);
  };

  const saveSearch = async (e) => {
    e.preventDefault();
    const newSearch = {
      url: searchForm.url,
      maxPrice: searchForm.maxPrice ? Number(searchForm.maxPrice) : null,
      mandatoryKeywords: searchForm.mandatoryKeywords.replace(/,/g, ' ').split(/\s+/).map(s => s.trim()).filter(Boolean),
      optionalKeywords: searchForm.optionalKeywords.replace(/,/g, ' ').split(/\s+/).map(s => s.trim()).filter(Boolean)
    };

    const newSearches = [...(config.searches || [])];
    if (editingSearchIndex !== null) {
      newSearches[editingSearchIndex] = newSearch;
    } else {
      newSearches.push(newSearch);
    }

    await saveConfig({ ...config, searches: newSearches });
    setSearchModalOpen(false);
    toast.success(t('searchSaved'));
  };

  const confirmDeleteSearch = async () => {
    if (deleteSearchIdx === null) return;
    const newSearches = [...config.searches];
    newSearches.splice(deleteSearchIdx, 1);
    await saveConfig({ ...config, searches: newSearches });
    setDeleteSearchIdx(null);
    toast.success(t('searchDeleted'));
  };

  if (!status || !config) return <div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>;

  const activeNotificationsCount = Object.values(config.notifications || {}).filter(n => n?.enabled).length;

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-card flex flex-col">
        <div className="h-16 flex items-center px-6 border-b font-bold text-xl tracking-tight space-x-3">
          <img src={avitoLogo} alt="Avito Logo" className="h-7 w-auto object-contain" />
          <span>Avito<span className="text-primary">Parser</span></span>
        </div>
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          <SidebarItem icon={LayoutDashboard} label={t('dashboard')} active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <SidebarItem icon={List} label={t('deals')} active={activeTab === 'deals'} onClick={() => setActiveTab('deals')} />
          <SidebarItem icon={Search} label={t('searches')} active={activeTab === 'searches'} onClick={() => setActiveTab('searches')} />
          <SidebarItem icon={Settings} label={t('settings')} active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
        </div>
        <div className="p-4 border-t text-sm text-muted-foreground flex items-center justify-between">
           <div className="flex items-center space-x-2">
              <Server size={16} />
              <span>v{status?.version || '1.0.0'}</span>
           </div>
           <div className={`flex items-center space-x-1 text-xs px-2 py-0.5 rounded-full border transition-colors ${isWsConnected ? 'bg-green-500/10 text-green-500 border-green-500/30' : 'bg-amber-500/10 text-amber-500 border-amber-500/30'}`} title={isWsConnected ? "WebSocket Connected" : "HTTP Polling Active (Fallback)"}>
              {isWsConnected ? <Wifi size={12} /> : <RefreshCw size={12} className="animate-spin" />}
              <span>{isWsConnected ? 'WS' : 'Polling'}</span>
           </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8 bg-muted/30 relative">
        <div className="max-w-6xl mx-auto space-y-8">
          
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold tracking-tight">{t(activeTab)}</h1>
          </div>

          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <div className="text-sm font-medium text-muted-foreground">{t('status')}</div>
                  <div className="mt-2 text-2xl font-bold flex items-center space-x-2">
                    <span className="relative flex h-3 w-3">
                      {status.isPollingEnabled ? (
                        <><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span></>
                      ) : (
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                      )}
                    </span>
                    <span>{status.isPollingEnabled ? t('active') : t('paused')}</span>
                  </div>
                </Card>

                <Card>
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-muted-foreground">{t('pollingInterval')}</div>
                    <Clock size={18} className="text-muted-foreground" />
                  </div>
                  <div className="mt-2 text-2xl font-bold">
                    {config.intervalMinutes || config.checkIntervalMinutes || 5} <span className="text-base font-normal text-muted-foreground">{t('minutes')}</span>
                  </div>
                </Card>

                <Card>
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-muted-foreground">{t('activeSearches')}</div>
                    <SearchCode size={18} className="text-muted-foreground" />
                  </div>
                  <div className="mt-2 text-2xl font-bold">{config.searches?.length || 0}</div>
                </Card>

                <Card>
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-muted-foreground">{t('activeNotifications')}</div>
                    <Bell size={18} className="text-muted-foreground" />
                  </div>
                  <div className="mt-2 text-2xl font-bold">
                    {activeNotificationsCount} <span className="text-base font-normal text-muted-foreground">/ {status.notifications?.length || 0}</span>
                  </div>
                </Card>
              </div>

              <div className="flex space-x-4">
                <Button onClick={togglePolling} variant={status.isPollingEnabled ? "destructive" : "primary"}>
                  {status.isPollingEnabled ? <><Pause className="mr-2 h-4 w-4" /> {t('pausePolling')}</> : <><Play className="mr-2 h-4 w-4" /> {t('startPolling')}</>}
                </Button>
                <Button onClick={runManualCheck} variant="outline">
                  <Globe className="mr-2 h-4 w-4" /> {t('runCheck')}
                </Button>
              </div>

              <DealsAnalyticsChart deals={deals} t={t} />
            </div>
          )}

          {activeTab === 'deals' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {deals.length === 0 ? (
                <div className="col-span-full py-12 text-center text-muted-foreground">{t('noDeals')}</div>
              ) : (
                deals.map(deal => (
                  <Card key={deal.id} className="flex flex-col">
                    {deal.image && <img src={deal.image} alt={deal.title} className="w-full h-48 object-cover rounded-md mb-4" />}
                    <h3 className="font-semibold text-lg line-clamp-2 mb-2" title={deal.title}>{deal.title}</h3>
                    <div className="text-2xl font-bold text-primary mb-4">{deal.price} ₽</div>
                    <div className="mt-auto pt-4 flex items-center justify-between border-t">
                      <a href={deal.url} target="_blank" rel="noreferrer" className="text-sm text-blue-500 hover:underline">Avito Link</a>
                      <Button variant="ghost" className="text-destructive h-8 px-2" onClick={() => setDeleteDealId(deal.id)}>
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}

          {activeTab === 'searches' && (
            <Card>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold">Active Searches</h2>
                  <Button onClick={() => openSearchModal(null)}>{t('addSearch')}</Button>
                </div>
                {config.searches.length === 0 ? (
                   <p className="text-muted-foreground text-sm">No searches configured.</p>
                ) : (
                  <div className="space-y-4">
                    {config.searches.map((s, i) => (
                      <div key={i} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex-1 overflow-hidden mr-4">
                           <div className="font-medium truncate" title={s.url}>{s.url}</div>
                           <div className="text-sm text-muted-foreground mt-1 flex gap-4">
                             {s.maxPrice && <span>Max: {s.maxPrice} ₽</span>}
                             {s.mandatoryKeywords?.length > 0 && <span>Must have: {s.mandatoryKeywords.join(', ')}</span>}
                           </div>
                        </div>
                        <div className="flex space-x-2">
                           <Button variant="outline" size="sm" onClick={() => openSearchModal(i)}>Edit</Button>
                           <Button variant="destructive" size="sm" onClick={() => setDeleteSearchIdx(i)}><Trash2 size={16}/></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
               <Card>
                  <h2 className="text-xl font-semibold mb-4">General Settings</h2>
                  <div className="flex flex-wrap items-center gap-6">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">Theme:</span>
                      <Button variant="outline" size="icon" onClick={toggleTheme}>
                        {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                      </Button>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">{t('language')}:</span>
                      <div className="flex border rounded-md overflow-hidden">
                        <button onClick={() => changeLanguage('en')} className={`px-3 py-1.5 text-sm font-medium ${i18n.language === 'en' ? 'bg-primary text-primary-foreground' : 'bg-transparent hover:bg-muted'}`}>EN</button>
                        <button onClick={() => changeLanguage('ru')} className={`px-3 py-1.5 text-sm font-medium ${i18n.language === 'ru' ? 'bg-primary text-primary-foreground' : 'bg-transparent hover:bg-muted'}`}>RU</button>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 sm:pl-6 sm:border-l">
                      <Clock size={18} className="text-muted-foreground" />
                      <span className="text-sm font-medium">{t('pollingInterval')}:</span>
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          min="1"
                          max="1440"
                          value={config.intervalMinutes || config.checkIntervalMinutes || 5}
                          onChange={e => handleIntervalChange(Number(e.target.value))}
                          className="w-20 h-9 px-2 text-sm rounded-md border border-input bg-transparent text-center font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        />
                        <span className="text-xs text-muted-foreground">{t('minutes')}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 sm:pl-6 sm:border-l">
                      <div className="flex items-center space-x-2">
                        <Cookie size={18} className="text-muted-foreground" />
                        <span className="text-sm font-medium">{t('cookies')}:</span>
                        <span className="text-xs text-muted-foreground font-mono">({status.cookiesCount || 0} items)</span>
                      </div>
                      <Button variant="outline" size="sm" onClick={openCookiesModal}>
                        {t('updateCookies')}
                      </Button>
                    </div>
                  </div>
               </Card>

               <Card>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold">{t('notifications')}</h2>
                  </div>
                  <div className="space-y-4">
                     {status.notifications.map(p => {
                       const isEnabled = !!config.notifications?.[p.id]?.enabled;
                       return (
                        <div key={p.id} className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-muted/30 transition-colors">
                           <div className="flex items-center space-x-3">
                             <div className={`w-2.5 h-2.5 rounded-full ${isEnabled ? 'bg-green-500' : 'bg-muted-foreground/30'}`} />
                             <div>
                               <div className="font-medium text-base">{p.name}</div>
                               <div className="text-xs text-muted-foreground">
                                 {isEnabled ? t('enabled') : t('disabled')}
                               </div>
                             </div>
                           </div>
                           <div className="flex items-center space-x-3">
                             <Button 
                               variant="outline" 
                               size="sm" 
                               onClick={() => openNotificationModal(p.id)}
                             >
                               <Sliders size={16} className="mr-1.5" />
                               {t('manage')}
                             </Button>
                             <Switch 
                               checked={isEnabled} 
                               onChange={() => handleNotificationToggle(p.id)} 
                             />
                           </div>
                        </div>
                     )})}
                  </div>
               </Card>
            </div>
          )}

        </div>
      </main>

      {/* Search Modal */}
      <Modal isOpen={searchModalOpen} onClose={() => setSearchModalOpen(false)} title={editingSearchIndex !== null ? "Edit Search" : t('addSearch')}>
        <form onSubmit={saveSearch} className="space-y-4">
          <Input 
            label={t('url')} 
            value={searchForm.url} 
            onChange={e => setSearchForm({...searchForm, url: e.target.value})} 
            placeholder="https://www.avito.ru/..."
            required
          />
          <Input 
            label={t('maxPrice')} 
            type="number"
            value={searchForm.maxPrice} 
            onChange={e => setSearchForm({...searchForm, maxPrice: e.target.value})} 
            placeholder="e.g. 50000"
          />
          <Input 
            label={t('mandatoryKeywords')} 
            value={searchForm.mandatoryKeywords} 
            onChange={e => setSearchForm({...searchForm, mandatoryKeywords: e.target.value})} 
            placeholder="e.g. iphone, 13, pro"
          />
          <Input 
            label={t('optionalKeywords')} 
            value={searchForm.optionalKeywords} 
            onChange={e => setSearchForm({...searchForm, optionalKeywords: e.target.value})} 
            placeholder="e.g. black, 256gb"
          />
          <div className="pt-4 flex justify-end space-x-2 border-t">
            <Button variant="ghost" onClick={() => setSearchModalOpen(false)}>{t('cancel')}</Button>
            <Button type="submit">{t('save')}</Button>
          </div>
        </form>
      </Modal>

      {/* Delete Deal Confirm Modal */}
      <ConfirmModal 
        isOpen={deleteDealId !== null} 
        onClose={() => setDeleteDealId(null)} 
        onConfirm={confirmDeleteDeal} 
        title={t('confirmDeleteDealTitle')} 
        message={t('confirmDeleteDealMessage')} 
        confirmText={t('delete')} 
        cancelText={t('cancel')} 
      />

      {/* Delete Search Confirm Modal */}
      <ConfirmModal 
        isOpen={deleteSearchIdx !== null} 
        onClose={() => setDeleteSearchIdx(null)} 
        onConfirm={confirmDeleteSearch} 
        title={t('confirmDeleteSearchTitle')} 
        message={t('confirmDeleteSearchMessage')} 
        confirmText={t('delete')} 
        cancelText={t('cancel')} 
      />

      {/* Cookies Modal */}
      <Modal isOpen={cookiesModalOpen} onClose={() => setCookiesModalOpen(false)} title={t('updateCookies')}>
        <form onSubmit={handleSaveCookies} className="space-y-4">
          <div className="flex flex-col space-y-1.5">
            <label className="text-sm font-medium">Cookies JSON (Array)</label>
            <textarea 
              value={cookiesJsonText} 
              onChange={e => setCookiesJsonText(e.target.value)} 
              placeholder={t('cookiesPlaceholder')}
              rows={12}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
            />
          </div>
          <div className="pt-4 flex justify-end space-x-2 border-t">
            <Button variant="ghost" onClick={() => setCookiesModalOpen(false)}>{t('cancel')}</Button>
            <Button type="submit">{t('save')}</Button>
          </div>
        </form>
      </Modal>

      {/* Notification Settings Modal */}
      <Modal 
        isOpen={notificationModalOpen} 
        onClose={() => setNotificationModalOpen(false)} 
        title={`${t('notifications')}: ${status.notifications?.find(p => p.id === editingProviderId)?.name || ''}`}
      >
        <form onSubmit={saveNotificationModal} className="space-y-4">
          {editingProviderId === 'discord' && (
            <>
              <Input 
                label="Webhook URL" 
                value={notificationForm.webhookUrl || ''} 
                onChange={e => handleNotificationFormChange('webhookUrl', e.target.value)}
                placeholder="https://discord.com/api/webhooks/..."
              />
              <Input 
                label="Proxy URL (optional)" 
                value={notificationForm.proxyUrl || ''} 
                onChange={e => handleNotificationFormChange('proxyUrl', e.target.value)}
                placeholder="e.g. http://127.0.0.1:8080 or socks5://..."
              />
            </>
          )}

          {editingProviderId === 'mqtt' && (
            <>
              <Input 
                label="Broker URL" 
                value={notificationForm.brokerUrl || ''} 
                onChange={e => handleNotificationFormChange('brokerUrl', e.target.value)}
                placeholder="mqtt://localhost:1883"
              />
              <Input 
                label="Topic" 
                value={notificationForm.topic || ''} 
                onChange={e => handleNotificationFormChange('topic', e.target.value)}
                placeholder="avito/deals"
              />
              <div className="grid grid-cols-2 gap-4">
                <Input 
                  label="Username (optional)" 
                  value={notificationForm.username || ''} 
                  onChange={e => handleNotificationFormChange('username', e.target.value)}
                />
                <Input 
                  label="Password (optional)" 
                  type="password"
                  value={notificationForm.password || ''} 
                  onChange={e => handleNotificationFormChange('password', e.target.value)}
                />
              </div>
            </>
          )}

          {editingProviderId === 'telegram' && (
            <Input 
              label="Chat ID" 
              value={notificationForm.chatId ?? (status.telegramAdminId || '')} 
              onChange={e => handleNotificationFormChange('chatId', e.target.value)}
              placeholder={status.telegramAdminId ? `Default: ${status.telegramAdminId}` : "e.g. 123456789"}
            />
          )}

          <div className="pt-4 flex justify-end space-x-2 border-t">
            <Button variant="ghost" onClick={() => setNotificationModalOpen(false)}>{t('cancel')}</Button>
            <Button type="submit">{t('save')}</Button>
          </div>
        </form>
      </Modal>

    </div>
  );
}

export default App;
