import { useMemo, useState } from 'react';
import {
  MAX_KG,
  MIN_KG,
  addEntry,
  bmi,
  bmiCategory,
  currentWeight,
  daysSinceLastWeighIn,
  estimatedGoalDate,
  formatChange,
  formatWeight,
  fromDisplay,
  goalProgress,
  loadBody,
  parseDay,
  removeEntry,
  saveBody,
  sortEntries,
  toDisplay,
  todayKey,
  weeklyPace,
  type BodyData,
  type BodyGoal,
  type WeightUnit,
} from '../../state/body';
import { loadHistory } from '../../state/history';
import { trainingDays } from '../../state/progress';
import { GoalSetup } from './GoalSetup';
import { WeightChart } from './WeightChart';
import styles from './Body.module.css';

const RANGES: { label: string; days: number | null }[] = [
  { label: '1M', days: 31 },
  { label: '3M', days: 92 },
  { label: 'All', days: null },
];

const GOAL_NAMES = { lose: 'Lose weight', gain: 'Gain weight', maintain: 'Maintain weight' } as const;
const fmtDate = (d: Date) => d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

/** Body tab: weight goal, weigh-ins, progress chart and stats. */
export function BodyScreen() {
  const [data, setData] = useState<BodyData>(() => loadBody());
  const [editingGoal, setEditingGoal] = useState(false);
  const [range, setRange] = useState<number | null>(92);
  const [date, setDate] = useState(todayKey());
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const workoutDays = useMemo(() => [...trainingDays(loadHistory()).keys()], []);

  const update = (next: BodyData) => {
    setData(next);
    if (!saveBody(next)) setError("Couldn't save: browser storage is full or blocked.");
  };

  const unit = data.unit;
  const goal = data.goal;

  const saveGoal = (g: BodyGoal, u: WeightUnit, currentKg: number) => {
    let next: BodyData = { ...data, goal: g, unit: u };
    // record today's weight if it changed (or it's the very first goal)
    const latest = currentWeight(data);
    if (latest === null || Math.abs(latest - currentKg) > 0.05) next = addEntry(next, todayKey(), currentKg);
    update(next);
    setEditingGoal(false);
  };

  if (!goal || editingGoal) {
    return (
      <GoalSetup
        unit={unit}
        initial={goal}
        currentKg={currentWeight(data)}
        onSave={saveGoal}
        onCancel={goal ? () => setEditingGoal(false) : undefined}
      />
    );
  }

  const entries = sortEntries(data.entries);
  const current = currentWeight(data) ?? goal.startWeightKg;
  const progress = goalProgress(goal, current);
  const pace = weeklyPace(entries);
  const eta = estimatedGoalDate(goal, current, pace);
  const bmiNow = bmi(current, goal.heightCm);
  const bmiStart = bmi(goal.startWeightKg, goal.heightCm);
  const sinceLast = daysSinceLastWeighIn(data);
  const startDate = parseDay(goal.startDate);
  const weeksIn = Math.max(0, Math.floor((Date.now() - startDate.getTime()) / (7 * 86_400_000)));

  const addWeight = () => {
    const num = Number(value);
    const kg = fromDisplay(num, unit);
    if (!value || !Number.isFinite(num) || kg < MIN_KG || kg > MAX_KG) {
      setError(`Enter a weight between ${formatWeight(MIN_KG, unit, 0)} and ${formatWeight(MAX_KG, unit, 0)}.`);
      return;
    }
    if (date > todayKey()) {
      setError("You can't log a weight for a future date.");
      return;
    }
    update(addEntry(data, date, kg));
    setValue('');
    setDate(todayKey());
    setError(null);
  };

  const paceText =
    pace === null
      ? 'Log at least 3 weigh-ins over a week to see your pace'
      : `${formatChange(pace, unit)} per week (last 8 weeks)`;

  const statusText = (() => {
    if (progress.reached) return goal.type === 'maintain' ? 'On target 👍' : 'Goal reached! 🎉';
    if (goal.type === 'maintain') return `${formatWeight(progress.remaining, unit)} outside your target range`;
    return `${formatWeight(progress.remaining, unit)} to go`;
  })();

  const listed = [...entries].reverse();
  const visibleEntries = showAll ? listed : listed.slice(0, 8);

  return (
    <section className={styles.screen}>
      <div className={styles.headRow}>
        <div>
          <h1 className={styles.title}>Body</h1>
          <p className={styles.muted}>
            {GOAL_NAMES[goal.type]}
            {goal.type !== 'maintain' && <> · {formatWeight(goal.startWeightKg, unit)} → {formatWeight(goal.goalWeightKg, unit)}</>}
            {goal.type === 'maintain' && <> · around {formatWeight(goal.goalWeightKg, unit)}</>}
            {' '}· started {fmtDate(startDate)} ({weeksIn} week{weeksIn === 1 ? '' : 's'} ago)
          </p>
        </div>
        <div className={styles.headButtons}>
          <div className={styles.unitToggle} role="radiogroup" aria-label="Units">
            {(['kg', 'lb'] as const).map((u) => (
              <button key={u} role="radio" aria-checked={unit === u} className={unit === u ? styles.unitActive : ''} onClick={() => update({ ...data, unit: u })}>
                {u}
              </button>
            ))}
          </div>
          <button className="btn-secondary" onClick={() => setEditingGoal(true)}>
            Edit goal
          </button>
        </div>
      </div>

      {sinceLast !== null && sinceLast >= 7 && (
        <div className={styles.reminder}>⚖️ Your last weigh-in was {sinceLast} days ago. Log today's weight below.</div>
      )}

      {/* progress */}
      <div className={styles.progressCard}>
        <div className={styles.progressTop}>
          <span className={styles.currentBig}>{formatWeight(current, unit)}</span>
          <span className={progress.reached ? styles.goodText : styles.muted}>{statusText}</span>
        </div>
        {progress.fraction !== null && (
          <>
            <div className={styles.bar} aria-label={`${Math.round(progress.fraction * 100)}% of the way`}>
              <div className={styles.barFill} style={{ width: `${progress.fraction * 100}%` }} />
            </div>
            <div className={styles.barLabels}>
              <span>{formatWeight(goal.startWeightKg, unit)}</span>
              <span>{Math.round(progress.fraction * 100)}% of the way</span>
              <span>{formatWeight(goal.goalWeightKg, unit)}</span>
            </div>
          </>
        )}
      </div>

      <div className={styles.stats}>
        <Stat label="Change since start" value={formatChange(progress.change, unit)} />
        <Stat label="Pace" value={pace === null ? '–' : formatChange(pace, unit) + '/wk'} hint={paceText} />
        {goal.type !== 'maintain' && (
          <Stat
            label="Estimated goal date"
            value={progress.reached ? 'Reached' : eta ? fmtDate(eta) : '–'}
            hint={eta ? 'At your current pace' : 'Needs a steady trend toward your goal'}
          />
        )}
        {goal.targetDate && goal.type !== 'maintain' && <Stat label="Your target date" value={fmtDate(parseDay(goal.targetDate))} />}
        {bmiNow !== null && (
          <Stat
            label="BMI"
            value={`${bmiNow.toFixed(1)} · ${bmiCategory(bmiNow)}`}
            hint={bmiStart !== null ? `Started at ${bmiStart.toFixed(1)}` : undefined}
          />
        )}
      </div>

      {/* add weight */}
      <div className={styles.addCard}>
        <h2 className={styles.subtitle}>Log your weight</h2>
        <div className={styles.addRow}>
          <label className={styles.field}>
            <span>Date</span>
            <input type="date" value={date} max={todayKey()} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label className={styles.field}>
            <span>Weight ({unit})</span>
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              value={value}
              placeholder={toDisplay(current, unit).toFixed(1)}
              onChange={(e) => {
                setValue(e.target.value);
                setError(null);
              }}
              onKeyDown={(e) => e.key === 'Enter' && addWeight()}
            />
          </label>
          <button className="btn-primary" onClick={addWeight}>
            Add
          </button>
        </div>
        <p className={styles.muted}>Tip: weigh yourself at the same time each day, e.g. in the morning before eating. Logging a date again replaces that day's entry.</p>
        {error && <p className={styles.error}>{error}</p>}
      </div>

      {/* chart */}
      <div>
        <div className={styles.chartHead}>
          <h2 className={styles.subtitle}>Progress</h2>
          <div className={styles.rangeToggle} role="radiogroup" aria-label="Time range">
            {RANGES.map((r) => (
              <button key={r.label} role="radio" aria-checked={range === r.days} className={range === r.days ? styles.unitActive : ''} onClick={() => setRange(r.days)}>
                {r.label}
              </button>
            ))}
          </div>
        </div>
        <div className={styles.chartCard}>
          <WeightChart entries={entries} goalKg={goal.type === 'maintain' ? goal.goalWeightKg : goal.goalWeightKg} unit={unit} workoutDays={workoutDays} rangeDays={range} />
          <div className={styles.legend}>
            <span><i className={styles.legendDot} /> weigh-in</span>
            <span><i className={styles.legendTrend} /> 7-day average</span>
            <span><i className={styles.legendGoal} /> goal</span>
            <span><i className={styles.legendWorkout} /> workout day</span>
          </div>
        </div>
      </div>

      {/* entries */}
      <div>
        <h2 className={styles.subtitle}>Weigh-ins ({entries.length})</h2>
        <ul className={styles.entries}>
          {visibleEntries.map((e, i) => {
            const prev = listed[i + 1];
            return (
              <li key={e.id}>
                <span>{fmtDate(parseDay(e.date))}</span>
                <span className={styles.entryWeight}>{formatWeight(e.weightKg, unit)}</span>
                <span className={styles.muted}>{prev ? formatChange(e.weightKg - prev.weightKg, unit) : 'start'}</span>
                <button className={styles.deleteButton} onClick={() => update(removeEntry(data, e.id))} aria-label={`Delete weigh-in on ${e.date}`}>
                  ✕
                </button>
              </li>
            );
          })}
        </ul>
        {listed.length > 8 && (
          <button className={styles.linkButton} onClick={() => setShowAll((v) => !v)}>
            {showAll ? 'Show fewer' : `Show all ${listed.length}`}
          </button>
        )}
      </div>

      <div>
        {confirmReset ? (
          <div className={styles.confirm}>
            <span>Delete your goal and all weigh-ins? This can't be undone (export a backup in History first).</span>
            <button
              className="btn-secondary"
              onClick={() => {
                update({ unit, goal: null, entries: [] });
                setConfirmReset(false);
              }}
            >
              Yes, delete
            </button>
            <button className="btn-secondary" onClick={() => setConfirmReset(false)}>
              Cancel
            </button>
          </div>
        ) : (
          <button className={styles.linkButton} onClick={() => setConfirmReset(true)}>
            Reset body tracking
          </button>
        )}
      </div>
    </section>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className={styles.stat} title={hint}>
      <span className={styles.statValue}>{value}</span>
      <span className={styles.muted}>{label}</span>
      {hint && <span className={styles.statHint}>{hint}</span>}
    </div>
  );
}
