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
  status,
  openCookiesModal,
  openNotificationModal,
  handleNotificationToggle
}) => {
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
              <span className="text-xs text-muted-foreground font-mono">({status.cookiesCount || 0} {t('items')})</span>
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
