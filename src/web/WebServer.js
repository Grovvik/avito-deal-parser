const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const Logger = require('../utils/logger');

const pkg = require('../../package.json');

class WebServer {
    constructor(port, configManager, dealsManager, scraperRegistry, notificationRegistry, scheduler) {
        this.port = port;
        this.configManager = configManager;
        this.dealsManager = dealsManager;
        this.scraperRegistry = scraperRegistry;
        this.notificationRegistry = notificationRegistry;
        this.scheduler = scheduler;
        this.logger = new Logger('WebServer');

        this.app = express();
        this.server = http.createServer(this.app);
        this.io = new Server(this.server, {
            path: '/ws',
            cors: { origin: '*' }
        });

        this.setupMiddleware();
        this.setupRoutes();
        this.setupSocket();
    }

    getStatusPayload() {
        const cookies = this.configManager.getCookies() || [];
        return {
            version: pkg.version,
            isPollingEnabled: this.configManager.config.isPollingEnabled,
            totalSent: this.configManager.sentIds.size,
            telegramAdminId: process.env.TELEGRAM_ADMIN_ID || '',
            cookiesCount: Array.isArray(cookies) ? cookies.length : 0,
            scrapers: this.scraperRegistry.getScrapers().map(s => ({ id: s.id, name: s.name })),
            notifications: this.notificationRegistry.getProviders().map(p => ({ id: p.id, name: p.name }))
        };
    }

    setupSocket() {
        this.io.on('connection', (socket) => {
            this.logger.info(`Client connected via WebSocket: ${socket.id}`);
            
            // Send initial state upon connection
            socket.emit('status_update', this.getStatusPayload());
            socket.emit('config_update', this.configManager.config);
            socket.emit('deals_update', this.dealsManager.getDeals());

            socket.on('disconnect', () => {
                this.logger.info(`Client disconnected: ${socket.id}`);
            });
        });
    }

    broadcastStatus() {
        if (this.io) {
            this.io.emit('status_update', this.getStatusPayload());
        }
    }

    broadcastConfig() {
        if (this.io) {
            this.io.emit('config_update', this.configManager.config);
        }
    }

    broadcastDeals() {
        if (this.io) {
            this.io.emit('deals_update', this.dealsManager.getDeals());
        }
    }

    setupMiddleware() {
        this.app.use(cors());
        this.app.use(express.json());
        
        // Serve frontend static files
        this.app.use(express.static(path.join(__dirname, '../../frontend/dist')));
    }

    setupRoutes() {
        const api = express.Router();

        // Config Endpoints
        api.get('/config', (req, res) => {
            res.json(this.configManager.config);
        });

        api.post('/config', (req, res) => {
            this.configManager.saveConfig(req.body);
            this.scheduler.restart();
            this.broadcastConfig();
            this.broadcastStatus();
            res.json({ success: true, config: this.configManager.config });
        });

        // Cookies Endpoints
        api.get('/cookies', (req, res) => {
            res.json(this.configManager.getCookies());
        });

        api.post('/cookies', (req, res) => {
            try {
                const { cookies } = req.body;
                this.configManager.saveCookies(cookies);
                this.broadcastStatus();
                res.json({ success: true, count: Array.isArray(cookies) ? cookies.length : 0 });
            } catch (err) {
                res.status(400).json({ error: err.message });
            }
        });

        // Deals Endpoints
        api.get('/deals', (req, res) => {
            res.json(this.dealsManager.getDeals());
        });

        api.delete('/deals/:id', (req, res) => {
            this.dealsManager.deleteDeal(req.params.id);
            this.broadcastDeals();
            this.broadcastStatus();
            res.json({ success: true });
        });

        // Statistics & Status
        api.get('/status', (req, res) => {
            res.json(this.getStatusPayload());
        });

        // Actions
        api.post('/action/toggle-polling', (req, res) => {
            const isEnabled = !this.configManager.config.isPollingEnabled;
            this.configManager.saveConfig({ isPollingEnabled: isEnabled });
            this.scheduler.restart();
            this.broadcastConfig();
            this.broadcastStatus();
            res.json({ success: true, isPollingEnabled: isEnabled });
        });

        api.post('/action/run-check', async (req, res) => {
            this.scheduler.runManualCheck();
            this.broadcastStatus();
            res.json({ success: true, message: 'Check started' });
        });

        this.app.use('/api', api);

        // Fallback for React Router
        this.app.use((req, res, next) => {
            if (req.method === 'GET') {
                return res.sendFile(path.join(__dirname, '../../frontend/dist/index.html'));
            }
            next();
        });
    }

    start() {
        this.server.listen(this.port, () => {
            this.logger.info(`Web panel is running on http://localhost:${this.port} (WebSocket path: /ws)`);
        });
    }
}

module.exports = WebServer;
