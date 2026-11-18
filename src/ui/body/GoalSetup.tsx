import { useMemo, useState } from 'react';
import { t } from '../../i18n';
import {
  MAX_KG,
  MIN_KG,
  bmi,
  bmiCategory,
  formatWeight,
  fromDisplay,
  paceCheck,
  parseDay,
  suggestedTargetDate,
  toDisplay,
  todayKey,
  type BodyGoal,
  type GoalType,
  type WeightUnit,
} from '../../state/body';
import styles from './Body.module.css';

interface Props {
  unit: WeightUnit;
  initial: BodyGoal | null;
  /** latest logged weight, used as "current weight" when editing a goal */
  currentKg: number | null;
  onSave: (goal: BodyGoal, unit: WeightUnit, currentKg: number) => void;
  onCancel?: () => void;
}

const GOALS: { id: GoalType; label: string; hint: string }[] = [
  { id: 'lose', label: 'Lose weight', hint: 'Burn fat, get leaner' },
  { id: 'gain', label: 'Gain weight', hint: 'Build size and muscle' },
  { id: 'maintain', label: 'Maintain', hint: 'Stay where you are' },
];

const fmtDate = (key: string) => parseDay(key).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

/** First-time setup (or edit): goal type, height, current and goal weight, optional target date. */
export function GoalSetup({ unit: initialUnit, initial, currentKg, onSave, onCancel }: Props) {
  const [unit, setUnit] = useState<WeightUnit>(initialUnit);
  const [type, setType] = useState<GoalType>(initial?.type ?? 'lose');
  const startKg = currentKg ?? initial?.startWeightKg ?? null;
  const [current, setCurrent] = useState(startKg ? toDisplay(startKg, initialUnit).toFixed(1) : '');
  const [goal, setGoal] = useState(initial ? toDisplay(initial.goalWeightKg, initialUnit).toFixed(1) : '');
  const [heightCm, setHeightCm] = useState(initial?.heightCm ? String(Math.round(initial.heightCm)) : '');
  const [feet, setFeet] = useState(initial?.heightCm ? String(Math.floor(initial.heightCm / 2.54 / 12)) : '');
  const [inches, setInches] = useState(initial?.heightCm ? String(Math.round((initial.heightCm / 2.54) % 12)) : '');
  const [target, setTarget] = useState(initial?.targetDate ?? '');
  const [error, setError] = useState<string | null>(null);

  const switchUnit = (u: WeightUnit) => {
    if (u === unit) return;
    const conv = (s: string) => (s && !Number.isNaN(Number(s)) ? toDisplay(fromDisplay(Number(s), unit), u).toFixed(1) : s);
    setCurrent(conv(current));
    setGoal(conv(goal));
    setUnit(u);
  };

  const currentKgVal = current ? fromDisplay(Number(current), unit) : NaN;
  const goalKgVal = type === 'maintain' ? currentKgVal : goal ? fromDisplay(Number(goal), unit) : NaN;
  const heightVal =
    unit === 'kg' ? (heightCm ? Number(heightCm) : undefined) : feet ? (Number(feet) * 12 + Number(inches || 0)) * 2.54 : undefined;

  const numbersOk = Number.isFinite(currentKgVal) && Number.isFinite(goalKgVal);
  const suggestion = numbersOk ? suggestedTargetDate(type, currentKgVal, goalKgVal) : null;
  const check = numbersOk && target ? paceCheck(type, currentKgVal, goalKgVal, target) : null;
  const goalBmi = numbersOk ? bmi(goalKgVal, heightVal) : null;

  const directionError = useMemo(() => {
    if (!numbersOk || type === 'maintain') return null;
    if (type === 'lose' && goalKgVal >= currentKgVal) return 'For a weight-loss goal, the goal weight must be below your current weight.';
    if (type === 'gain' && goalKgVal <= currentKgVal) return 'For a weight-gain goal, the goal weight must be above your current weight.';
    return null;
  }, [numbersOk, type, goalKgVal, currentKgVal]);

  const save = () => {
    const inRange = (kg: number) => kg >= MIN_KG && kg <= MAX_KG;
    if (!Number.isFinite(currentKgVal) || !inRange(currentKgVal)) {
      return setError(t('Enter your current weight ({min} – {max}).', { min: formatWeight(MIN_KG, unit, 0), max: formatWeight(MAX_KG, unit, 0) }));
    }
    if (type !== 'maintain' && (!Number.isFinite(goalKgVal) || !inRange(goalKgVal))) {
      return setError(t('Enter a goal weight ({min} – {max}).', { min: formatWeight(MIN_KG, unit, 0), max: formatWeight(MAX_KG, unit, 0) }));
    }
    if (directionError) return setError(directionError);
    if (heightVal !== undefined && (heightVal < 100 || heightVal > 250)) {
      return setError(t('Height looks off. Check the number (100–250 cm, or about 3′3″ – 8′2″).'));
    }
    if (target && target <= todayKey()) return setError(t('The target date must be in the future.'));
    onSave(
      {
        type,
        startWeightKg: initial && initial.type === type ? initial.startWeightKg : currentKgVal,
        goalWeightKg: goalKgVal,
        startDate: initial && initial.type === type ? initial.startDate : todayKey(),
        targetDate: target || undefined,
        heightCm: heightVal,
      },
      unit,
      currentKgVal,
    );
  };

  return (
    <section className={styles.card}>
      <div className={styles.headRow}>
        <h1 className={styles.title}>{initial ? t('Edit your goal') : t('Set your body goal')}</h1>
        <div className={styles.unitToggle} role="radiogroup" aria-label={t('Units')}>
          {(['kg', 'lb'] as const).map((u) => (
            <button key={u} role="radio" aria-checked={unit === u} className={unit === u ? styles.unitActive : ''} onClick={() => switchUnit(u)}>
              {u}
            </button>
          ))}
        </div>
      </div>
      <p className={styles.muted}>{t('Saved only on this device. You can change it anytime.')}</p>

      <div className={styles.goalTypes} role="radiogroup" aria-label={t('Goal')}>
        {GOALS.map((g) => (
          <button
            key={g.id}
            role="radio"
            aria-checked={type === g.id}
            className={`${styles.goalType} ${type === g.id ? styles.goalTypeActive : ''}`}
            onClick={() => {
              setType(g.id);
              setError(null);
            }}
          >
            <span className={styles.goalLabel}>{t(g.label)}</span>
            <span className={styles.muted}>{t(g.hint)}</span>
          </button>
        ))}
      </div>

      <div className={styles.fields}>
        <label className={styles.field}>
          <span>{t('Current weight')} ({unit})</span>
          <input type="number" inputMode="decimal" step="0.1" value={current} onChange={(e) => { setCurrent(e.target.value); setError(null); }} />
        </label>
        {type !== 'maintain' && (
          <label className={styles.field}>
            <span>{t('Goal weight')} ({unit})</span>
            <input type="number" inputMode="decimal" step="0.1" value={goal} onChange={(e) => { setGoal(e.target.value); setError(null); }} />
          </label>
        )}
        {unit === 'kg' ? (
          <label className={styles.field}>
            <span>{t('Height (cm, optional)')}</span>
            <input type="number" inputMode="numeric" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} />
          </label>
        ) : (
          <div className={styles.field}>
            <span>{t('Height (optional)')}</span>
            <div className={styles.feetInches}>
              <input type="number" inputMode="numeric" placeholder={t('ft')} aria-label={t('Feet')} value={feet} onChange={(e) => setFeet(e.target.value)} />
              <input type="number" inputMode="numeric" placeholder={t('in')} aria-label={t('Inches')} value={inches} onChange={(e) => setInches(e.target.value)} />
            </div>
          </div>
        )}
        {type !== 'maintain' && (
          <label className={styles.field}>
            <span>{t('Target date (optional)')}</span>
            <input type="date" value={target} min={todayKey()} onChange={(e) => { setTarget(e.target.value); setError(null); }} />
          </label>
        )}
      </div>

      {type !== 'maintain' && numbersOk && !directionError && (
        <div className={styles.note}>
          {check?.tooFast ? (
            <>
              <strong className={styles.warnText}>{t("That's faster than is healthy.")}</strong> It needs about{' '}
              {formatWeight(check.requiredPerWeek, unit)} per week; a safe pace is up to {formatWeight(check.safePerWeek, unit)} per week.
              {check.suggestedDate && <> {t('A realistic target is around')} <strong>{fmtDate(check.suggestedDate)}</strong>.</>}
              {check.suggestedDate && (
                <button className={styles.linkButton} onClick={() => setTarget(check.suggestedDate ?? '')}>
                  {t('Use this date')}
                </button>
              )}
            </>
          ) : check ? (
            <>
              {t('Needs about')} <strong>{formatWeight(check.requiredPerWeek, unit)} per week</strong>{t(': a healthy pace. 👍')}
            </>
          ) : suggestion ? (
            <>
              {t("At a steady, healthy pace you'd get there around")} <strong>{fmtDate(suggestion)}</strong>.
              <button className={styles.linkButton} onClick={() => setTarget(suggestion)}>
                {t('Use as target date')}
              </button>
            </>
          ) : null}
        </div>
      )}
      {goalBmi !== null && goalBmi < 18.5 && type !== 'gain' && (
        <p className={styles.warnText}>
          That goal weight would be below a healthy BMI for your height ({goalBmi.toFixed(1)}, {bmiCategory(goalBmi)}). Consider a
          higher goal, or talk to a doctor first.
        </p>
      )}

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.actions}>
        {onCancel && (
          <button className="btn-secondary" onClick={onCancel}>
            {t('Cancel')}
          </button>
        )}
        <button className="btn-primary" onClick={save}>
          {initial ? t('Save goal') : t('Start tracking')}
        </button>
      </div>
    </section>
  );
}
