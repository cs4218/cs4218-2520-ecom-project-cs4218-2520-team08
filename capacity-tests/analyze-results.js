/**
 * Capacity Test Results Analyzer
 *
 * Parses JMeter CSV output from the capacity test, groups samples into
 * 60-second time windows (stages), and computes per-stage metrics:
 *   - P75, P90, P95 response latency
 *   - Error rate (%)
 *   - Throughput (req/s)
 *   - Active threads (concurrent users)
 *
 * Identifies the capacity ceiling: the highest concurrent-user count
 * where P75 latency <= 1800ms AND error rate <= 0.1%.
 *
 * Usage: node capacity-tests/analyze-results.js [path-to-csv]
 * Default CSV: capacity-tests/results/capacity-results.csv
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Configuration ---
const LATENCY_THRESHOLD_MS = 1800;   // P75 latency threshold
const ERROR_RATE_THRESHOLD = 0.1;    // Error rate threshold (%)
const STAGE_DURATION_MS = 60_000;    // 60-second windows

// --- Parse CLI args ---
const csvPath = process.argv[2]
  || path.join(__dirname, 'results', 'capacity-results.csv');

if (!fs.existsSync(csvPath)) {
  console.error(`Results file not found: ${csvPath}`);
  console.error('Run the capacity test first: npm run test:capacity');
  process.exit(1);
}

// --- Read and parse CSV ---
const raw = fs.readFileSync(csvPath, 'utf-8');
const lines = raw.trim().split('\n');

if (lines.length < 2) {
  console.error('CSV file is empty or has no data rows.');
  process.exit(1);
}

const headers = lines[0].split(',');
const colIndex = {};
headers.forEach((h, i) => { colIndex[h.trim()] = i; });

// Validate required columns
const requiredCols = ['timeStamp', 'elapsed', 'label', 'success', 'grpThreads', 'allThreads'];
for (const col of requiredCols) {
  if (colIndex[col] === undefined) {
    console.error(`Missing required column: ${col}`);
    console.error(`Available columns: ${headers.join(', ')}`);
    process.exit(1);
  }
}

const samples = [];
for (let i = 1; i < lines.length; i++) {
  const cols = lines[i].split(',');
  if (cols.length < headers.length) continue;

  samples.push({
    timestamp: parseInt(cols[colIndex['timeStamp']], 10),
    elapsed:   parseInt(cols[colIndex['elapsed']], 10),
    label:     cols[colIndex['label']],
    success:   cols[colIndex['success']].trim().toLowerCase() === 'true',
    threads:   parseInt(cols[colIndex['allThreads']], 10),
  });
}

if (samples.length === 0) {
  console.error('No valid sample data found in CSV.');
  process.exit(1);
}

// --- Group into time-window stages ---
samples.sort((a, b) => a.timestamp - b.timestamp);
const testStart = samples[0].timestamp;

const stages = new Map(); // stageIndex -> { samples: [], maxThreads }

for (const s of samples) {
  const stageIdx = Math.floor((s.timestamp - testStart) / STAGE_DURATION_MS);
  if (!stages.has(stageIdx)) {
    stages.set(stageIdx, { samples: [], maxThreads: 0 });
  }
  const stage = stages.get(stageIdx);
  stage.samples.push(s);
  if (s.threads > stage.maxThreads) {
    stage.maxThreads = s.threads;
  }
}

// --- Compute percentile helper ---
function percentile(arr, p) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

// --- Analyze each stage ---
console.log('\n' + '='.repeat(100));
console.log('CAPACITY TEST RESULTS ANALYSIS');
console.log('='.repeat(100));
console.log(`\nThresholds: P75 Latency <= ${LATENCY_THRESHOLD_MS}ms, Error Rate <= ${ERROR_RATE_THRESHOLD}%`);
console.log(`Stage duration: ${STAGE_DURATION_MS / 1000}s windows\n`);

const stageResults = [];
const sortedStageKeys = [...stages.keys()].sort((a, b) => a - b);

// Table header
console.log(
  'Stage'.padEnd(7) +
  'Users'.padEnd(8) +
  'Samples'.padEnd(10) +
  'P75(ms)'.padEnd(10) +
  'P90(ms)'.padEnd(10) +
  'P95(ms)'.padEnd(10) +
  'Avg(ms)'.padEnd(10) +
  'Err%'.padEnd(8) +
  'Req/s'.padEnd(8) +
  'Status'
);
console.log('-'.repeat(100));

let capacityCeiling = null;
let breachMetric = null;
let lastPassingStage = null;

// Minimum sample threshold: stages with very few samples (e.g. post-OOM recovery)
// are unreliable and should not count as passing.
const MIN_SAMPLES_PER_STAGE = 50;

for (const idx of sortedStageKeys) {
  const stage = stages.get(idx);
  // Filter out JMeter metrics-collector samples from capacity analysis
  const appSamples = stage.samples.filter(s => s.label !== 'Collect CPU and Memory');
  if (appSamples.length === 0) continue;
  const elapsed = appSamples.map(s => s.elapsed);
  const errors = appSamples.filter(s => !s.success).length;
  const total = appSamples.length;
  const errorRate = (errors / total) * 100;

  const p75 = percentile(elapsed, 75);
  const p90 = percentile(elapsed, 90);
  const p95 = percentile(elapsed, 95);
  const avg = Math.round(elapsed.reduce((a, b) => a + b, 0) / total);
  const throughput = (total / (STAGE_DURATION_MS / 1000)).toFixed(1);

  const latencyBreached = p75 > LATENCY_THRESHOLD_MS;
  const errorBreached = errorRate > ERROR_RATE_THRESHOLD;
  const tooFewSamples = total < MIN_SAMPLES_PER_STAGE;
  const breached = latencyBreached || errorBreached;

  let status = 'PASS';
  let breachReason = '';
  if (latencyBreached && errorBreached) {
    status = 'FAIL';
    breachReason = 'P75+Err';
  } else if (latencyBreached) {
    status = 'FAIL';
    breachReason = 'P75';
  } else if (errorBreached) {
    status = 'FAIL';
    breachReason = 'Err%';
  } else if (tooFewSamples) {
    status = 'SKIP';
    breachReason = 'low-n';
  }

  const result = {
    stage: idx + 1,
    users: stage.maxThreads,
    total,
    p75, p90, p95, avg,
    errorRate: errorRate.toFixed(3),
    throughput,
    breached,
    breachReason,
  };
  stageResults.push(result);

  // Capacity = last passing stage BEFORE the first breach.
  // Stages after a breach (even if they technically pass, e.g. post-OOM recovery
  // with very few samples) do NOT count.
  if (!breached && !tooFewSamples && capacityCeiling === null) {
    lastPassingStage = result;
  } else if (breached && capacityCeiling === null) {
    capacityCeiling = result;
    breachMetric = breachReason;
  }

  console.log(
    String(result.stage).padEnd(7) +
    String(result.users).padEnd(8) +
    String(result.total).padEnd(10) +
    String(result.p75).padEnd(10) +
    String(result.p90).padEnd(10) +
    String(result.p95).padEnd(10) +
    String(result.avg).padEnd(10) +
    String(result.errorRate).padEnd(8) +
    String(result.throughput).padEnd(8) +
    (breached ? `FAIL (${breachReason})` : tooFewSamples ? `SKIP (${breachReason})` : 'PASS')
  );
}

// --- Per-endpoint breakdown ---
console.log('\n' + '='.repeat(100));
console.log('PER-ENDPOINT BREAKDOWN');
console.log('='.repeat(100) + '\n');

const byLabel = new Map();
for (const s of samples) {
  // Exclude JMeter internal metrics from endpoint breakdown
  if (s.label === 'Collect CPU and Memory') continue;
  if (!byLabel.has(s.label)) {
    byLabel.set(s.label, []);
  }
  byLabel.get(s.label).push(s);
}

console.log(
  'Endpoint'.padEnd(30) +
  'Count'.padEnd(10) +
  'P75(ms)'.padEnd(10) +
  'P90(ms)'.padEnd(10) +
  'P95(ms)'.padEnd(10) +
  'Avg(ms)'.padEnd(10) +
  'Err%'.padEnd(8)
);
console.log('-'.repeat(88));

for (const [label, labelSamples] of byLabel) {
  const elapsed = labelSamples.map(s => s.elapsed);
  const errors = labelSamples.filter(s => !s.success).length;
  const errorRate = ((errors / labelSamples.length) * 100).toFixed(3);

  console.log(
    label.padEnd(30) +
    String(labelSamples.length).padEnd(10) +
    String(percentile(elapsed, 75)).padEnd(10) +
    String(percentile(elapsed, 90)).padEnd(10) +
    String(percentile(elapsed, 95)).padEnd(10) +
    String(Math.round(elapsed.reduce((a, b) => a + b, 0) / labelSamples.length)).padEnd(10) +
    errorRate.padEnd(8)
  );
}

// --- Final verdict ---
console.log('\n' + '='.repeat(100));
console.log('CAPACITY DETERMINATION');
console.log('='.repeat(100) + '\n');

if (lastPassingStage && capacityCeiling) {
  console.log(`  Maximum Capacity:       ${lastPassingStage.users} concurrent users`);
  console.log(`  Capacity Ceiling Stage:  Stage ${lastPassingStage.stage} (${lastPassingStage.users} threads)`);
  console.log(`  First Breach At:         Stage ${capacityCeiling.stage} (${capacityCeiling.users} threads)`);
  console.log(`  Breach Metric:           ${breachMetric === 'P75' ? `P75 latency exceeded ${LATENCY_THRESHOLD_MS}ms` : breachMetric === 'Err%' ? `Error rate exceeded ${ERROR_RATE_THRESHOLD}%` : `Both P75 latency and error rate exceeded thresholds`}`);
  console.log(`  P75 at Breach:           ${capacityCeiling.p75}ms`);
  console.log(`  Error Rate at Breach:    ${capacityCeiling.errorRate}%`);
} else if (!capacityCeiling) {
  const last = stageResults[stageResults.length - 1];
  console.log(`  No threshold breach detected up to ${last.users} concurrent users.`);
  console.log(`  Maximum tested capacity: ${last.users} users (all stages passed).`);
  console.log(`  Consider extending the test with higher concurrency levels.`);
} else {
  console.log(`  Threshold was breached from stage 1 (${stageResults[0].users} users).`);
  console.log(`  The system cannot meet SLAs even at the lowest tested load.`);
  console.log(`  Investigate baseline performance issues before retesting.`);
}

console.log('\n' + '='.repeat(100));

// --- Write JSON summary for programmatic consumption ---
const summaryPath = path.join(path.dirname(csvPath), 'capacity-summary.json');
const summary = {
  thresholds: {
    p75LatencyMs: LATENCY_THRESHOLD_MS,
    errorRatePercent: ERROR_RATE_THRESHOLD,
  },
  stages: stageResults,
  capacity: lastPassingStage
    ? { maxUsers: lastPassingStage.users, stage: lastPassingStage.stage }
    : null,
  breach: capacityCeiling
    ? { users: capacityCeiling.users, stage: capacityCeiling.stage, metric: breachMetric }
    : null,
  totalSamples: samples.length,
  testDurationMs: samples[samples.length - 1].timestamp - testStart,
};

fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
console.log(`\nJSON summary written to: ${summaryPath}`);

// --- System Metrics Summary (Fix #14) ---
const metricsPath = path.join(path.dirname(csvPath), 'system-metrics.csv');
if (fs.existsSync(metricsPath)) {
  console.log('\n' + '='.repeat(100));
  console.log('SYSTEM RESOURCE METRICS (JMeter JVM)');
  console.log('='.repeat(100) + '\n');

  const metricsRaw = fs.readFileSync(metricsPath, 'utf-8');
  const metricsLines = metricsRaw.trim().split('\n');

  if (metricsLines.length > 1) {
    const mHeaders = metricsLines[0].split(',');
    const mColIdx = {};
    mHeaders.forEach((h, i) => { mColIdx[h.trim()] = i; });

    const metricsData = [];
    for (let i = 1; i < metricsLines.length; i++) {
      const cols = metricsLines[i].split(',');
      if (cols.length < mHeaders.length) continue;
      metricsData.push({
        timestamp:    parseInt(cols[mColIdx['timestamp']], 10),
        threads:      parseInt(cols[mColIdx['active_threads']], 10),
        jvmCpu:       parseFloat(cols[mColIdx['jvm_cpu_pct']]),
        systemCpu:    parseFloat(cols[mColIdx['system_cpu_pct']]),
        heapUsedMb:   parseFloat(cols[mColIdx['heap_used_mb']]),
        heapMaxMb:    parseFloat(cols[mColIdx['heap_max_mb']]),
        heapPct:      parseFloat(cols[mColIdx['heap_usage_pct']]),
      });
    }

    if (metricsData.length > 0) {
      const maxJvmCpu = Math.max(...metricsData.map(m => m.jvmCpu));
      const maxSysCpu = Math.max(...metricsData.map(m => m.systemCpu));
      const maxHeapMb = Math.max(...metricsData.map(m => m.heapUsedMb));
      const maxHeapPct = Math.max(...metricsData.map(m => m.heapPct));
      const avgJvmCpu = metricsData.reduce((s, m) => s + m.jvmCpu, 0) / metricsData.length;
      const avgSysCpu = metricsData.reduce((s, m) => s + m.systemCpu, 0) / metricsData.length;
      const avgHeapMb = metricsData.reduce((s, m) => s + m.heapUsedMb, 0) / metricsData.length;

      console.log(`  Samples collected:    ${metricsData.length}`);
      console.log(`  JVM CPU (avg / max):  ${avgJvmCpu.toFixed(1)}% / ${maxJvmCpu.toFixed(1)}%`);
      console.log(`  System CPU (avg/max): ${avgSysCpu.toFixed(1)}% / ${maxSysCpu.toFixed(1)}%`);
      console.log(`  Heap used (avg/max):  ${avgHeapMb.toFixed(0)}MB / ${maxHeapMb.toFixed(0)}MB`);
      console.log(`  Heap max:             ${metricsData[0].heapMaxMb.toFixed(0)}MB`);
      console.log(`  Peak heap usage:      ${maxHeapPct.toFixed(1)}%`);

      if (maxSysCpu > 90) {
        console.log('\n  ⚠ WARNING: System CPU exceeded 90% — CPU saturation likely contributed to latency.');
      }
      if (maxHeapPct > 85) {
        console.log('\n  ⚠ WARNING: Heap usage exceeded 85% — risk of GC pauses or OOM.');
      }

      // Add metrics to JSON summary
      summary.systemMetrics = {
        sampleCount: metricsData.length,
        jvmCpu: { avg: +avgJvmCpu.toFixed(1), max: +maxJvmCpu.toFixed(1) },
        systemCpu: { avg: +avgSysCpu.toFixed(1), max: +maxSysCpu.toFixed(1) },
        heapUsedMb: { avg: +avgHeapMb.toFixed(0), max: +maxHeapMb.toFixed(0) },
        heapMaxMb: +metricsData[0].heapMaxMb.toFixed(0),
        peakHeapPct: +maxHeapPct.toFixed(1),
      };
      fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    }
  }
} else {
  console.log('\n(System metrics file not found — skipping resource analysis)');
}

// --- ASCII Latency-vs-Users Chart (Fix #19) ---
console.log('\n' + '='.repeat(100));
console.log('LATENCY vs CONCURRENT USERS CHART');
console.log('='.repeat(100) + '\n');

const CHART_HEIGHT = 20;
const CHART_WIDTH = 60;

if (stageResults.length > 0) {
  // Determine axis ranges — cap Y-axis at 3x threshold so OOM-inflated outliers
  // don't compress all meaningful data points into a single row.
  const maxP75 = Math.max(...stageResults.map(r => r.p75), LATENCY_THRESHOLD_MS);
  const yMaxRaw = Math.ceil(maxP75 * 1.2 / 100) * 100;
  const yMax = Math.min(yMaxRaw, LATENCY_THRESHOLD_MS * 3); // cap at 3x threshold
  const maxUsers = Math.max(...stageResults.map(r => r.users));

  // Build chart grid
  const grid = Array.from({ length: CHART_HEIGHT }, () => Array(CHART_WIDTH).fill(' '));

  // Plot threshold line
  const threshRow = CHART_HEIGHT - 1 - Math.round((LATENCY_THRESHOLD_MS / yMax) * (CHART_HEIGHT - 1));
  if (threshRow >= 0 && threshRow < CHART_HEIGHT) {
    for (let c = 0; c < CHART_WIDTH; c++) {
      grid[threshRow][c] = '-';
    }
  }

  // Plot P75 data points (clamp to top of chart for values exceeding yMax)
  for (const r of stageResults) {
    const col = Math.round((r.users / maxUsers) * (CHART_WIDTH - 1));
    const rawRow = CHART_HEIGHT - 1 - Math.round((Math.min(r.p75, yMax) / yMax) * (CHART_HEIGHT - 1));
    const row = Math.max(0, Math.min(CHART_HEIGHT - 1, rawRow));
    if (col >= 0 && col < CHART_WIDTH) {
      // Use ^ for values that exceed the chart scale
      grid[row][col] = r.p75 > yMax ? '^' : (r.breached ? 'X' : '*');
    }
  }

  // Render
  const yLabelWidth = String(yMax).length + 2;
  for (let row = 0; row < CHART_HEIGHT; row++) {
    const yVal = Math.round(yMax * (1 - row / (CHART_HEIGHT - 1)));
    const label = (row === 0 || row === CHART_HEIGHT - 1 || row === threshRow)
      ? String(yVal).padStart(yLabelWidth)
      : ' '.repeat(yLabelWidth);
    const marker = row === threshRow ? '>' : '|';
    console.log(`${label} ${marker}${grid[row].join('')}`);
  }
  console.log(' '.repeat(yLabelWidth + 1) + '+' + '-'.repeat(CHART_WIDTH));

  // X-axis labels
  const xLabels = [stageResults[0].users, stageResults[Math.floor(stageResults.length / 2)]?.users, stageResults[stageResults.length - 1].users];
  const positions = [0, Math.floor(CHART_WIDTH / 2), CHART_WIDTH - 1];
  let xAxis = Array(CHART_WIDTH).fill(' ');
  for (let i = 0; i < xLabels.length; i++) {
    const s = String(xLabels[i]);
    const pos = positions[i];
    for (let j = 0; j < s.length && pos + j < CHART_WIDTH; j++) {
      xAxis[pos + j] = s[j];
    }
  }
  console.log(' '.repeat(yLabelWidth + 1) + ' ' + xAxis.join(''));
  console.log(' '.repeat(yLabelWidth + 1) + ' '.repeat(Math.floor(CHART_WIDTH / 2) - 8) + 'Concurrent Users');

  console.log(`\n  Legend: * = PASS, X = FAIL, ^ = off-scale (exceeds ${yMax}ms), --- = threshold (${LATENCY_THRESHOLD_MS}ms)`);
  console.log('  Y-axis: P75 Latency (ms)   X-axis: Concurrent users');
}

// --- Recommendations (Fix #20) ---
console.log('\n' + '='.repeat(100));
console.log('RECOMMENDATIONS');
console.log('='.repeat(100) + '\n');

// Find the slowest endpoint
let slowestEndpoint = null;
let slowestP95 = 0;
for (const [label, labelSamples] of byLabel) {
  const elapsed = labelSamples.map(s => s.elapsed);
  const p95 = percentile(elapsed, 95);
  if (p95 > slowestP95) {
    slowestP95 = p95;
    slowestEndpoint = label;
  }
}

const recommendations = [];

// Capacity-based recommendations
if (lastPassingStage && capacityCeiling) {
  const safeCapacity = Math.floor(lastPassingStage.users * 0.8);
  recommendations.push(`Safe operating capacity: ~${safeCapacity} concurrent users (80% of ceiling at ${lastPassingStage.users} users).`);

  if (breachMetric === 'P75' || breachMetric === 'P75+Err') {
    recommendations.push('Latency is the bottleneck. Consider: response caching, query optimization, or connection pooling.');
  }
  if (breachMetric === 'Err%' || breachMetric === 'P75+Err') {
    recommendations.push('Error rate is high under load. Check: server connection limits, database pool size, and memory allocation.');
  }
} else if (!capacityCeiling) {
  recommendations.push('No breach was found — the current test ceiling may be too low. Run again with more threads to discover the true limit.');
}

// Endpoint-specific advice
if (slowestEndpoint) {
  recommendations.push(`Slowest endpoint: "${slowestEndpoint}" (P95: ${slowestP95}ms). Prioritize optimization here.`);
  if (slowestEndpoint.includes('Login') || slowestEndpoint.includes('login')) {
    recommendations.push('Login is slow — bcrypt hash cost may be too high under concurrency. Consider reducing rounds (e.g., 10→8) or offloading auth to a separate service.');
  }
  if (slowestEndpoint.includes('Payment') || slowestEndpoint.includes('payment') || slowestEndpoint.includes('braintree')) {
    recommendations.push('Payment endpoint is slow — this depends on the external Braintree gateway. Consider async order processing or queue-based architecture.');
  }
  if (slowestEndpoint.includes('Product')) {
    recommendations.push('Product queries are slow — add database indexes, enable query result caching (Redis/in-memory), or paginate responses.');
  }
}

// General scaling advice
recommendations.push('Horizontal scaling: deploy behind a load balancer with multiple Node.js instances (e.g., PM2 cluster mode or container orchestration).');
recommendations.push('Monitor: track P75 latency, error rate, CPU, and heap in production with alerting at 80% of capacity ceiling.');

for (let i = 0; i < recommendations.length; i++) {
  console.log(`  ${i + 1}. ${recommendations[i]}`);
}

// Add recommendations to JSON summary
summary.recommendations = recommendations;
fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

console.log('\n' + '='.repeat(100));
