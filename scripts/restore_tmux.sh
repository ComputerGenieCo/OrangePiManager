#!/bin/bash

# Path to the tmux-resurrect restore script
RESURRECT_SCRIPT=~/tmux-resurrect/scripts/restore.sh

# Check if tmux is running
if ! pgrep -x tmux > /dev/null; then
    # Start a temporary detached session
    tmux new-session -d -s temp-session
    # Run the restore script
    tmux run-shell "$RESURRECT_SCRIPT"
    # Kill the temporary session
    tmux kill-session -t temp-session
    # Attach to the restored session
    tmux attach-session
else
    # If tmux is already running, just attach to it
    tmux attach-session
fi

