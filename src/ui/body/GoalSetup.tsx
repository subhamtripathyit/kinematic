import { useMemo, useState } from 'react';
import { t } from '../../i18n';
import {
  MAX_CM,
  MAX_KG,
  MIN_CM,
  MIN_KG,
  cleanNumber,
  maxTargetDate,
  type HeightUnit,
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
  const [hUnit, setHUnit] = useState<HeightUnit>(initial?.heightUnit ?? (initialUnit === 'kg' ? 'cm' : 'ft'));
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

  /** Height unit is separate from the weight unit (kg + feet is common). Converts what's typed. */
  const switchHeightUnit = (u: HeightUnit) => {
    if (u === hUnit) return;
    const cm = heightVal;
    if (u === 'cm') setHeightCm(cm !== undefined ? String(Math.round(cm)) : '');
    else {
      const totalIn = cm !== undefined ? Math.round(cm / 2.54) : null;
      setFeet(totalIn !== null ? String(Math.floor(totalIn / 12)) : '');
      setInches(totalIn !== null ? String(totalIn % 12) : '');
    }
    setHUnit(u);
  };

  const currentKgVal = current ? fromDisplay(Number(current), unit) : NaN;
  const goalKgVal = type === 'maintain' ? currentKgVal : goal ? fromDisplay(Number(goal), unit) : NaN;
  const heightVal =
    hUnit === 'cm' ? (heightCm ? Number(heightCm) : undefined) : feet ? (Number(feet) * 12 + Number(inches || 0)) * 2.54 : undefined;

  // Shown live under each box, not only on Save.
  const inRange = (kg: number) => kg >= MIN_KG && kg <= MAX_KG;
  const rangeText = { min: formatWeight(MIN_KG, unit, 0), max: formatWeight(MAX_KG, unit, 0) };
  const currentError = current && !inRange(currentKgVal) ? t('Enter your current weight ({min} – {max}).', rangeText) : null;
  const goalError = type !== 'maintain' && goal && !inRange(goalKgVal) ? t('Enter a goal weight ({min} – {max}).', rangeText) : null;
  const heightError =
    heightVal !== undefined && (heightVal < MIN_CM || heightVal > MAX_CM || Number(inches || 0) > 11)
      ? t('Height looks off. Check the number (100–250 cm, or about 3′3″ – 8′2″).')
      : null;
  const latestTarget = maxTargetDate();
  const targetError = !target
    ? null
    : target <= todayKey()
      ? t('The target date must be in the future.')
      : target > latestTarget
        ? t('Pick a target date within {n} years.', { n: 10 })
        : null;

  const numbersOk = Number.isFinite(currentKgVal) && Number.isFinite(goalKgVal);
  const suggestion = numbersOk ? suggestedTargetDate(type, currentKgVal, goalKgVal) : null;
  const check = numbersOk && target ? paceCheck(type, currentKgVal, goalKgVal, target) : null;
  const goalBmi = numbersOk ? bmi(goalKgVal, heightVal) : null;

  const directionError = useMemo(() => {
    if (!numbersOk || type === 'maintain') return null;
    if (type === 'lose' && goalKgVal >= currentKgVal) return t('For a weight-loss goal, the goal weight must be below your current weight.');
    if (type === 'gain' && goalKgVal <= currentKgVal) return t('For a weight-gain goal, the goal weight must be above your current weight.');
    return null;
  }, [numbersOk, type, goalKgVal, currentKgVal]);

  const save = () => {
    if (!Number.isFinite(currentKgVal) || !inRange(currentKgVal)) return setError(t('Enter your current weight ({min} – {max}).', rangeText));
    if (type !== 'maintain' && (!Number.isFinite(goalKgVal) || !inRange(goalKgVal))) {
      return setError(t('Enter a goal weight ({min} – {max}).', rangeText));
    }
    if (directionError) return setError(directionError);
    if (heightError) return setError(heightError);
    if (targetError) return setError(targetError);
    onSave(
      {
        type,
        startWeightKg: initial && initial.type === type ? initial.startWeightKg : currentKgVal,
        goalWeightKg: goalKgVal,
        startDate: initial && initial.type === type ? initial.startDate : todayKey(),
        targetDate: target || undefined,
        heightCm: heightVal,
        heightUnit: hUnit,
      },
      unit,
      currentKgVal,
    );
  };

  return (
    <section className={styles.card}>
      <div className={styles.headRow}>
        <h1 className={styles.title}>{initial ? t('Edit your goal') : t('Set your body goal')}</h1>
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
          <span className={styles.labelRow}>
            {t('Current weight')}
            {/* one switch for both weights: goal weight always uses the same unit */}
            <span className={styles.unitToggleSmall} role="radiogroup" aria-label={t('Weight unit')}>
              {(['kg', 'lb'] as const).map((u) => (
                <button key={u} type="button" role="radio" aria-checked={unit === u} className={unit === u ? styles.unitActive : ''} onClick={() => switchUnit(u)}>
                  {u}
                </button>
              ))}
            </span>
          </span>
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            min={Math.round(toDisplay(MIN_KG, unit))}
            max={Math.round(toDisplay(MAX_KG, unit))}
            value={current}
            onChange={(e) => {
              const v = cleanNumber(e.target.value, 3, 1);
              if (v === null) return;
              setCurrent(v);
              setError(null);
            }}
          />
          {currentError && <span className={styles.fieldError}>{currentError}</span>}
        </label>
        {type !== 'maintain' && (
          <label className={styles.field}>
            <span className={styles.labelRow}>
              {t('Goal weight')}
              <span className={styles.unitTag}>{unit}</span>
            </span>
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              min={Math.round(toDisplay(MIN_KG, unit))}
              max={Math.round(toDisplay(MAX_KG, unit))}
              value={goal}
              onChange={(e) => {
                const v = cleanNumber(e.target.value, 3, 1);
                if (v === null) return;
                setGoal(v);
                setError(null);
              }}
            />
            {(goalError ?? directionError) && <span className={styles.fieldError}>{goalError ?? directionError}</span>}
          </label>
        )}
        <div className={styles.field}>
          <span className={styles.labelRow}>
            {t('Height (optional)')}
            <span className={styles.unitToggleSmall} role="radiogroup" aria-label={t('Height unit')}>
              {(['cm', 'ft'] as const).map((u) => (
                <button key={u} type="button" role="radio" aria-checked={hUnit === u} className={hUnit === u ? styles.unitActive : ''} onClick={() => switchHeightUnit(u)}>
                  {u === 'cm' ? 'cm' : 'ft / in'}
                </button>
              ))}
            </span>
          </span>
          {hUnit === 'cm' ? (
            <input
              type="number"
              inputMode="numeric"
              min={MIN_CM}
              max={MAX_CM}
              aria-label={t('Height (cm, optional)')}
              value={heightCm}
              onChange={(e) => {
                const v = cleanNumber(e.target.value, 3, 0);
                if (v !== null) setHeightCm(v);
              }}
            />
          ) : (
            <div className={styles.feetInches}>
              <input type="number" inputMode="numeric" min={3} max={8} placeholder={t('ft')} aria-label={t('Feet')} value={feet} onChange={(e) => { const v = cleanNumber(e.target.value, 1, 0); if (v !== null) setFeet(v); }} />
              <input type="number" inputMode="numeric" min={0} max={11} placeholder={t('in')} aria-label={t('Inches')} value={inches} onChange={(e) => { const v = cleanNumber(e.target.value, 2, 0); if (v !== null) setInches(v); }} />
            </div>
          )}
          {heightError && <span className={styles.fieldError}>{heightError}</span>}
        </div>
        {type !== 'maintain' && (
          <label className={styles.field}>
            <span>{t('Target date (optional)')}</span>
            <input type="date" value={target} min={todayKey()} max={latestTarget} onChange={(e) => { setTarget(e.target.value); setError(null); }} />
            {targetError && <span className={styles.fieldError}>{targetError}</span>}
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
