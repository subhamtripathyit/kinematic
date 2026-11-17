import { useMemo, useRef, useState } from 'react';
import { clearHistory, exportBackup, exportCsv, importBackup, loadHistory, personalBests } from '../../state/history';
import { describeStats, formatDuration, formScore, type SessionSummary } from '../../state/session';
import { ProgressChart, type ChartPoint } from '../components/ProgressChart';
import styles from './HistoryScreen.module.css';

type Metric = 'total' | 'best' | 'score';

interface Props {
  onStart: () => void;
  /** called after a backup is imported (routines may have changed) */
  onImported: () => void;
}

function download(filename: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const today = () => new Date().toISOString().slice(0, 10);

/** Past workouts, progress chart, personal bests and backup, all saved in this browser. */
export function HistoryScreen({ onStart, onImported }: Props) {
  const [history, setHistory] = useState(() => loadHistory());
  const [filter, setFilter] = useState('all');
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const exercises = useMemo(() => {
    const names = new Map<string, string>();
    for (const h of history) names.set(h.exerciseId, h.exerciseName);
    return [...names.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [history]);

  const [chartExercise, setChartExercise] = useState(() => history[0]?.exerciseId ?? '');
  const [metric, setMetric] = useState<Metric>('total');

  const bests = useMemo(() => personalBests(history), [history]);
  const shown = filter === 'all' ? history : history.filter((h) => h.exerciseId === filter);

  const chartSessions = useMemo(
    () => history.filter((h) => h.exerciseId === chartExercise).slice(0, 30).reverse(),
    [history, chartExercise],
  );
  const chartIsHold = chartSessions[0]?.kind === 'hold';
  const chartPoints: ChartPoint[] = chartSessions
    .map((h) => ({ date: h.date, value: metricValue(h, metric) }))
    .filter((p): p is ChartPoint => p.value !== null);
  const formatValue = (v: number) =>
    metric === 'score' ? String(Math.round(v)) : chartIsHold ? formatDuration(v / 1000) : String(Math.round(v));

  const onImportFile = async (file: File) => {
    try {
      const { sessionsAdded, routinesAdded } = importBackup(await file.text());
      const updated = loadHistory();
      setHistory(updated);
      if (!chartExercise && updated[0]) setChartExercise(updated[0].exerciseId);
      onImported();
      setMessage({
        text: `Backup restored: ${sessionsAdded} workout${sessionsAdded === 1 ? '' : 's'} and ${routinesAdded} routine${routinesAdded === 1 ? '' : 's'} added.`,
      });
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : 'Could not import that file.', error: true });
    }
  };

  const backupControls = (
    <div className={styles.backup}>
      <button className="btn-secondary" onClick={() => download(`kinematic-backup-${today()}.json`, exportBackup(), 'application/json')}>
        Export backup
      </button>
      <button className="btn-secondary" onClick={() => fileRef.current?.click()}>
        Import backup
      </button>
      {history.length > 0 && (
        <button className="btn-secondary" onClick={() => download(`kinematic-history-${today()}.csv`, exportCsv(history), 'text/csv')}>
          Export CSV
        </button>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void onImportFile(file);
          e.target.value = '';
        }}
      />
    </div>
  );

  if (history.length === 0) {
    return (
      <section className={styles.empty}>
        <h1 className={styles.title}>History</h1>
        <p className={styles.muted}>No workouts saved yet. Finish a workout and it will show up here.</p>
        <button className="btn-primary" onClick={onStart}>
          Start a workout
        </button>
        <p className={styles.muted}>Have a backup from another browser or laptop?</p>
        {backupControls}
        {message && <p className={message.error ? styles.error : styles.success}>{message.text}</p>}
      </section>
    );
  }

  return (
    <section className={styles.screen}>
      <div className={styles.top}>
        <div>
          <h1 className={styles.title}>History</h1>
          <p className={styles.muted}>
            {history.length} workout{history.length === 1 ? '' : 's'} saved in this browser. Export a backup now and then
            so you don't lose them.
          </p>
        </div>
        {backupControls}
      </div>
      {message && <p className={message.error ? styles.error : styles.success}>{message.text}</p>}

      <div>
        <div className={styles.listHeader}>
          <h2 className={styles.subtitle}>Progress</h2>
          <div className={styles.controls}>
            <select className={styles.select} value={chartExercise} onChange={(e) => setChartExercise(e.target.value)}>
              {exercises.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
            <select className={styles.select} value={metric} onChange={(e) => setMetric(e.target.value as Metric)}>
              <option value="total">{chartIsHold ? 'Total time held' : 'Total reps'}</option>
              <option value="best">{chartIsHold ? 'Longest hold' : 'Best set'}</option>
              <option value="score">Form score</option>
            </select>
          </div>
        </div>
        <ProgressChart points={chartPoints} format={formatValue} maxValue={metric === 'score' ? 100 : undefined} />
      </div>

      <div>
        <h2 className={styles.subtitle}>Personal bests (best single set)</h2>
        <div className={styles.bests}>
          {bests.map((b) => (
            <div key={b.exerciseId} className={styles.best}>
              <span className={styles.bestValue}>{b.kind === 'hold' ? formatDuration(b.best / 1000) : b.best}</span>
              <span className={styles.bestName}>
                {b.exerciseName}
                {b.kind === 'hold' ? '' : ' reps'}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className={styles.listHeader}>
          <h2 className={styles.subtitle}>Workouts</h2>
          <select className={styles.select} value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All exercises</option>
            {exercises.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </div>

        <ul className={styles.list}>
          {shown.map((h) => {
            const score = formScore(h.kind, h.totals);
            return (
              <li key={h.id} className={styles.item}>
                <div className={styles.itemMain}>
                  <span className={styles.itemName}>
                    {h.exerciseName}
                    {h.routine && <span className={styles.tag}>{h.routine.name}</span>}
                    {h.plan.mode === 'free' && <span className={styles.tag}>Free</span>}
                  </span>
                  <span className={styles.muted}>
                    {new Date(h.date).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                  </span>
                </div>
                <div className={styles.itemStats}>
                  <span className={styles.itemTotal}>
                    {describeStats(h.kind, h.totals)}
                    {score !== null && <span className={styles.score}> · form {score}</span>}
                  </span>
                  <span className={styles.muted}>
                    {h.sets.length} set{h.sets.length === 1 ? '' : 's'}:{' '}
                    {h.sets.map((s) => (h.kind === 'hold' ? formatDuration(s.stats.holdMs / 1000) : s.stats.reps)).join(' · ')}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>

        <div className={styles.dangerZone}>
          {confirming ? (
            <div className={styles.confirm}>
              <span>Delete all history? This can't be undone (export a backup first).</span>
              <button
                className="btn-secondary"
                onClick={() => {
                  clearHistory();
                  setHistory([]);
                  setConfirming(false);
                }}
              >
                Yes, delete
              </button>
              <button className="btn-secondary" onClick={() => setConfirming(false)}>
                Cancel
              </button>
            </div>
          ) : (
            <button className={styles.linkButton} onClick={() => setConfirming(true)}>
              Clear history
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

/** Value plotted for one workout. */
function metricValue(h: SessionSummary, metric: Metric): number | null {
  const hold = h.kind === 'hold';
  if (metric === 'score') return formScore(h.kind, h.totals);
  if (metric === 'total') return hold ? h.totals.holdMs : h.totals.reps;
  const perSet = h.sets.map((s) => (hold ? s.stats.holdMs : s.stats.reps));
  return perSet.length ? Math.max(...perSet) : null;
}
