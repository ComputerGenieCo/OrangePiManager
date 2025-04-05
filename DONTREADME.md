# Quick Setup Guide

## 1. Install Required Software (Manager Host)

```bash
# Install Node.js 20 LTS and sshpass
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs sshpass

# Clone and setup OrangePiManager
git clone https://github.com/ComputerGenieCo/OrangePiManager.git
cd OrangePiManager
npm install
```

## 2. Setup Orange Pi Devices

```bash
# SSH into each Orange Pi and run these commands
ssh orangepi@192.168.3.xxx

# Install required packages
sudo apt-get update
sudo apt-get install -y tmux htop git build-essential

# Install tmux-resurrect
cd ~
git clone https://github.com/tmux-plugins/tmux-resurrect.git

# Install CCMiner
git clone https://github.com/Oink70/CCminer-ARM-optimized.git ccminer
cd ccminer
./build.sh

# Exit SSH
exit
```

## 3. Configure Manager

Edit config.json:
```json
{
    "port": 3000,
    "ssh": {
        "user": "orangepi",
        "pass": "CHANGE_THIS_PASSWORD",
        "maxRetries": 2
    },
    "network": {
        "start": "192.168.3.1",
        "end": "192.168.3.254"
    },
    "refreshInterval": 300000,
    "location": {
        "zipCode": "YOUR_ZIPCODE"
    }
}
```

Edit scripts/start.sh to set your wallet address:
```bash
# Open start.sh in your editor
nano scripts/start.sh

# Replace the default wallet with yours:
# RCGxKMDxZcBGRZkxvgCRAXGpiQFt8wU7Wq -> YOUR_WALLET_ADDRESS
```

## 4. Start Manager

```bash
npm start

# Open in browser
http://localhost:3000
```

Done! The manager will auto-discover devices and deploy required scripts.
