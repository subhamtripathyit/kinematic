import { useWidth } from './useWidth';
import styles from './ProgressChart.module.css';

export interface ChartPoint {
  date: string;
  value: number;
}

interface Props {
  points: ChartPoint[];
  format: (value: number) => string;
  /** y axis always starts at 0; set a max for scores (100) */
  maxValue?: number;
}

const PAD = { top: 20, right: 20, bottom: 36, left: 48 };

const shortDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

/** Simple line chart drawn with SVG (no chart library needed). */
export function ProgressChart({ points, format, maxValue }: Props) {
  const [ref, measured] = useWidth<HTMLDivElement>();
  // the wrapper has padding; draw at the inner width
  const W = Math.max(240, measured - 32);
  const H = W < 480 ? 200 : 240;

  if (points.length === 0) {
    return (
      <div ref={ref}>
        <p className={styles.empty}>No data for this yet.</p>
      </div>
    );
  }

  const max = maxValue ?? Math.max(1, ...points.map((p) => p.value)) * 1.15;
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const y = (v: number) => PAD.top + innerH - (v / max) * innerH;
  const line = points.map((p, i) => `${x(i)},${y(p.value)}`).join(' ');
  const gridValues = [0, max / 2, max];
  const labelEvery = Math.max(1, Math.ceil(points.length / (W < 480 ? 3 : 6)));

  return (
    <div className={styles.wrap} ref={ref}>
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className={styles.svg} role="img" aria-label="Progress chart">
        {gridValues.map((v) => (
          <g key={v}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} className={styles.grid} />
            <text x={PAD.left - 8} y={y(v)} className={styles.axis} textAnchor="end" dominantBaseline="middle">
              {format(v)}
            </text>
          </g>
        ))}
        {points.length > 1 && <polyline points={line} className={styles.line} />}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={x(i)} cy={y(p.value)} r={5} className={styles.dot}>
              <title>
                {shortDate(p.date)}: {format(p.value)}
              </title>
            </circle>
            {(i % labelEvery === 0 || i === points.length - 1) && (
              <text x={x(i)} y={H - 12} className={styles.axis} textAnchor="middle">
                {shortDate(p.date)}
              </text>
            )}
          </g>
        ))}
      </svg>
      {points.length === 1 && <p className={styles.empty}>Do this exercise again to see a trend.</p>}
    </div>
  );
}
