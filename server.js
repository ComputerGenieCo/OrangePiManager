/**
 * OrangePiManager - Web-based monitoring and management system
 * Copyright (C) 2025 ComputerGenieCo
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

// 1. Core imports
const http = require('http');
const https = require('https');
const fs = require('fs').promises;
const path = require('path');
const net = require('net');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// 2. Configuration and state
const config = {
    port: 3000,
    ssh: {
        user: 'orangepi',
        pass: 'orangepi',
        maxRetries: 2
    },
    network: {
        start: '192.168.3.1',
        end: '192.168.3.254'
    },
    refreshInterval: 300000, // 5 minutes
    location: {
        zipCode: '90210'
    }
};

const devices = new Map();
const weatherCache = {
    temp: null,
    forecast: null,
    lastUpdate: null
};

const state = {
    lastUpdateTime: null
};

// 3. HTTP utility functions
async function makeHttpRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        https.get(url, {
            headers: {
                'User-Agent': '(OrangePiManager, computergenie@example.com)',
                'Accept': 'application/json',
                ...options.headers
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    if (res.statusCode >= 400) {
                        reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                        return;
                    }
                    resolve(JSON.parse(data));
                } catch (error) {
                    reject(error);
                }
            });
        }).on('error', reject);
    });
}

// 4. Weather functions
async function getLocalTemperature() {
    try {
        if (weatherCache.lastUpdate &&
            (Date.now() - weatherCache.lastUpdate) < 30 * 60 * 1000) {
            return weatherCache;
        }

        const geocodeData = await makeHttpRequest(
            `https://nominatim.openstreetmap.org/search?postalcode=${config.location.zipCode}&country=USA&format=json`
        );

        if (!Array.isArray(geocodeData) || geocodeData.length === 0) {
            throw new Error('Geocoding failed');
        }

        const lat = Number(geocodeData[0].lat).toFixed(4);
        const lon = Number(geocodeData[0].lon).toFixed(4);

        console.log(`Getting weather for coordinates: ${lat},${lon}`);

        const pointsData = await makeHttpRequest(
            `https://api.weather.gov/points/${lat},${lon}`
        );

        if (!pointsData?.properties?.forecastHourly) {
            console.error('Points response:', JSON.stringify(pointsData, null, 2));
            throw new Error('Invalid points response');
        }

        const weatherData = await makeHttpRequest(pointsData.properties.forecastHourly);

        const temp = weatherData.properties?.periods?.[0]?.temperature;
        const forecast = weatherData.properties?.periods?.[0]?.shortForecast;

        if (typeof temp !== 'number' || !forecast) {
            throw new Error('No weather data found in forecast');
        }

        // Update cache with both temp and forecast
        weatherCache.temp = temp;
        weatherCache.forecast = forecast;
        weatherCache.lastUpdate = Date.now();

        return { temp, forecast };

    } catch (error) {
        console.error('Weather fetch failed:', error);
        return {
            temp: weatherCache.temp || null,
            forecast: weatherCache.forecast || null
        };
    }
}

// 5. Network scanning functions
async function checkPort(ip, port = 22, timeout = 500) {
    return new Promise(resolve => {
        const socket = new net.Socket();
        socket.setTimeout(timeout);
        socket.on('connect', () => { socket.destroy(); resolve(true); });
        socket.on('error', () => { socket.destroy(); resolve(false); });
        socket.on('timeout', () => { socket.destroy(); resolve(false); });
        socket.connect(port, ip);
    });
}

async function scanNetwork() {
    console.log('Starting network scan...');
    const start = parseInt(config.network.start.split('.')[3]);
    const end = parseInt(config.network.end.split('.')[3]);
    const prefix = config.network.start.split('.').slice(0, 3).join('.');

    console.log(`Scanning range ${config.network.start} to ${config.network.end}`);

    const allIps = Array.from(
        { length: end - start + 1 },
        (_, i) => `${prefix}.${start + i}`
    );

    const results = await Promise.all(allIps.map(ip => checkPort(ip)));
    const found = allIps.filter((_, i) => results[i]);

    if (found.length) {
        console.log(`Found devices at IPs: ${found.join(', ')}`);
    }

    console.log(`Scan complete. Found ${found.length} devices`);
    return found;
}

// 6. SSH management functions
async function sshExec(ip, cmd) {
    const sshCmd = `sshpass -p "${config.ssh.pass}" ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 ${config.ssh.user}@${ip} "${cmd}"`;
    try {
        const { stdout, stderr } = await execAsync(sshCmd);
        return { stdout, stderr };
    } catch (error) {
        throw new Error(`SSH failed (${ip}): ${error.message}`);
    }
}

async function sshCopy(ip, localPath, remotePath) {
    const scpCmd = `sshpass -p "${config.ssh.pass}" scp -o StrictHostKeyChecking=no ${localPath} ${config.ssh.user}@${ip}:${remotePath}`;
    await execAsync(scpCmd);
}

// 7. Device management functions
async function updateDevice(ip, forceUpdateScripts = false) {
    try {
        if (forceUpdateScripts) {
            await sshCopy(ip, 'scripts/get_device_stats.sh', '/tmp/get_device_stats.sh');
            await sshCopy(ip, 'scripts/control_miner.sh', '/tmp/control_miner.sh');
            await sshCopy(ip, 'scripts/restore_tmux.sh', '/home/orangepi/restore_tmux.sh');
            await sshExec(ip, 'chmod +x /tmp/get_device_stats.sh /tmp/control_miner.sh /home/orangepi/restore_tmux.sh');
        }

        const { stdout } = await sshExec(ip, '/tmp/get_device_stats.sh');
        if (!stdout) {
            throw new Error('No output from device');
        }
        const [temp, uptime, hashrate, status] = stdout.trim().split(' ').map(Number);

        devices.set(ip, {
            ip,
            temp: temp / 1000,
            uptime,
            hashrate,
            minerStatus: status === 1,
            lastUpdate: Date.now()
        });
    } catch (error) {
        console.error(`Device update failed (${ip}):`, error.message);
        if (!forceUpdateScripts && error.message.includes('No such file')) {
            return updateDevice(ip, true);
        }
        devices.delete(ip);
    }
}

async function handleMinerControl(ip, action) {
    if (action === 'update-scripts') {
        const allIps = Array.from(devices.keys());
        const results = await Promise.all(allIps.map(async deviceIp => {
            try {
                await updateDevice(deviceIp, true);
                return { ip: deviceIp, success: true };
            } catch (error) {
                return { ip: deviceIp, success: false, error: error.message };
            }
        }));
        return { success: results.every(r => r.success), errors: results.filter(r => !r.success) };
    }

    if (['startall', 'killall'].includes(ip)) {
        const allIps = Array.from(devices.keys());
        const cmd = ip === 'startall' ? 'start' : 'stop';
        await Promise.all(allIps.map(async deviceIp => {
            try {
                await sshExec(deviceIp, `/tmp/control_miner.sh ${cmd}`);
                await updateDevice(deviceIp);
            } catch (error) {
                console.error(`Failed to ${cmd} miner on ${deviceIp}:`, error.message);
            }
        }));
        return { success: true, devices: Array.from(devices.values()) };
    }

    if (devices.has(ip) && ['start', 'stop'].includes(action)) {
        await sshExec(ip, `/tmp/control_miner.sh ${action}`);
        await updateDevice(ip);
        return { success: true };
    }

    throw new Error('Invalid request');
}

// 8. API response utilities
function sendJsonResponse(res, status, data) {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
}

// 9. Request handling
async function handleRequest(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        return res.end();
    }

    if (req.url.startsWith('/api/')) {
        if (req.url === '/api/devices') {
            return sendJsonResponse(res, 200, {
                devices: Array.from(devices.values()),
                lastUpdateTime: state.lastUpdateTime || 'Never'
            });
        }

        if (req.url === '/api/config') {
            const safeConfig = {
                port: config.port,
                network: config.network,
                refreshInterval: config.refreshInterval,
                location: config.location,
                ssh: { user: config.ssh.user, maxRetries: config.ssh.maxRetries }
            };
            return sendJsonResponse(res, 200, safeConfig);
        }

        if (req.url === '/api/weather') {
            const weather = await getLocalTemperature();
            return sendJsonResponse(res, 200, weather);
        }

        const match = req.url.match(/^\/api\/miner\/([^\/]+)\/?(.*)?$/);
        if (match && req.method === 'POST') {
            try {
                const [, ip, action] = match;
                const result = await handleMinerControl(ip, action);
                return sendJsonResponse(res, 200, result);
            } catch (error) {
                return sendJsonResponse(res, 400, { error: error.message });
            }
        }
    }

    try {
        const filePath = path.join(__dirname, 'public', req.url === '/' ? 'index.html' : req.url);
        const content = await fs.readFile(filePath);
        const ext = path.extname(filePath);
        const contentType = {
            '.html': 'text/html',
            '.css': 'text/css',
            '.js': 'text/javascript'
        }[ext] || 'application/octet-stream';

        res.setHeader('Content-Type', contentType);
        res.writeHead(200);
        return res.end(content);
    } catch (error) {
        res.writeHead(404);
        return res.end('Not Found');
    }
}

// 10. Device update scheduling
async function updateDevices() {
    console.log('--- Starting device update cycle ---');
    const ips = await scanNetwork();
    if (ips.length === 0) {
        console.log('No devices found. Check network configuration.');
        return;
    }

    const startCount = devices.size;
    await Promise.all(ips.map(ip => updateDevice(ip, false)));
    state.lastUpdateTime = new Date().toLocaleString();
    console.log(`Device update complete. Active devices: ${devices.size} (was: ${startCount})`);
}

// 11. Main application startup
async function main() {
    const server = http.createServer((req, res) => {
        handleRequest(req, res).catch(error => {
            console.error('Request failed:', error);
            res.writeHead(500);
            res.end('Internal Server Error');
        });
    });

    await new Promise(resolve => {
        server.listen(config.port, '0.0.0.0', () => {
            console.log(`\nServer running on port ${config.port}\n`);
            resolve();
        });
    });

    await updateDevices();
    setInterval(updateDevices, config.refreshInterval);
}

// Start the application
main().catch(console.error);
