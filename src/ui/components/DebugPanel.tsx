import type { RepCounterConfig } from '../../engine/repCounter';
import type { AnalyzerDebug } from '../../engine/types';
import styles from './DebugPanel.module.css';

/** What the workout screen hands to the panel (updated ~10 times a second). */
export interface DebugSnapshot {
  value: number | null;
  inFrame: boolean;
  debug: AnalyzerDebug;
  fps: number;
}

interface Props {
  snapshot: DebugSnapshot | null;
  /** rep exercises: thresholds for the bar */
  counter?: RepCounterConfig;
  /** timed exercises: rule in plain words */
  rule?: string;
}

const deg = (v: number | null) => (v === null ? '–' : `${Math.round(v)}°`);

/** Developer view: shows the numbers behind every decision, for tuning thresholds. */
export function DebugPanel({ snapshot, counter, rule }: Props) {
  if (!snapshot) {
    return <div className={styles.panel}>Waiting for the first frame…</div>;
  }

  const { value, inFrame, debug, fps } = snapshot;
  const phaseLabel = counter ? debug.phase : debug.phase === 'active' ? 'holding' : 'paused';

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.heading}>Debug</span>
        <span className={`${styles.phase} ${styles[debug.phase]}`}>{phaseLabel}</span>
      </div>

      <div className={styles.big}>
        {deg(value)}
        <span className={styles.bigLabel}>tracked angle</span>
      </div>

      {counter ? <ThresholdBar counter={counter} value={value} /> : <p className={styles.rule}>{rule}</p>}

      <dl className={styles.grid}>
        {counter && (
          <>
            <dt>This rep reached</dt>
            <dd>{deg(debug.currentRepPeak)}</dd>
            <dt>Last rep reached</dt>
            <dd>{deg(debug.lastRepPeak)}</dd>
          </>
        )}
        <dt>Body side used</dt>
        <dd>{debug.side}</dd>
        <dt>In frame</dt>
        <dd className={inFrame ? styles.ok : styles.bad}>{inFrame ? 'yes' : 'no'}</dd>
        <dt>Frame rate</dt>
        <dd className={fps >= 20 ? styles.ok : styles.bad}>{Math.round(fps)} fps</dd>
      </dl>
    </div>
  );
}

function ThresholdBar({ counter, value }: { counter: RepCounterConfig; value: number | null }) {
  const { restThreshold: rest, startThreshold: start, activeThreshold: active, direction } = counter;
  const all = [rest, start, active];
  const lo = Math.max(0, Math.min(...all) - 30);
  const hi = Math.min(180, Math.max(...all) + 30);
  const pos = (v: number) => `${((Math.min(hi, Math.max(lo, v)) - lo) / (hi - lo)) * 100}%`;
  const rule =
    direction === 'decrease'
      ? `Rep counts when the angle goes below ${active}° and comes back above ${rest}°.`
      : `Rep counts when the angle goes above ${active}° and comes back below ${rest}°.`;

  return (
    <>
      <div className={styles.bar} aria-hidden="true">
        <Marker at={pos(rest)} label={`rest ${rest}°`} kind="rest" />
        <Marker at={pos(start)} label={`start ${start}°`} kind="start" />
        <Marker at={pos(active)} label={`full ${active}°`} kind="active" />
        {value !== null && <span className={styles.dot} style={{ left: pos(value) }} />}
      </div>
      <p className={styles.rule}>{rule}</p>
    </>
  );
}

function Marker({ at, label, kind }: { at: string; label: string; kind: 'rest' | 'start' | 'active' }) {
  return (
    <span className={`${styles.marker} ${styles[`m_${kind}`]}`} style={{ left: at }}>
      <span className={styles.markerLabel}>{label}</span>
    </span>
  );
}
