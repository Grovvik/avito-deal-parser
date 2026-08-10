const { Chalk } = require('chalk');
const EventEmitter = require('events');

function formatDate(date, millis = true) {
    const now = date instanceof Date ? date : (date ? new Date(date) : new Date());

    const options = {
        timeZone: 'Europe/Moscow',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    };

    const mskString = now.toLocaleString('ru-RU', options).replace(',', '');

    if (!millis) return mskString;

    const milliseconds = String(now.getMilliseconds()).padStart(3, '0');
    return `${mskString}.${milliseconds}`;
}

const chalk = new Chalk();
const levelNames = [null, chalk.bgGreen(chalk.whiteBright(" INFO  ")), chalk.bgYellow(chalk.whiteBright(" WARN  ")), chalk.bgRed(chalk.whiteBright(" ERROR ")), chalk.bgGray(chalk.whiteBright(" DEBUG "))];

class Logger extends EventEmitter {
    static history = [];
    static maxHistory = 1000;
    static globalEmitter = new EventEmitter();

    constructor(name) {
        super();
        this.name = name;
    }

    log(level, ...msg) {
        const timestamp = formatDate();
        const levelName = levelNames[level];
        const rawMessage = msg.join(' ');
        
        const logEntry = {
            timestamp,
            level,
            levelName: ['INFO', 'WARN', 'ERROR', 'DEBUG'][level - 1], // Raw level name
            name: this.name,
            message: rawMessage
        };

        // Add to history buffer
        Logger.history.push(logEntry);
        if (Logger.history.length > Logger.maxHistory) {
            Logger.history.shift();
        }

        // Emit globally
        Logger.globalEmitter.emit('new_log', logEntry);

        console.log(`[${chalk.gray(timestamp)}] ${levelName} ${this.name ? this.name+':' : ''}`, ...msg);
    }

    info(...msg) {
        this.log(1, ...msg);
    }

    warn(...msg) {
        this.log(2, ...msg);
    }

    error(...msg) {
        this.log(3, ...msg);
    }

    debug(...msg) {
        this.log(4, ...msg);
    }
}

module.exports = Logger;
