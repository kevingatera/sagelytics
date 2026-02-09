#!/bin/bash
# Script to clean up unused theme components

echo "Cleaning up old theme components..."

# Backup the old components first (just in case)
mkdir -p backup/theme

if [ -d src/components/theme ]; then
  # Backup the components
  cp -r src/components/theme/* backup/theme/
  echo "Backed up theme components to backup/theme/"

  # Remove the theme directory
  rm -rf src/components/theme
  echo "Removed src/components/theme directory"
fi

echo "Cleanup completed. Backups stored in ./backup/theme directory" 