#!/bin/bash

SOURCE="$HOME/Downloads/NOAH/"
TARGET="/Volumes/Noah/source/NOAH/"

echo "==> Backup wird gestartet..."
rsync -av --delete "$SOURCE" "$TARGET"
echo "==> Backup abgeschlossen."
