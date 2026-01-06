#!/bin/bash
# Run Migration 11 locally
echo "🚀 Running Migration 11: Top Secret Trial & Journal Discount..."

# Check if supabase CLI is available
if command -v supabase &> /dev/null; then
    echo "Using Supabase CLI..."
    cd /home/user/finotaur-frontend
    supabase db push
else
    # Try psql directly
    if command -v psql &> /dev/null; then
        echo "Using psql..."
        psql "postgresql://postgres:postgres@localhost:54322/postgres" -f "/home/user/finotaur-frontend/supabase/migrations/complete-migration-11 TopSecret Trial and Journal Discount"
    else
        echo "❌ Neither supabase CLI nor psql found!"
        echo "Please run the SQL manually in Supabase Dashboard"
        exit 1
    fi
fi

echo "✅ Migration complete!"

