import styles from './RepCounter.module.css';

/** Big number on the workout screen: reps (7 / 10) or time held (0:21 / 0:30). */
export function RepCounter({ value, target, label }: { value: number | string; target?: number | string; label: string }) {
  return (
    <div className={styles.box}>
      <span className={styles.number}>{value}</span>
      {target !== undefined && <span className={styles.target}>/ {target}</span>}
      <span className={styles.label}>{label}</span>
    </div>
  );
}
