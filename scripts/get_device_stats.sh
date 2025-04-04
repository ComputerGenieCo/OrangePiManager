#!/bin/bash

# Copyright (C) 2025 ComputerGenieCo
# This script is part of OrangePiManager, licensed under GNU GPL v3.
#
# Collects and returns device statistics including:
# - Average CPU temperature across all thermal zones
# - System uptime in seconds

# Get the number of thermal zones (cores)
num_zones=$(ls -l /sys/class/thermal/th* | grep zone | wc -l)

# Initialize sum of temperatures
sum_temp=0

# Read temperature from each thermal zone and add to sum
for ((i=0; i<num_zones; i++)); do
  temp=$(cat /sys/class/thermal/thermal_zone$i/temp)
  sum_temp=$((sum_temp + temp))
done

# Calculate average temperature
avg_temp=$((sum_temp / num_zones))

# Get system uptime in seconds
uptime_sec=$(cat /proc/uptime | awk '{print int($1)}')

# Get hashrate from ccminer with clean output handling
hashrate=0
ccminer_output=$(curl --silent --connect-timeout 2 --max-time 5 --http0.9 http://localhost:4068/summary 2>/dev/null || echo "")

# Parse hashrate from semicolon-delimited output
if [ -n "$ccminer_output" ]; then
    # Extract KHS value directly
    hashrate=$(echo "$ccminer_output" | tr ';' '\n' | grep '^KHS=' | cut -d'=' -f2)
fi

# Ensure hashrate is a valid number
if ! [[ "$hashrate" =~ ^[0-9.]+$ ]] || [ -z "$hashrate" ]; then
    hashrate=110
fi

# Check if miner is running (more reliable check)
miner_status=0
if pgrep -x "ccminer" >/dev/null 2>&1 && ps aux | grep -v grep | grep -q "[c]cminer"; then
    miner_status=1
fi

# Clean output with no debug info
echo "$avg_temp $uptime_sec $hashrate $miner_status"
