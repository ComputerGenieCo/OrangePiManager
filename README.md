# OrangePiManager

A web-based monitoring and management system for Orange Pi mining devices on your local network.

![Dashboard Screenshot](docs/images/screenshot.png)

## Features

### Core Functionality
- Automatic device discovery on local network
- Real-time monitoring and control
- Batch operations support
- Environmental monitoring integration

### Monitoring Features
- CPU Temperature Monitoring:
  - Normal: Below 65°C (green)
  - Warning: 65°C-74°C (orange)
  - High: 75°C-81°C (red)
  - Critical: 82°C+ (bright red)
- Mining Statistics:
  - Hashrate (KH/s, MH/s, TH/s)
  - System uptime
  - Miner status
- Environmental Data:
  - Local temperature
  - Weather conditions
  - 30-minute forecast updates

### Control Features
- Individual miner management
- Mass operations support
- Emergency shutdown capability
- Remote script deployment
- Fast refresh during operations (2s intervals)

### User Interface
- Modern, responsive design
- Dark/Light theme with persistence
- Real-time status updates
- Toast notifications system
- Auto-refresh capabilities

## Requirements

- **Host System:**
  - Node.js 14+
  - sshpass
  - Network access to Orange Pi devices

- **Orange Pi Devices:**
  - SSH access enabled
  - tmux installed
  - tmux-resurrect (https://github.com/tmux-plugins/tmux-resurrect.git)
  - ccminer configured
  - Common subnet (default: 192.168.3.0/24)

## Device Scripts

The following scripts are automatically deployed to Orange Pi devices:

### Management Scripts
- `/tmp/get_device_stats.sh` - Collects system metrics including CPU temperature, uptime, hashrate, and miner status
- `/tmp/control_miner.sh` - Handles miner process control (start/stop) through tmux sessions
- `/home/orangepi/restore_tmux.sh` - Creates and configures the standard tmux environment with tmux-resurrect support

### Tmux Session Management
The system uses tmux with tmux-resurrect for persistent session management. The standard layout is:
```
┌─────────────────┐
│      htop       │
├─────────────────┤
│  miner process  │
└─────────────────┘
```

Session management is handled through tmux-resurrect, which preserves the layout and running processes across system reboots. To launch or restore the environment:
```bash
tmux a -t0 || ./restore_tmux.sh
```
This command attempts to attach to an existing session, or creates a new one using the restore_tmux.sh script, which includes tmux-resurrect integration.

## Quick Start

1. Clone the repository:
```bash
git clone https://github.com/ComputerGenieCo/OrangePiManager.git
cd OrangePiManager
```

2. Configure settings in `server.js`:
```javascript
const config = {
    port: 3000,                    // Web interface port
    ssh: {
        user: 'orangepi',          // SSH username
        pass: 'your-password',     // SSH password
        maxRetries: 2
    },
    network: {
        start: '192.168.3.1',      // Network range start
        end: '192.168.3.254'       // Network range end
    },
    refreshInterval: 300000,        // Update interval (5 min)
    location: {
        zipCode: '90210'           // Weather location
    }
};
```

3. Start the server:
```bash
npm start
```

## Configuration

### Basic Setup
- Web interface port
- SSH credentials
- Network range
- Update interval
- Weather location

### Advanced Configuration
- Fast refresh settings
- Theme persistence
- API rate limiting
- Network scanning options

## API Reference

### Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/devices` | GET | Device status and metrics |
| `/api/weather` | GET | Local weather data |
| `/api/config` | GET | Server configuration |
| `/api/miner/:ip/:action` | POST | Control miner states |

### Device Status API

```http
GET /api/devices
```

Returns status information for all discovered devices.

Example Response:
```json
{
    "devices": [
        {
            "ip": "192.168.3.100",
            "temp": 65.2,
            "uptime": 345600,
            "hashrate": 125000,
            "minerStatus": true,
            "lastUpdate": 1677721600000
        }
    ],
    "lastUpdateTime": "3/2/2025, 12:00:00 PM"
}
```

Fields:
- `temp`: CPU temperature in Celsius
- `uptime`: System uptime in seconds
- `hashrate`: Current mining speed in KH/s
- `minerStatus`: Boolean indicating if miner is running
- `lastUpdate`: Timestamp of last successful update

### Weather API

```http
GET /api/weather
```

Returns local weather data based on configured ZIP code.

Example Response:
```json
{
    "temp": 72,
    "forecast": "Partly Cloudy",
    "lastUpdate": 1677721600000
}
```

- Updates every 30 minutes
- Temperature in Fahrenheit
- Uses Weather.gov API for US locations
- Caches results to respect API limits

### Miner Control API

#### Individual Miner Control
```http
POST /api/miner/{ip}/{action}
```
- `ip`: Device IP address
- `action`: Either 'start' or 'stop'

Example:
```bash
curl -X POST http://localhost:3000/api/miner/192.168.3.100/start
```

Response:
```json
{
    "success": true
}
```

#### Batch Operations

1. Start All Miners
```http
POST /api/miner/startall
```
- Attempts to start miners on all discovered devices
- Returns list of updated device states
- Fails gracefully if some devices are unreachable

Example Response:
```json
{
    "success": true,
    "devices": [
        {
            "ip": "192.168.3.100",
            "temp": 65.2,
            "minerStatus": true,
            "hashrate": 125000
        }
        // ... other devices
    ]
}
```

2. Emergency Stop (Kill All)
```http
POST /api/miner/killall
```
- Immediately stops all mining operations
- High priority command that bypasses normal queuing
- Designed for thermal emergency situations

Example Response:
```json
{
    "success": true,
    "devices": [
        {
            "ip": "192.168.3.100",
            "temp": 65.2,
            "minerStatus": false,
            "hashrate": 0
        }
        // ... other devices
    ]
}
```

#### Script Updates
```http
POST /api/miner/update-scripts
```
- Deploys latest monitoring and control scripts to all devices
- Updates permissions automatically
- Returns detailed success/failure status per device

Example Response:
```json
{
    "success": true,
    "errors": []
}
```

### Configuration API

```http
GET /api/config
```

Returns system configuration settings (excluding sensitive data).

Example Response:
```json
{
    "port": 3000,
    "network": {
        "start": "192.168.3.1",
        "end": "192.168.3.254"
    },
    "refreshInterval": 300000,
    "location": {
        "zipCode": "90210"
    },
    "ssh": {
        "user": "orangepi",
        "maxRetries": 2
    }
}
```

Fields:
- `port`: Web server port number
- `network`: Network scan range configuration
- `refreshInterval`: Device update interval in milliseconds (default: 5 minutes)
- `location`: Weather location settings
- `ssh`: SSH connection settings (excludes password)

Additional Features:
- Fast refresh during miner operations (2 second intervals for 30 seconds)
- Automatic state recovery and UI updates
- Persistent theme selection across sessions

### Control Actions

- `start` - Start miner on specific device
- `stop` - Stop miner on specific device
- `startall` - Start all discovered miners with automatic thermal monitoring
- `killall` - Emergency stop all miners (immediate shutdown)
- `update-scripts` - Deploy updated monitoring and control scripts

## Security Considerations

- Application designed for trusted local networks only
- Change default SSH passwords on all devices
- Consider implementing SSH key authentication
- Review and secure tmux sessions
- Monitor system logs for unauthorized access

## Maintenance

### Monitoring
- System logs
- Temperature thresholds
- Network connectivity
- API rate limits

### Updates
- Script deployment
- Configuration changes
- Security patches
- Performance optimization

## Troubleshooting

### Common Issues

1. **Devices Not Discovered**
   - Verify SSH credentials
   - Check network configuration
   - Ensure sshpass is installed
   - Test manual SSH access

2. **Miners Not Responding**
   - Verify tmux installation
   - Check ccminer configuration
   - Review script permissions
   - Monitor system resources

3. **Weather Data Missing**
   - Validate ZIP code
   - Check internet connectivity
   - Review API rate limits

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit changes
4. Submit pull request

## License

Copyright (C) 2025 ComputerGenieCo  
Licensed under GNU GPL v3. See [LICENSE](LICENSE) for details.
