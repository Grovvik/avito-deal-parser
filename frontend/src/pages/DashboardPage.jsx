import React from 'react';
import { Play, Pause, Globe, RotateCcw, Clock, SearchCode, Bell } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import DealsAnalyticsChart from '../components/charts/DealsAnalyticsChart';

const DashboardPage = ({
  t,
  status,
  config,
  deals,
  activeNotificationsCount,
  togglePolling,
  runManualCheck,
  setClearSentModalOpen
}) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <div className="text-sm font-medium text-muted-foreground">{t('status')}</div>
          <div className="mt-2 text-2xl font-semibold flex items-center space-x-2">
            <span className="relative flex h-3 w-3 shrink-0">
              {status.isPending ? (
                <><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span></>
              ) : status.isPollingEnabled ? (
                <><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span></>
              ) : (
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              )}
            </span>
            <span>
              {status.isPending
                ? t('pending') || 'Pending'
                : status.isPollingEnabled
                  ? t('active')
                  : t('paused')}
            </span>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-muted-foreground">{t('pollingInterval')}</div>
            <Clock size={18} className="text-muted-foreground" />
          </div>
          <div className="mt-2 text-2xl font-semibold">
            {config.intervalMinutes || config.checkIntervalMinutes || 5} <span className="text-base font-normal text-muted-foreground">{t('minutes')}</span>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-muted-foreground">{t('activeSearches')}</div>
            <SearchCode size={18} className="text-muted-foreground" />
          </div>
          <div className="mt-2 text-2xl font-semibold">{config.searches?.length || 0}</div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-muted-foreground">{t('activeNotifications')}</div>
            <Bell size={18} className="text-muted-foreground" />
          </div>
          <div className="mt-2 text-2xl font-semibold">
            {activeNotificationsCount} <span className="text-base font-normal text-muted-foreground">/ {status.notifications?.length || 0}</span>
          </div>
        </Card>
      </div>

      <div className="flex flex-wrap gap-4">
        <Button onClick={togglePolling} variant={status.isPollingEnabled ? "destructive" : "primary"}>
          {status.isPollingEnabled ? <><Pause className="mr-2 h-4 w-4" /> {t('pausePolling')}</> : <><Play className="mr-2 h-4 w-4" /> {t('startPolling')}</>}
        </Button>
        <Button onClick={runManualCheck} variant="outline" disabled={status.isPending}>
          <Globe className={`mr-2 h-4 w-4 ${status.isPending ? 'animate-spin' : ''}`} /> {t('runCheck')}
        </Button>
        <Button onClick={() => setClearSentModalOpen(true)} variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10">
          <RotateCcw className="mr-2 h-4 w-4" /> {t('clearSentDeals')}
        </Button>
      </div>

      <DealsAnalyticsChart deals={deals} t={t} />
    </div>
  );
};

export default DashboardPage;
