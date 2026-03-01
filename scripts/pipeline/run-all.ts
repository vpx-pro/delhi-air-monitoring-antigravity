import { execSync } from 'child_process';
import { insforge } from './lib/insforge-admin';
import { logger } from './lib/logger';

const SOURCES = {
  openaq: {
    backfill: 'scripts/pipeline/openaq/backfill.ts',
    incremental: 'scripts/pipeline/openaq/incremental.ts',
    sync: 'scripts/pipeline/openaq/sync-locations.ts',
  },
  weather: {
    backfill: 'scripts/pipeline/weather/backfill.ts',
    incremental: 'scripts/pipeline/weather/incremental.ts',
  },
  fire: {
    backfill: 'scripts/pipeline/fire/backfill.ts',
    incremental: 'scripts/pipeline/fire/incremental.ts',
  },
  traffic: {
    incremental: 'scripts/pipeline/traffic/sync.ts',
  },
} as const;

type SourceName = keyof typeof SOURCES;
type Mode = 'backfill' | 'incremental' | 'sync';

async function runPipeline(source: SourceName, mode: Mode, extraArgs: string[] = []) {
  const scripts = SOURCES[source] as Record<string, string>;
  const scriptPath = scripts[mode];

  if (!scriptPath) {
    logger.error('run-all', `No ${mode} script for ${source}`);
    return;
  }

  // Record run
  const { data: run } = await insforge.database
    .from('pipeline_runs')
    .insert({ source, mode, status: 'running' })
    .select();

  const runId = (run as any)?.[0]?.id;

  try {
    logger.info('run-all', `Starting ${source} ${mode}`, { script: scriptPath });
    const args = extraArgs.join(' ');
    execSync(`npx tsx ${scriptPath} ${args}`, {
      stdio: 'inherit',
      timeout: 3600000, // 1 hour timeout
    });

    if (runId) {
      await insforge.database
        .from('pipeline_runs')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', runId);
    }

    logger.info('run-all', `Completed ${source} ${mode}`);
  } catch (err) {
    const errorMsg = String(err);
    logger.error('run-all', `Failed ${source} ${mode}`, { error: errorMsg });

    if (runId) {
      await insforge.database
        .from('pipeline_runs')
        .update({
          status: 'failed',
          error_message: errorMsg.substring(0, 1000),
          completed_at: new Date().toISOString(),
        })
        .eq('id', runId);
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const sourceArg = args.find((a) => !a.startsWith('--'));
  const mode = (args.find((a) => a.startsWith('--mode='))?.split('=')[1] as Mode) || 'incremental';
  const extraArgs = args.filter((a) => a.startsWith('--from'));

  if (sourceArg && sourceArg in SOURCES) {
    await runPipeline(sourceArg as SourceName, mode, extraArgs);
    return;
  }

  if (sourceArg === 'all') {
    logger.info('run-all', `Running all pipelines in ${mode} mode`);
    for (const source of Object.keys(SOURCES) as SourceName[]) {
      const scripts = SOURCES[source] as Record<string, string>;
      if (scripts[mode]) {
        await runPipeline(source, mode, extraArgs);
      }
    }
    return;
  }

  console.log(`
Pipeline Runner — Delhi Pollution Data Platform

Usage:
  npx tsx scripts/pipeline/run-all.ts <source> --mode=<mode>

Sources: ${Object.keys(SOURCES).join(', ')}, all

Modes:
  --mode=backfill      Full historical backfill
  --mode=incremental   Recent data sync (default)
  --mode=sync          Sync metadata (locations, etc.)

Examples:
  npx tsx scripts/pipeline/run-all.ts openaq --mode=sync
  npx tsx scripts/pipeline/run-all.ts openaq --mode=backfill --from=2020
  npx tsx scripts/pipeline/run-all.ts weather --mode=incremental
  npx tsx scripts/pipeline/run-all.ts all --mode=incremental
  `);
}

main().catch((err) => {
  logger.error('run-all', 'Fatal error', { error: String(err) });
  process.exit(1);
});
