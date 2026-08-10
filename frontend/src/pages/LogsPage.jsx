import React, { useState, useEffect, useRef } from 'react';

function LogsPage({ t, logs }) {
  const [logLevel, setLogLevel] = useState('1'); // 1: INFO, 2: WARN, 3: ERROR, 4: DEBUG
  const [maxLines, setMaxLines] = useState(100);
  const endOfLogsRef = useRef(null);

  useEffect(() => {
    endOfLogsRef.current?.scrollIntoView({ behavior: 'smooth' });
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
      case 'INFO': return 'text-green-500';
      case 'WARN': return 'text-yellow-500';
      case 'ERROR': return 'text-red-500';
      case 'DEBUG': return 'text-gray-500';
      default: return 'text-foreground';
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

      <div className="flex-1 rounded-md border border-border bg-black text-gray-200 overflow-y-auto p-4 font-mono text-sm shadow-inner">
        {visibleLogs.length === 0 ? (
          <div className="text-gray-500 italic">{t('noLogsMatch')}</div>
        ) : (
          visibleLogs.map((log, i) => (
            <div key={i} className="mb-1 leading-relaxed">
              <span className="text-gray-500">[{log.timestamp}]</span>{' '}
              <span className={`font-bold ${getLevelColor(log.levelName)}`}>
                {log.levelName}
              </span>{' '}
              {log.name && <span className="text-blue-400">{log.name}:</span>}{' '}
              <span>{log.message}</span>
            </div>
          ))
        )}
        <div ref={endOfLogsRef} />
      </div>
    </div>
  );
}

export default LogsPage;
