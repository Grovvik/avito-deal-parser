import React from 'react';
import { Moon, Sun, Clock, Cookie, Sliders } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Switch from '../components/ui/Switch';

const SettingsPage = ({
  t,
  i18n,
  theme,
  toggleTheme,
  changeLanguage,
  config,
  handleIntervalChange,
  handleNightIntervalChange,
  handleNightModeToggle,
  status,
  openCookiesModal,
  openNotificationModal,
  handleNotificationToggle,
  saveConfig
}) => {
  const handlePriceDropTypeChange = (e) => {
    saveConfig({ ...config, priceDropNotificationType: e.target.value });
  };
  const onNightIntervalChange = (val) => {
    if (typeof handleNightIntervalChange === 'function') {
      handleNightIntervalChange(val);
    } else {
      saveConfig({ ...config, nightIntervalMinutes: val });
    }
  };
  const onNightModeToggle = () => {
    if (typeof handleNightModeToggle === 'function') {
      handleNightModeToggle();
    } else {
      saveConfig({ ...config, nightModeEnabled: config.nightModeEnabled === false });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="text-xl font-semibold mb-4">{t('generalSettings')}</h2>
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">{t('theme')}:</span>
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
            <span className="text-sm font-medium">{t('dayPollingInterval')}:</span>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                min="1"
                max="1440"
                value={config.intervalMinutes || 5}
                onChange={e => handleIntervalChange(Number(e.target.value))}
                className="w-20 h-9 px-2 text-sm rounded-md border border-input bg-transparent text-center font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <span className="text-xs text-muted-foreground">{t('minutes')}</span>
            </div>
          </div>
          <div className="flex items-center space-x-3 sm:pl-6 sm:border-l">
            <Moon size={18} className="text-muted-foreground" />
            <div className="flex flex-col">
              <span className="text-sm font-medium">{t('nightPollingInterval')}:</span>
              <span className="text-[11px] text-muted-foreground">{t('nightModeBadge')}</span>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                min="1"
                max="1440"
                disabled={config.nightModeEnabled === false}
                value={config.nightIntervalMinutes || 15}
                onChange={e => onNightIntervalChange(Number(e.target.value))}
                className={`w-20 h-9 px-2 text-sm rounded-md border border-input bg-transparent text-center font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${config.nightModeEnabled === false ? 'opacity-40 cursor-not-allowed' : ''}`}
              />
              <span className="text-xs text-muted-foreground">{t('minutes')}</span>
            </div>
          </div>
          <div className="flex items-center space-x-3 sm:pl-6 sm:border-l">
            <div className="flex flex-col">
              <span className="text-sm font-medium">{t('nightMode')}:</span>
              <span className="text-[11px] text-muted-foreground">{config.nightModeEnabled !== false ? t('enabled') : t('disabled')}</span>
            </div>
            <Switch
              checked={config.nightModeEnabled !== false}
              onChange={onNightModeToggle}
            />
          </div>
          <div className="flex items-center space-x-3 sm:pl-6 sm:border-l">
            <div className="flex items-center space-x-2">
              <Cookie size={18} className="text-muted-foreground" />
              <span className="text-sm font-medium">{t('cookies')}:</span>
              <span className="text-xs text-muted-foreground font-mono">({status.cookiesCount || 0} {t('items')})</span>
            </div>
            <Button variant="outline" size="sm" onClick={openCookiesModal}>
              {t('updateCookies')}
            </Button>
          </div>
          <div className="flex items-center space-x-3 sm:pl-6 sm:border-l">
            <span className="text-sm font-medium">{t('priceDropAction')}:</span>
            <select
              value={config.priceDropNotificationType || 'update'}
              onChange={handlePriceDropTypeChange}
              className="px-2 h-9 text-sm rounded-md border border-input bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="update">{t('sendAsPriceUpdate')}</option>
              <option value="new">{t('sendAsNewDeal')}</option>
              <option value="none">{t('doNotSend')}</option>
            </select>
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
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${isEnabled ? 'bg-green-500' : 'bg-muted-foreground/30'}`} />
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
                    className="rounded-full w-9 h-9 p-0 sm:w-auto sm:h-9 sm:px-3 sm:py-1.5 sm:rounded-md"
                    onClick={() => openNotificationModal(p.id)}
                  >
                    <Sliders size={16} className="sm:mr-1.5" />
                    <span className="hidden sm:inline">{t('manage')}</span>
                  </Button>
                  <Switch
                    checked={isEnabled}
                    onChange={() => handleNotificationToggle(p.id)}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  );
};

export default SettingsPage;
