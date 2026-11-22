import { useState } from 'react';
import { t } from '../../i18n';
import { CATEGORIES, getExercise, isHold } from '../../engine/exercises';
import type { WorkoutPlan } from '../../state/workoutSession';
import type { CameraFacing } from '../../engine/camera';
import { CameraPicker } from '../components/CameraPicker';
import { StartPicker } from '../components/StartPicker';
import type { StartMode } from '../../state/settings';
import { FormDemo } from '../demo/FormDemo';
import { VoiceToggle } from '../components/VoiceToggle';
import { RecordToggle } from '../components/RecordToggle';
import styles from './SetupScreen.module.css';

interface Props {
  exerciseId: string;
  initialPlan: WorkoutPlan;
  voiceEnabled: boolean;
  voiceSupported: boolean;
  onToggleVoice: () => void;
  camera: CameraFacing;
  onCameraChange: (camera: CameraFacing) => void;
  startMode: StartMode;
  countdownSec: number;
  onStartModeChange: (mode: StartMode, seconds: number) => void;
  record: boolean;
  onRecordChange: (record: boolean) => void;
  onStart: (plan: WorkoutPlan) => void;
  onBack: () => void;
}

const REST_OPTIONS = [0, 30, 45, 60, 90, 120, 180, 240, 300];

/** Choose sets, target and rest before starting. */
export function SetupScreen({
  exerciseId,
  initialPlan,
  voiceEnabled,
  voiceSupported,
  onToggleVoice,
  camera,
  onCameraChange,
  startMode,
  countdownSec,
  onStartModeChange,
  record,
  onRecordChange,
  onStart,
  onBack,
}: Props) {
  const exercise = getExercise(exerciseId);
  const hold = isHold(exercise);
  const category = CATEGORIES.find((c) => c.id === exercise.category)?.label;

  const [mode, setMode] = useState<WorkoutPlan['mode']>(initialPlan.mode);
  const [sets, setSets] = useState(String(initialPlan.sets));
  const [target, setTarget] = useState(String(initialPlan.target));
  const [rest, setRest] = useState(initialPlan.restSec);
  const [error, setError] = useState<string | null>(null);
  const [showDemo, setShowDemo] = useState(false);

  const limits = hold ? { min: 5, max: 600 } : { min: 1, max: 100 };

  const start = () => {
    if (mode === 'free') {
      // Keep the last sets/target so switching back to "Sets & reps" remembers them.
      onStart({ mode: 'free', sets: initialPlan.sets, target: initialPlan.target, restSec: 0 });
      return;
    }
    const s = Number(sets);
    const targetNum = Number(target);
    if (!Number.isInteger(s) || s < 1 || s > 10) {
      setError(t('Sets must be a whole number from 1 to 10.'));
      return;
    }
    if (!Number.isInteger(targetNum) || targetNum < limits.min || targetNum > limits.max) {
      setError(
        hold
          ? t('Hold time must be a whole number from {min} to {max} seconds.', { min: limits.min, max: limits.max })
          : t('Reps must be a whole number from {min} to {max}.', { min: limits.min, max: limits.max }),
      );
      return;
    }
    onStart({ mode: 'plan', sets: s, target: targetNum, restSec: rest });
  };

  return (
    <section className={styles.card}>
      <div>
        <p className={styles.eyebrow}>
          {category ? t(category) : ''} · {exercise.cameraView === 'side' ? t('Side view') : t('Front view')}
          {hold ? ' · Timed hold' : ''}
        </p>
        <h1 className={styles.title}>{t(exercise.name)}</h1>
        <p className={styles.hint}>{t(exercise.setupHint)}</p>
        <button className={styles.demoButton} onClick={() => setShowDemo((v) => !v)} aria-expanded={showDemo}>
          {showDemo ? t('Hide demo') : t('How to do it')}
        </button>
      </div>

      {showDemo && <FormDemo exerciseId={exerciseId} speakOnOpen={voiceEnabled && voiceSupported} />}

      <div className={styles.modes} role="radiogroup" aria-label={t('Workout type')}>
        <button
          role="radio"
          aria-checked={mode === 'plan'}
          className={`${styles.mode} ${mode === 'plan' ? styles.modeActive : ''}`}
          onClick={() => setMode('plan')}
        >
          <span className={styles.modeTitle}>Sets &amp; {hold ? 'time' : 'reps'}</span>
          <span className={styles.modeHint}>
            {hold ? 'e.g. 3 holds of 30 seconds' : 'e.g. 3 sets of 10'}, with a rest timer
          </span>
        </button>
        <button
          role="radio"
          aria-checked={mode === 'free'}
          className={`${styles.mode} ${mode === 'free' ? styles.modeActive : ''}`}
          onClick={() => {
            setMode('free');
            setError(null);
          }}
        >
          <span className={styles.modeTitle}>{t('Free workout')}</span>
          <span className={styles.modeHint}>{hold ? t('Hold as long as you can') : t('As many reps as you want')}, no target</span>
        </button>
      </div>

      {mode === 'free' ? (
        <p className={styles.freeNote}>
          {hold ? t('The timer runs as long as your form is good.') : t('Every rep is counted, with no limit.')} Press{' '}
          <strong>{t('Finish set')}</strong> {t('to log a set and start the next one, and')} <strong>{t('End workout')}</strong> {t("when you're done.")}
        </p>
      ) : (
      <div className={styles.fields}>
        <label className={styles.field}>
          <span>{t('Sets')}</span>
          <input
            type="number"
            min={1}
            max={10}
            value={sets}
            onChange={(e) => {
              setSets(e.target.value);
              setError(null);
            }}
          />
        </label>
        <label className={styles.field}>
          <span>{hold ? t('Seconds per set') : t('Reps per set')}</span>
          <input
            type="number"
            min={limits.min}
            max={limits.max}
            value={target}
            onChange={(e) => {
              setTarget(e.target.value);
              setError(null);
            }}
          />
        </label>
        <label className={styles.field}>
          <span>{t('Rest between sets')}</span>
          <select value={rest} onChange={(e) => setRest(Number(e.target.value))}>
            {REST_OPTIONS.map((sec) => (
              <option key={sec} value={sec}>
                {sec === 0 ? t('No rest') : t('{n} seconds', { n: sec })}
              </option>
            ))}
          </select>
        </label>
      </div>
      )}

      <CameraPicker value={camera} onChange={onCameraChange} />
      <StartPicker mode={startMode} seconds={countdownSec} onChange={onStartModeChange} />

      <VoiceToggle enabled={voiceEnabled} supported={voiceSupported} onToggle={onToggleVoice} />
      <RecordToggle enabled={record} onChange={onRecordChange} />

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.actions}>
        <button className="btn-secondary" onClick={onBack}>
          {t('Back')}
        </button>
        <button className="btn-primary" onClick={start}>
          {t('Start workout')}
        </button>
      </div>
    </section>
  );
}
