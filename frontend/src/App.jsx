import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { io } from 'socket.io-client';
import { useTheme } from './hooks/useTheme';

// Modals & UI
import Modal from './components/Modal';
import ConfirmModal from './components/ConfirmModal';
import { useToast } from './components/Toast';
import Input from './components/ui/Input';
import Button from './components/ui/Button';
import Switch from './components/ui/Switch';

// Layout
import Sidebar from './components/layout/Sidebar';
import MobileHeader from './components/layout/MobileHeader';

// Pages
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import DealsPage from './pages/DealsPage';
import SearchesPage from './pages/SearchesPage';
import SettingsPage from './pages/SettingsPage';
import LogsPage from './pages/LogsPage';

// Utils
import { hashPassword } from './utils/crypto';

function App() {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const [theme, setTheme] = useTheme();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [status, setStatus] = useState(null);
  const [config, setConfig] = useState(null);
  const [deals, setDeals] = useState([]);
  const [logs, setLogs] = useState([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const visibleDeals = useMemo(() => deals.filter(deal => !deal.hidden), [deals]);

  // Search Modal State
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [editingSearchIndex, setEditingSearchIndex] = useState(null);
  const [searchForm, setSearchForm] = useState({
    url: '',
    maxPrice: '',
    keywordGroups: [''],
    includeReserved: false,
    onlyDelivery: false
  });

  // Confirmation Modals State
  const [deleteDealId, setDeleteDealId] = useState(null);
  const [deleteSearchIdx, setDeleteSearchIdx] = useState(null);
  const [clearSentModalOpen, setClearSentModalOpen] = useState(false);

  // Cookies Modal State
  const [cookiesModalOpen, setCookiesModalOpen] = useState(false);
  const [cookiesJsonText, setCookiesJsonText] = useState('');

  // Notification Modal State
  const [notificationModalOpen, setNotificationModalOpen] = useState(false);
  const [editingProviderId, setEditingProviderId] = useState(null);
  const [notificationForm, setNotificationForm] = useState({});

  const [isWsConnected, setIsWsConnected] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authPasswordInput, setAuthPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  const socketRef = useRef(null);

  const openCookiesModal = () => {
    if (socketRef.current) {
      socketRef.current.emit('get_cookies', (data) => {
        setCookiesJsonText(JSON.stringify(data || [], null, 2));
      });
    }
    setCookiesModalOpen(true);
  };

  const handleIntervalChange = (minutes) => {
    if (isNaN(minutes) || minutes < 1) return;
    const newConfig = { ...config, intervalMinutes: minutes };
    setConfig(newConfig);
    saveConfig(newConfig);
  };

  const handleNightIntervalChange = (minutes) => {
    if (isNaN(minutes) || minutes < 1) return;
    const newConfig = { ...config, nightIntervalMinutes: minutes };
    setConfig(newConfig);
    saveConfig(newConfig);
  };

  const handleNightModeToggle = () => {
    const isCurrentlyEnabled = config.nightModeEnabled !== false;
    const newConfig = { ...config, nightModeEnabled: !isCurrentlyEnabled };
    setConfig(newConfig);
    saveConfig(newConfig);
  };

  const handleSaveCookies = (e) => {
    e.preventDefault();
    try {
      const parsed = JSON.parse(cookiesJsonText);
      socketRef.current?.emit('save_cookies', parsed);
      setCookiesModalOpen(false);
      toast.success(t('cookiesSaved'));
    } catch (e) {
      toast.error(t('invalidJson'));
    }
  };

  useEffect(() => {
    const savedHash = localStorage.getItem('web_auth_hash');
    const socketAuth = savedHash ? { passwordHash: savedHash } : {};

    const socket = io({
      path: '/ws',
      auth: socketAuth,
      transports: ['websocket', 'polling'],
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000
    });
    socketRef.current = socket;

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
      if (!newStatus.authRequired) {
        setIsAuthenticated(true);
      }
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

    socket.on('logs_history', (history) => {
      setLogs(history || []);
    });

    socket.on('new_log', (logEntry) => {
      setLogs(prev => {
        const newLogs = [...prev, logEntry];
        if (newLogs.length > 1000) return newLogs.slice(-1000);
        return newLogs;
      });
    });

    socket.on('auth_success', ({ passwordHash }) => {
      if (passwordHash) {
        localStorage.setItem('web_auth_hash', passwordHash);
      }
      setIsAuthenticated(true);
      setAuthError('');
    });

    socket.on('auth_error', (data) => {
      setIsAuthenticated(false);
      if (data?.message) {
        setAuthError(t('invalidPassword'));
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const saveConfig = (newConfig) => {
    socketRef.current?.emit('save_config', newConfig);
  };

  const togglePolling = () => {
    socketRef.current?.emit('toggle_polling');
    toast.info(status?.isPollingEnabled ? t('paused') : t('active'));
  };

  const runManualCheck = () => {
    socketRef.current?.emit('run_check');
    toast.success(t('manualCheckStarted'));
  };

  const confirmDeleteDeal = () => {
    if (!deleteDealId) return;
    socketRef.current?.emit('delete_deal', deleteDealId);
    toast.success(t('dealDeleted'));
    setDeleteDealId(null);
  };

  const confirmClearSentDeals = () => {
    socketRef.current?.emit('clear_sent_deals');
    toast.success(t('sentDealsCleared'));
    setClearSentModalOpen(false);
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!authPasswordInput) return;
    try {
      const hash = await hashPassword(authPasswordInput.trim());
      if (socketRef.current) {
        socketRef.current.auth = { passwordHash: hash };
        socketRef.current.disconnect();
        socketRef.current.connect();
        socketRef.current.emit('auth', { passwordHash: hash });
      }
    } catch (err) {
      setAuthError(t('error'));
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('web_auth_hash');
    setIsAuthenticated(false);
    setAuthError('');
    if (socketRef.current) {
      socketRef.current.auth = {};
      socketRef.current.disconnect();
      socketRef.current.connect();
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

  // Searches Logic
  const addKeywordGroup = () => {
    setSearchForm(prev => ({
      ...prev,
      keywordGroups: [...prev.keywordGroups, '']
    }));
  };

  const updateKeywordGroup = (index, value) => {
    setSearchForm(prev => {
      const newGroups = [...prev.keywordGroups];
      newGroups[index] = value;
      return { ...prev, keywordGroups: newGroups };
    });
  };

  const removeKeywordGroup = (index) => {
    setSearchForm(prev => {
      const newGroups = prev.keywordGroups.filter((_, i) => i !== index);
      return { ...prev, keywordGroups: newGroups.length > 0 ? newGroups : [''] };
    });
  };

  const openSearchModal = (index = null) => {
    if (index !== null) {
      const s = config.searches[index];
      
      let initialKeywordGroups = [];
      if (s.keywordGroups) {
        initialKeywordGroups = s.keywordGroups.map(group => group.join(', '));
      } else {
        if (s.mandatoryKeywords && s.mandatoryKeywords.length > 0) {
          initialKeywordGroups.push(...s.mandatoryKeywords);
        }
        if (s.optionalKeywords && s.optionalKeywords.length > 0) {
          initialKeywordGroups.push(s.optionalKeywords.join(', '));
        }
      }
      if (initialKeywordGroups.length === 0) initialKeywordGroups = [''];

      setSearchForm({
        url: s.url || '',
        maxPrice: s.maxPrice || '',
        keywordGroups: initialKeywordGroups,
        includeReserved: Boolean(s.includeReserved || s.sendReserved),
        onlyDelivery: Boolean(s.onlyDelivery || s.requireDelivery)
      });
      setEditingSearchIndex(index);
    } else {
      setSearchForm({
        url: '',
        maxPrice: '',
        keywordGroups: [''],
        includeReserved: false,
        onlyDelivery: false
      });
      setEditingSearchIndex(null);
    }
    setSearchModalOpen(true);
  };

  const saveSearch = async (e) => {
    e.preventDefault();
    
    const parsedKeywordGroups = searchForm.keywordGroups
      .map(groupStr => groupStr.split(',').map(s => s.trim()).filter(Boolean))
      .filter(group => group.length > 0);

    const newSearch = {
      url: searchForm.url,
      maxPrice: searchForm.maxPrice ? Number(searchForm.maxPrice) : null,
      keywordGroups: parsedKeywordGroups,
      includeReserved: Boolean(searchForm.includeReserved),
      onlyDelivery: Boolean(searchForm.onlyDelivery)
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

  if (status?.authRequired && !isAuthenticated) {
    return (
      <AuthPage
        t={t}
        handleLoginSubmit={handleLoginSubmit}
        authPasswordInput={authPasswordInput}
        setAuthPasswordInput={setAuthPasswordInput}
        authError={authError}
        setAuthError={setAuthError}
      />
    );
  }

  if (!status || !config) return <div className="min-h-screen bg-background flex items-center justify-center">{t('loading')}</div>;

  const activeNotificationsCount = Object.values(config.notifications || {}).filter(n => n?.enabled).length;

  const handleTabClick = (tab) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden relative">
      <Sidebar
        t={t}
        activeTab={activeTab}
        handleTabClick={handleTabClick}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        status={status}
        isAuthenticated={isAuthenticated}
        handleLogout={handleLogout}
        isWsConnected={isWsConnected}
      />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-8 bg-muted/30 relative flex flex-col min-w-0">
        <MobileHeader t={t} setIsMobileMenuOpen={setIsMobileMenuOpen} />

        <div className="max-w-6xl mx-auto space-y-8 w-full">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t(activeTab)}</h1>
          </div>

          {activeTab === 'dashboard' && (
            <DashboardPage
              t={t}
              status={status}
              config={config}
              deals={deals}
              activeNotificationsCount={activeNotificationsCount}
              togglePolling={togglePolling}
              runManualCheck={runManualCheck}
              setClearSentModalOpen={setClearSentModalOpen}
            />
          )}

          {activeTab === 'deals' && (
            <DealsPage
              t={t}
              visibleDeals={visibleDeals}
              setDeleteDealId={setDeleteDealId}
            />
          )}

          {activeTab === 'searches' && (
            <SearchesPage
              t={t}
              config={config}
              openSearchModal={openSearchModal}
              setDeleteSearchIdx={setDeleteSearchIdx}
            />
          )}

          {activeTab === 'logs' && (
            <LogsPage
              t={t}
              logs={logs}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsPage
              t={t}
              i18n={i18n}
              theme={theme}
              toggleTheme={toggleTheme}
              changeLanguage={changeLanguage}
              config={config}
              handleIntervalChange={handleIntervalChange}
              handleNightIntervalChange={handleNightIntervalChange}
              handleNightModeToggle={handleNightModeToggle}
              status={status}
              openCookiesModal={openCookiesModal}
              openNotificationModal={openNotificationModal}
              handleNotificationToggle={handleNotificationToggle}
              saveConfig={saveConfig}
            />
          )}
        </div>
      </main>

      {/* Search Modal */}
      <Modal isOpen={searchModalOpen} onClose={() => setSearchModalOpen(false)} title={editingSearchIndex !== null ? t('editSearch') : t('addSearch')}>
        <form onSubmit={saveSearch} className="space-y-4">
          <Input
            label={t('url')}
            value={searchForm.url}
            onChange={e => setSearchForm({ ...searchForm, url: e.target.value })}
            placeholder="https://www.avito.ru/..."
            required
          />
          <Input
            label={t('maxPrice')}
            type="number"
            value={searchForm.maxPrice}
            onChange={e => setSearchForm({ ...searchForm, maxPrice: e.target.value })}
            placeholder={t('maxPricePlaceholder')}
          />
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('keywordGroups')}</label>
            {searchForm.keywordGroups.map((group, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="flex-1">
                  <Input
                    value={group}
                    onChange={e => updateKeywordGroup(index, e.target.value)}
                    placeholder={t('keywordGroupPlaceholder')}
                  />
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="flex-shrink-0 w-10 h-10"
                  onClick={() => removeKeywordGroup(index)}
                >
                  ✕
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full mt-2"
              onClick={addKeywordGroup}
            >
              + {t('addKeywordGroup')}
            </Button>
          </div>

          <div className="space-y-3 pt-2 border-t">
            <div className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/20">
              <div className="pr-3">
                <div className="text-sm font-medium">{t('includeReserved')}</div>
                <div className="text-xs text-muted-foreground">{t('includeReservedDesc')}</div>
              </div>
              <Switch
                checked={searchForm.includeReserved}
                onChange={val => setSearchForm({ ...searchForm, includeReserved: val })}
              />
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/20">
              <div className="pr-3">
                <div className="text-sm font-medium">{t('onlyDelivery')}</div>
                <div className="text-xs text-muted-foreground">{t('onlyDeliveryDesc')}</div>
              </div>
              <Switch
                checked={searchForm.onlyDelivery}
                onChange={val => setSearchForm({ ...searchForm, onlyDelivery: val })}
              />
            </div>
          </div>

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
            <label className="text-sm font-medium">{t('cookiesJsonLabel')}</label>
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
                label={t('proxyUrlOptional')}
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
                  label={t('usernameOptional')}
                  value={notificationForm.username || ''}
                  onChange={e => handleNotificationFormChange('username', e.target.value)}
                />
                <Input
                  label={t('passwordOptional')}
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
              placeholder={status.telegramAdminId ? `${t('default')}: ${status.telegramAdminId}` : t('chatIdPlaceholder')}
            />
          )}

          <div className="pt-4 flex justify-end space-x-2 border-t">
            <Button variant="ghost" onClick={() => setNotificationModalOpen(false)}>{t('cancel')}</Button>
            <Button type="submit">{t('save')}</Button>
          </div>
        </form>
      </Modal>

      {/* Clear Sent Deals Confirm Modal */}
      <ConfirmModal
        isOpen={clearSentModalOpen}
        onClose={() => setClearSentModalOpen(false)}
        onConfirm={confirmClearSentDeals}
        title={t('confirmClearSentTitle')}
        message={t('confirmClearSentMessage')}
        confirmText={t('delete')}
        cancelText={t('cancel')}
      />

    </div>
  );
}

export default App;
