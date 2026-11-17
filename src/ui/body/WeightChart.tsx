import { parseDay, toDisplay, trendSeries, type WeightEntry, type WeightUnit } from '../../state/body';
import { useWidth } from '../components/useWidth';
import styles from './Body.module.css';

interface Props {
  entries: WeightEntry[];
  goalKg: number | null;
  unit: WeightUnit;
  /** days with a workout (YYYY-MM-DD), drawn as small ticks along the bottom */
  workoutDays: string[];
  /** only show the last N days; null = everything */
  rangeDays: number | null;
}

const PAD = { top: 16, right: 12, bottom: 40, left: 44 };
const DAY = 86_400_000;
const short = (t: number) => new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

/** Weight over time: dots for weigh-ins, a smooth 7-day trend line, and a dashed goal line. */
export function WeightChart({ entries, goalKg, unit, workoutDays, rangeDays }: Props) {
  const [ref, W] = useWidth<HTMLDivElement>();
  const H = W < 480 ? 220 : 260;
  const all = trendSeries(entries);
  const lastT = entries.length ? parseDay(entries[entries.length - 1].date).getTime() : Date.now();
  const fromT = rangeDays === null ? -Infinity : lastT - rangeDays * DAY;
  const pts = entries.filter((e) => parseDay(e.date).getTime() >= fromT);
  const trend = all.filter((e) => parseDay(e.date).getTime() >= fromT);

  if (pts.length === 0)
    return (
      <div ref={ref}>
        <p className={styles.muted}>No weigh-ins in this period yet.</p>
      </div>
    );

  const times = pts.map((e) => parseDay(e.date).getTime());
  let t0 = Math.min(...times);
  let t1 = Math.max(...times);
  if (t1 - t0 < 7 * DAY) {
    // stretch short ranges so a single week still looks sensible
    t0 -= 3 * DAY;
    t1 += 3 * DAY;
  }
  const values = pts.map((e) => toDisplay(e.weightKg, unit));
  if (goalKg !== null) values.push(toDisplay(goalKg, unit));
  let lo = Math.min(...values);
  let hi = Math.max(...values);
  const pad = Math.max(1, (hi - lo) * 0.12);
  lo = Math.floor(lo - pad);
  hi = Math.ceil(hi + pad);

  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (t: number) => PAD.left + ((t - t0) / (t1 - t0)) * innerW;
  const y = (v: number) => PAD.top + innerH - ((v - lo) / (hi - lo)) * innerH;
  const trendLine = trend.map((e) => `${x(parseDay(e.date).getTime())},${y(toDisplay(e.weightKg, unit))}`).join(' ');
  const ticks = [lo, (lo + hi) / 2, hi];
  const xLabels = [t0, (t0 + t1) / 2, t1];
  const workouts = workoutDays.map((d) => parseDay(d).getTime()).filter((t) => t >= t0 && t <= t1);

  return (
    <div ref={ref}>
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className={styles.chart} role="img" aria-label="Weight progress chart">
      {ticks.map((v) => (
        <g key={v}>
          <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} className={styles.grid} />
          <text x={PAD.left - 8} y={y(v)} className={styles.axis} textAnchor="end" dominantBaseline="middle">
            {v.toFixed(0)}
          </text>
        </g>
      ))}
      {xLabels.map((t, i) => (
        <text key={i} x={x(t)} y={H - 10} className={styles.axis} textAnchor={i === 0 ? 'start' : i === 2 ? 'end' : 'middle'}>
          {short(t)}
        </text>
      ))}
      {goalKg !== null && (
        <g>
          <line x1={PAD.left} x2={W - PAD.right} y1={y(toDisplay(goalKg, unit))} y2={y(toDisplay(goalKg, unit))} className={styles.goalLine} />
          <text x={W - PAD.right} y={y(toDisplay(goalKg, unit)) - 6} className={styles.goalText} textAnchor="end">
            goal {toDisplay(goalKg, unit).toFixed(1)} {unit}
          </text>
        </g>
      )}
      {workouts.map((t, i) => (
        <rect key={i} x={x(t) - 1.5} y={H - PAD.bottom + 4} width={3} height={8} className={styles.workoutTick}>
          <title>Workout on {short(t)}</title>
        </rect>
      ))}
      {trend.length > 1 && <polyline points={trendLine} className={styles.trendLine} />}
      {pts.map((e) => (
        <circle key={e.id} cx={x(parseDay(e.date).getTime())} cy={y(toDisplay(e.weightKg, unit))} r={4} className={styles.dot}>
          <title>
            {short(parseDay(e.date).getTime())}: {toDisplay(e.weightKg, unit).toFixed(1)} {unit}
          </title>
        </circle>
      ))}
    </svg>
    </div>
  );
}
