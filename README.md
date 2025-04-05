# OrangePiManager

A web-based monitoring and management system for Orange Pi mining devices on your local network.

![Dashboard Screenshot](docs/images/screenshot.png)

## Table of Contents
1. [Quick Start](#quick-start)
2. [Setup](#setup)
3. [Features](#features)
4. [User Interface](#user-interface)
5. [API Reference](#api-reference)
6. [Security Considerations](#security-considerations)
7. [Troubleshooting](#troubleshooting)
8. [Contributing](#contributing)
9. [License](#license)

## Quick Start

1. Clone the repository:
```bash
git clone https://github.com/ComputerGenieCo/OrangePiManager.git
cd OrangePiManager
```

2. Update the default `config.json` with your network settings and credentials.

3. Start the server:
```bash
npm start
```

4. Open the web interface in your browser:
```
http://localhost:3000
```

## Setup

### System Requirements

#### Manager Host
- Node.js 20+ (LTS) ([Download Node.js](https://nodejs.org/en/download))
- `sshpass` package for automated SSH access
- Network access to Orange Pi devices

#### Mining Devices
- Orange Pi running Linux
- SSH server enabled with known credentials
- Configured on same subnet (default: 192.168.3.0/24)
- Software stack:
  - `tmux`
  - `tmux-resurrect` ([Download](https://github.com/tmux-plugins/tmux-resurrect.git))
  - `ccminer` in home directory ([Download optimized version](https://github.com/Oink70/CCminer-ARM-optimized.git))
  - `htop` for system monitoring

### Configuration

A default `config.json` is provided with the repository. You should modify this file to match your environment:

```json
{
    "port": 3000,
    "ssh": {
        "user": "orangepi",
        "pass": "your-password",  // Change this!
        "maxRetries": 2
    },
    "network": {
        "start": "192.168.3.1",   // Adjust to match your network
        "end": "192.168.3.254"
    },
    "refreshInterval": 300000,
    "location": {
        "zipCode": "90210"        // Set to your location
    }
}
```

#### Mining Configuration
Before deploying to your devices, edit `scripts/start.sh` to set your wallet address:

```bash
# Replace the default wallet address with yours
RCGxKMDxZcBGRZkxvgCRAXGpiQFt8wU7Wq -> YOUR_WALLET_ADDRESS
```

The script will automatically append the device hostname to your wallet address for easier tracking.

#### Configuration Fields
- **port**: The port number for the web server.
- **ssh**: SSH credentials for accessing Orange Pi devices.
  - `user`: SSH username.
  - `pass`: SSH password.
  - `maxRetries`: Maximum number of SSH retries.
- **network**: Network range for device discovery.
  - `start`: Starting IP address.
  - `end`: Ending IP address.
- **refreshInterval**: Interval (in milliseconds) for automatic device updates.
- **location**: Location settings for weather data.
  - `zipCode`: ZIP code for local weather.

### Device Setup

#### Managed Scripts
The following scripts are automatically deployed to each Orange Pi device:

- **/tmp/get_device_stats.sh**: Collects system metrics including:
  - CPU temperature across all thermal zones
  - System uptime in seconds
  - Current mining hashrate
  - Miner process status

- **/tmp/control_miner.sh**: Handles miner process control:
  - Starting miner in tmux session
  - Graceful miner shutdown
  - Process cleanup

- **/home/orangepi/restore_tmux.sh**: Manages tmux session restoration:
  - Creates or restores tmux sessions
  - Configures multi-pane layout
  - Integrates with tmux-resurrect

#### Tmux Environment
Launch the mining environment using:
```bash
tmux a -t0 || ./restore_tmux.sh
```

This command will either:
- Attach to an existing tmux session, or
- Create a new session with the following layout:
  - Top pane: Running `htop` for system monitoring
  - Bottom pane: Reserved for miner operation

## Features

### System Architecture
- Server-based monitoring system
- RESTful API interface
- Automated device discovery
- Secure remote execution

### Monitoring Features
- **CPU Temperature Monitoring**:
  - Normal: Below 65°C (green)
  - Warning: 65°C-74°C (orange)
  - High: 75°C-81°C (red)
  - Critical: 82°C+ (bright red)
- **Mining Statistics**:
  - Hashrate (KH/s, MH/s, TH/s)
  - System uptime
  - Miner status
- **Environmental Data**:
  - Local temperature
  - Weather conditions
  - 30-minute forecast updates

### Control Features
- Individual miner management (start/stop)
- Batch operations (start/stop all miners)
- Emergency shutdown capability
- Remote script deployment
- Fast refresh during operations (2-second intervals for 30 seconds)

## User Interface

### Dashboard
- **Device Status**: Displays the number of devices online and miners running.
- **Weather**: Shows the current temperature and forecast.
- **Last Update**: Indicates the last time device data was refreshed.

### Controls
- **Start/Stop Miners**: Start or stop miners individually or in bulk.
- **Update Scripts**: Deploy updated scripts to all devices.
- **Theme Toggle**: Switch between light and dark modes.

### Notifications
- Toast notifications provide feedback for actions (e.g., miner control, script updates).

## API Reference

### Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/devices` | GET | Retrieve device status and metrics. |
| `/api/weather` | GET | Retrieve local weather data. |
| `/api/config` | GET | Retrieve server configuration. |
| `/api/miner/:ip/:action` | POST | Control miner states (start/stop). |
| `/api/miner/startall` | POST | Start all miners. |
| `/api/miner/killall` | POST | Stop all miners. |
| `/api/miner/update-scripts` | POST | Update scripts on all devices. |

### Example Responses

#### `/api/devices`
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

#### `/api/weather`
```json
{
    "temp": 72,
    "forecast": "Partly Cloudy",
    "lastUpdate": 1677721600000
}
```

#### `/api/miner/update-scripts`
```json
{
    "success": true,
    "errors": []
}
```

## Security Considerations

- Designed for trusted local networks only.
- Change default SSH passwords on all devices.
- Consider implementing SSH key authentication.
- Monitor system logs for unauthorized access.

## Troubleshooting

### Common Issues

1. **Devices Not Discovered**:
   - Verify SSH credentials.
   - Check network configuration.
   - Ensure `sshpass` is installed.
   - Test manual SSH access.

2. **Miners Not Responding**:
   - Verify `tmux` installation.
   - Check `ccminer` configuration.
   - Review script permissions.
   - Monitor system resources.

3. **Weather Data Missing**:
   - Validate ZIP code in `config.json`.
   - Check internet connectivity.
   - Review API rate limits.

## Contributing

1. Fork the repository.
2. Create a feature branch.
3. Commit changes.
4. Submit a pull request.

## License

Copyright (C) 2025 ComputerGenieCo  
Licensed under GNU GPL v3. See [LICENSE](LICENSE) for details.
