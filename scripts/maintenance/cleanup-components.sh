#!/bin/bash
# Script to clean up unused components

echo "Cleaning up old components..."

# Create backup directory
mkdir -p backup

# 1. Clean up old dashboard components
echo "Checking for old dashboard components..."

# Check if the old dashboard is still being used
DASHBOARD_USAGE=$(grep -r "pricing-dashboard" --include="*.tsx" --include="*.ts" src/app)

if [ -z "$DASHBOARD_USAGE" ]; then
  echo "Old dashboard is not being used, proceeding with cleanup..."
  
  # Backup the old dashboard component
  if [ -f src/components/pricing-dashboard.tsx ]; then
    mkdir -p backup/dashboard
    cp src/components/pricing-dashboard.tsx backup/dashboard/
    echo "Backed up pricing-dashboard.tsx"
    
    # Remove old dashboard component
    rm -f src/components/pricing-dashboard.tsx
    echo "Removed src/components/pricing-dashboard.tsx"
  fi
  
  # Backup the old dashboard components
  if [ -d src/components/dashboard-old ]; then
    mkdir -p backup/dashboard-old
    cp -r src/components/dashboard-old/* backup/dashboard-old/
    echo "Backed up dashboard-old components"
    
    # Remove old dashboard components directory
    rm -rf src/components/dashboard-old
    echo "Removed src/components/dashboard-old directory"
  fi
else
  echo "The old dashboard appears to still be in use. Please review the following references:"
  echo "$DASHBOARD_USAGE"
  echo "Dashboard cleanup aborted for safety."
fi

# 2. Clean up unused theme components
echo "Checking for unused theme components..."

# We've updated the app to use next-themes, so we can safely remove custom implementation
if [ -d src/components/theme ]; then
  # Backup the components
  mkdir -p backup/theme
  cp -r src/components/theme/* backup/theme/
  echo "Backed up theme components to backup/theme/"

  # Remove the theme directory
  rm -rf src/components/theme
  echo "Removed src/components/theme directory"
fi

echo "All cleanup operations completed. Backups stored in ./backup directory" 