#!/bin/bash
# Script to clean up unused old dashboard components

echo "Cleaning up old dashboard components..."

# Check if the old dashboard is still being used
DASHBOARD_USAGE=$(grep -r "pricing-dashboard" --include="*.tsx" --include="*.ts" src/app)

if [ -z "$DASHBOARD_USAGE" ]; then
  echo "Old dashboard is not being used, proceeding with cleanup..."
  
  # Backup the old components first (just in case)
  mkdir -p backup
  
  # Backup the old dashboard component
  if [ -f src/components/pricing-dashboard.tsx ]; then
    cp src/components/pricing-dashboard.tsx backup/
    echo "Backed up pricing-dashboard.tsx"
  fi
  
  # Backup the old dashboard components
  if [ -d src/components/dashboard-old ]; then
    mkdir -p backup/dashboard-old
    cp -r src/components/dashboard-old/* backup/dashboard-old/
    echo "Backed up dashboard-old components"
  fi
  
  # Remove old dashboard component
  rm -f src/components/pricing-dashboard.tsx
  echo "Removed src/components/pricing-dashboard.tsx"
  
  # Remove old dashboard components directory
  rm -rf src/components/dashboard-old
  echo "Removed src/components/dashboard-old directory"
  
  echo "Cleanup completed. Backups stored in ./backup directory"
else
  echo "The old dashboard appears to still be in use. Please review the following references:"
  echo "$DASHBOARD_USAGE"
  echo "Cleanup aborted for safety."
fi 