import { useMemo, useState } from 'react';
import { t } from '../../i18n';
import {
  cleanNumber,
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
      setError(t('Enter a weight between {min} and {max}.', { min: formatWeight(MIN_KG, unit, 0), max: formatWeight(MAX_KG, unit, 0) }));
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
      ? t('Log at least 3 weigh-ins over a week to see your pace')
      : t('{pace} per week (last 8 weeks)', { pace: formatChange(pace, unit) });

  const statusText = (() => {
    if (progress.reached) return goal.type === 'maintain' ? t('On target 👍') : t('Goal reached! 🎉');
    if (goal.type === 'maintain') return t('{w} outside your target range', { w: formatWeight(progress.remaining, unit) });
    return t('{w} to go', { w: formatWeight(progress.remaining, unit) });
  })();

  const listed = [...entries].reverse();
  const visibleEntries = showAll ? listed : listed.slice(0, 8);

  return (
    <section className={styles.screen}>
      <div className={styles.headRow}>
        <div>
          <h1 className={styles.title}>{t('Body')}</h1>
          <p className={styles.muted}>
            {t(GOAL_NAMES[goal.type])}
            {goal.type !== 'maintain' && <> · {formatWeight(goal.startWeightKg, unit)} → {formatWeight(goal.goalWeightKg, unit)}</>}
            {goal.type === 'maintain' && <> · {t('around {w}', { w: formatWeight(goal.goalWeightKg, unit) })}</>}
            {' '}· {t('started {date} ({n} weeks ago)', { date: fmtDate(startDate), n: weeksIn })}
          </p>
        </div>
        <div className={styles.headButtons}>
          <button className="btn-secondary" onClick={() => setEditingGoal(true)}>
            {t('Edit goal')}
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
              <span>{t('{p}% of the way', { p: Math.round(progress.fraction * 100) })}</span>
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
            value={progress.reached ? t('Reached') : eta ? fmtDate(eta) : '–'}
            hint={eta ? t('At your current pace') : t('Needs a steady trend toward your goal')}
          />
        )}
        {goal.targetDate && goal.type !== 'maintain' && <Stat label="Your target date" value={fmtDate(parseDay(goal.targetDate))} />}
        {bmiNow !== null && (
          <Stat
            label="BMI"
            value={`${bmiNow.toFixed(1)} · ${t(bmiCategory(bmiNow))}`}
            hint={bmiStart !== null ? t('Started at {v}', { v: bmiStart.toFixed(1) }) : undefined}
          />
        )}
      </div>

      {/* add weight */}
      <div className={styles.addCard}>
        <h2 className={styles.subtitle}>{t('Log your weight')}</h2>
        <div className={styles.addRow}>
          <label className={styles.field}>
            <span>{t('Date')}</span>
            <input type="date" value={date} max={todayKey()} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label className={styles.field}>
            <span className={styles.labelRow}>
              {t('Weight')}
              <span className={styles.unitToggleSmall} role="radiogroup" aria-label={t('Weight unit')}>
                {(['kg', 'lb'] as const).map((u) => (
                  <button
                    key={u}
                    type="button"
                    role="radio"
                    aria-checked={unit === u}
                    className={unit === u ? styles.unitActive : ''}
                    onClick={() => {
                      if (u === unit) return;
                      // convert what's typed, so 80 kg becomes 176.4 lb instead of "80 lb"
                      if (value && !Number.isNaN(Number(value))) setValue(toDisplay(fromDisplay(Number(value), unit), u).toFixed(1));
                      update({ ...data, unit: u });
                    }}
                  >
                    {u}
                  </button>
                ))}
              </span>
            </span>
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              value={value}
              placeholder={toDisplay(current, unit).toFixed(1)}
              onChange={(e) => {
                const v = cleanNumber(e.target.value, 3, 1);
                if (v === null) return;
                setValue(v);
                setError(null);
              }}
              onKeyDown={(e) => e.key === 'Enter' && addWeight()}
            />
          </label>
          <button className="btn-primary" onClick={addWeight}>
            {t('Add')}
          </button>
        </div>
        <p className={styles.muted}>{t("Tip: weigh yourself at the same time each day, e.g. in the morning before eating. Logging a date again replaces that day's entry.")}</p>
        {error && <p className={styles.error}>{error}</p>}
      </div>

      {/* chart */}
      <div>
        <div className={styles.chartHead}>
          <h2 className={styles.subtitle}>{t('Progress')}</h2>
          <div className={styles.rangeToggle} role="radiogroup" aria-label={t('Time range')}>
            {RANGES.map((r) => (
              <button key={(r.label)} role="radio" aria-checked={range === r.days} className={range === r.days ? styles.unitActive : ''} onClick={() => setRange(r.days)}>
                {t(r.label)}
              </button>
            ))}
          </div>
        </div>
        <div className={styles.chartCard}>
          <WeightChart entries={entries} goalKg={goal.type === 'maintain' ? goal.goalWeightKg : goal.goalWeightKg} unit={unit} workoutDays={workoutDays} rangeDays={range} />
          <div className={styles.legend}>
            <span><i className={styles.legendDot} /> {t('weigh-in')}</span>
            <span><i className={styles.legendTrend} /> {t('7-day average')}</span>
            <span><i className={styles.legendGoal} /> {t('goal')}</span>
            <span><i className={styles.legendWorkout} /> {t('workout day')}</span>
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
            {showAll ? t('Show fewer') : t('Show all {n}', { n: listed.length })}
          </button>
        )}
      </div>

      <div>
        {confirmReset ? (
          <div className={styles.confirm}>
            <span>{t("Delete your goal and all weigh-ins? This can't be undone (export a backup in History first).")}</span>
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
              {t('Cancel')}
            </button>
          </div>
        ) : (
          <button className={styles.linkButton} onClick={() => setConfirmReset(true)}>
            {t('Reset body tracking')}
          </button>
        )}
      </div>
    </section>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className={styles.stat} title={hint ? t(hint) : undefined}>
      <span className={styles.statValue}>{value}</span>
      <span className={styles.muted}>{t(label)}</span>
      {hint && <span className={styles.statHint}>{t(hint)}</span>}
    </div>
  );
}
