import React, { useState, useEffect, useRef } from 'react';

function LogsPage({ t, logs }) {
  const [logLevel, setLogLevel] = useState('1'); // 1: INFO, 2: WARN, 3: ERROR, 4: DEBUG
  const [maxLines, setMaxLines] = useState(100);
  const containerRef = useRef(null);
  const endOfLogsRef = useRef(null);
  const isAtBottomRef = useRef(true);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    isAtBottomRef.current = isAtBottom;
  };

  useEffect(() => {
    if (isAtBottomRef.current) {
      endOfLogsRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, maxLines, logLevel]);

  const levelOptions = [
    { value: '4', label: 'Debug' },
    { value: '1', label: 'Info' },
    { value: '2', label: 'Warn' },
    { value: '3', label: 'Error' },
  ];

  // Filtering:
  // If user selects Debug (4), show everything (1, 2, 3, 4)
  // If user selects Info (1), show Info, Warn, Error (1, 2, 3)
  // If user selects Warn (2), show Warn, Error (2, 3)
  // If user selects Error (3), show Error (3)
  const getVisibleLogs = () => {
    const minLevel = parseInt(logLevel, 10);
    return logs.filter(log => {
        if (minLevel === 4) return true;
        if (minLevel === 1) return [1, 2, 3].includes(log.level);
        if (minLevel === 2) return [2, 3].includes(log.level);
        if (minLevel === 3) return log.level === 3;
        return true;
    }).slice(-maxLines);
  };

  const visibleLogs = getVisibleLogs();

  const getLevelColor = (levelName) => {
    switch (levelName) {
      case 'INFO': return 'text-emerald-600 dark:text-emerald-400 font-semibold';
      case 'WARN': return 'text-amber-600 dark:text-amber-400 font-semibold';
      case 'ERROR': return 'text-destructive font-semibold';
      case 'DEBUG': return 'text-muted-foreground font-semibold';
      default: return 'text-card-foreground';
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] space-y-4">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium">{t('logLevel')}:</label>
          <select 
            value={logLevel} 
            onChange={(e) => setLogLevel(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
          >
            {levelOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium">{t('maxLines')}:</label>
          <input 
            type="number" 
            value={maxLines}
            onChange={(e) => setMaxLines(parseInt(e.target.value, 10) || 100)}
            min="10"
            max="1000"
            className="w-20 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
          />
        </div>
      </div>

      <div 
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 rounded-xl border border-border bg-card text-card-foreground overflow-y-auto p-4 font-mono text-xs sm:text-sm shadow-sm"
      >
        {visibleLogs.length === 0 ? (
          <div className="text-muted-foreground italic">{t('noLogsMatch')}</div>
        ) : (
          visibleLogs.map((log, i) => (
            <div key={i} className="mb-1 leading-relaxed">
              <span className="text-muted-foreground select-none">[{log.timestamp}]</span>{' '}
              <span className={getLevelColor(log.levelName)}>
                {log.levelName}
              </span>{' '}
              {log.name && <span className="text-foreground font-medium opacity-80">{log.name}:</span>}{' '}
              <span className="text-card-foreground">{log.message}</span>
            </div>
          ))
        )}
        <div ref={endOfLogsRef} />
      </div>
    </div>
  );
}

export default LogsPage;
