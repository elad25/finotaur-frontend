// scripts/migrationRunner.ts
// ==========================================
// ONE-TIME MIGRATION RUNNER
// Run this once to fix all data inconsistencies
// ==========================================

import { 
  migrateTradeStrategies, 
  getTradesFromLocalStorage,
  getStrategies,
  STORAGE_KEYS 
} from '@/utils/storage';

/**
 * Complete migration process
 */
export function runFullMigration() {
  console.log('🚀 Starting Full Migration Process...\n');
  
  const results = {
    success: true,
    steps: [] as Array<{ step: string; success: boolean; message: string; details?: any }>
  };
  
  // Step 1: Check data exists
  console.log('📋 Step 1: Checking existing data...');
  const trades = getTradesFromLocalStorage();
  const strategies = getStrategies();
  
  results.steps.push({
    step: 'Data Check',
    success: true,
    message: `Found ${trades.length} trades and ${strategies.length} strategies`
  });
  
  console.log(`  ✅ Found ${trades.length} trades`);
  console.log(`  ✅ Found ${strategies.length} strategies\n`);
  
  if (trades.length === 0) {
    console.log('  ℹ️  No trades to migrate\n');
    results.steps.push({
      step: 'Migration',
      success: true,
      message: 'No trades to migrate'
    });
    return results;
  }
  
  // Step 2: Backup current data
  console.log('💾 Step 2: Creating backup...');
  try {
    const backup = {
      trades,
      strategies,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem('finotaur_backup_pre_migration', JSON.stringify(backup));
    console.log('  ✅ Backup created\n');
    results.steps.push({
      step: 'Backup',
      success: true,
      message: 'Backup created successfully'
    });
  } catch (e) {
    console.error('  ❌ Backup failed:', e);
    results.success = false;
    results.steps.push({
      step: 'Backup',
      success: false,
      message: 'Backup failed - aborting migration'
    });
    return results;
  }
  
  // Step 3: Analyze current state
  console.log('🔍 Step 3: Analyzing current state...');
  let needsMigration = 0;
  let alreadyMigrated = 0;
  let noStrategySet = 0;
  
  trades.forEach((trade: any) => {
    if (trade._migrated) {
      alreadyMigrated++;
    } else if (!trade.strategy && !trade.strategyId) {
      noStrategySet++;
    } else if (trade.strategyId || (trade.strategy && /^[a-f0-9-]{36}$/i.test(trade.strategy))) {
      needsMigration++;
    }
  });
  
  console.log(`  📊 Trades needing migration: ${needsMigration}`);
  console.log(`  ✅ Already migrated: ${alreadyMigrated}`);
  console.log(`  — No strategy set: ${noStrategySet}\n`);
  
  results.steps.push({
    step: 'Analysis',
    success: true,
    message: `${needsMigration} trades need migration`,
    details: { needsMigration, alreadyMigrated, noStrategySet }
  });
  
  // Step 4: Run migration
  if (needsMigration > 0) {
    console.log('🔄 Step 4: Running migration...');
    const migrationResult = migrateTradeStrategies();
    
    console.log(`  ✅ Migrated: ${migrationResult.migrated}`);
    console.log(`  ⚠️  Errors: ${migrationResult.errors}\n`);
    
    if (migrationResult.details.length > 0) {
      console.log('  📝 Migration details:');
      migrationResult.details.forEach(detail => console.log(`    ${detail}`));
      console.log('');
    }
    
    results.steps.push({
      step: 'Migration',
      success: migrationResult.errors === 0,
      message: `Migrated ${migrationResult.migrated} trades with ${migrationResult.errors} errors`,
      details: migrationResult
    });
  } else {
    console.log('✅ Step 4: No migration needed\n');
    results.steps.push({
      step: 'Migration',
      success: true,
      message: 'No trades needed migration'
    });
  }
  
  // Step 5: Verify migration
  console.log('✔️  Step 5: Verifying migration...');
  const updatedTrades = getTradesFromLocalStorage();
  let stillHasIDs = 0;
  
  updatedTrades.forEach((trade: any) => {
    if (trade.strategy && /^[a-f0-9-]{36}$/i.test(trade.strategy)) {
      stillHasIDs++;
      console.log(`  ⚠️  Trade ${trade.symbol} still has ID: ${trade.strategy}`);
    }
  });
  
  if (stillHasIDs === 0) {
    console.log('  ✅ All trades verified - no IDs remaining\n');
    results.steps.push({
      step: 'Verification',
      success: true,
      message: 'All trades verified successfully'
    });
  } else {
    console.log(`  ⚠️  ${stillHasIDs} trades still have IDs\n`);
    results.success = false;
    results.steps.push({
      step: 'Verification',
      success: false,
      message: `${stillHasIDs} trades still have strategy IDs`
    });
  }
  
  // Summary
  console.log('📊 Migration Summary:');
  console.log(`  Total trades: ${trades.length}`);
  console.log(`  Migrated: ${results.steps.find(s => s.step === 'Migration')?.details?.migrated || 0}`);
  console.log(`  Errors: ${results.steps.find(s => s.step === 'Migration')?.details?.errors || 0}`);
  console.log(`  Status: ${results.success ? '✅ Success' : '⚠️  Partial success'}\n`);
  
  return results;
}

/**
 * Restore from backup (in case something goes wrong)
 */
export function restoreFromBackup(): boolean {
  try {
    const backupStr = localStorage.getItem('finotaur_backup_pre_migration');
    if (!backupStr) {
      console.error('No backup found');
      return false;
    }
    
    const backup = JSON.parse(backupStr);
    localStorage.setItem(STORAGE_KEYS.TRADES, JSON.stringify(backup.trades));
    localStorage.setItem(STORAGE_KEYS.STRATEGIES, JSON.stringify(backup.strategies));
    
    console.log('✅ Restored from backup successfully');
    return true;
  } catch (e) {
    console.error('Failed to restore backup:', e);
    return false;
  }
}

/**
 * Clean up migration artifacts
 */
export function cleanupMigration() {
  // Remove _migrated flags from trades
  const trades = getTradesFromLocalStorage();
  const cleaned = trades.map((trade: any) => {
    const { _migrated, _migrated_at, ...rest } = trade;
    return rest;
  });
  
  localStorage.setItem(STORAGE_KEYS.TRADES, JSON.stringify(cleaned));
  console.log('✅ Cleaned up migration artifacts');
}

// Export for console access
if (typeof window !== 'undefined') {
  (window as any).finotaurMigration = {
    run: runFullMigration,
    restore: restoreFromBackup,
    cleanup: cleanupMigration
  };
  
  console.log('💡 Migration tools available at: window.finotaurMigration');
  console.log('   - window.finotaurMigration.run()     → Run migration');
  console.log('   - window.finotaurMigration.restore() → Restore backup');
  console.log('   - window.finotaurMigration.cleanup() → Clean up artifacts');
}