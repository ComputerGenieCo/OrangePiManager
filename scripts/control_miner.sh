#!/bin/bash

# Copyright (C) 2025 ComputerGenieCo
# This script is part of OrangePiManager, licensed under GNU GPL v3.

ACTION=$1

case $ACTION in
    "start")
        # Check if already running
        if pgrep -x "ccminer" > /dev/null; then
            echo "Miner is already running"
            exit 1
        fi
        # Send command to pane 2
        tmux send-keys -t 0.1 "cd /home/orangepi/ccminer && ./start.sh" C-m
        echo "Miner started in tmux"
        ;;
    "stop")
        # Kill miner process and clear tmux pane
        if pkill -x "ccminer"; then
            tmux send-keys -t 0.1 C-c
            echo "Miner stopped"
        else
            echo "Miner was not running"
            exit 1
        fi
        ;;
    *)
        echo "Invalid action. Use 'start' or 'stop'"
        exit 1
        ;;
esac
