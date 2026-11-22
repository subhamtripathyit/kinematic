import { useState } from 'react';
import { t } from '../../i18n';
import { exerciseKind, EXERCISES } from '../../engine/exercises';
import { describePlan } from '../../state/session';
import { scaleRoutine, suitsLevel, type Routine } from '../../state/routines';
import { getExercise, isHold } from '../../engine/exercises';
import type { Level } from '../../engine/exercises/levels';
import { LevelPicker } from '../components/LevelPicker';
import styles from './RoutinesScreen.module.css';

interface Props {
  builtIn: Routine[];
  custom: Routine[];
  onStart: (routine: Routine) => void;
  onNew: () => void;
  onEdit: (routine: Routine) => void;
  onCopy: (routine: Routine) => void;
  onDelete: (id: string) => void;
  /** training level; undefined until picked (routines then run as level 3) */
  level?: Level;
  onLevelChange: (level: Level) => void;
}

/** List of routines: built-in ones and the user's own. */
export function RoutinesScreen({ builtIn, custom, onStart, onNew, onEdit, onCopy, onDelete, level, onLevelChange }: Props) {
  // built-in routines, sized for the user's level; the ones that suit the level come first
  const effective: Level = level ?? 3;
  const holdId = (id: string) => isHold(getExercise(id));
  const scaled = builtIn.map((r) => scaleRoutine(r, effective, holdId));
  const recommended = scaled.filter((r) => suitsLevel(r, effective));
  const others = scaled.filter((r) => !suitsLevel(r, effective));

  return (
    <section className={styles.screen}>
      <div className={styles.top}>
        <div>
          <h1 className={styles.title}>{t('Routines')}</h1>
          <p className={styles.muted}>
            {t('A routine runs several exercises back to back, with rest in between. For a single exercise, use the Exercises tab.')}
          </p>
        </div>
        <button className="btn-primary" onClick={onNew}>
          {t('New routine')}
        </button>
      </div>

      <LevelPicker level={level} onChange={onLevelChange} />

      <h2 className={styles.groupTitle}>{t('Recommended for level {n}', { n: effective })}</h2>
      <p className={styles.muted}>{t('Sets, reps and rest are adjusted to your level.')}</p>
      <div className={styles.grid}>
        {recommended.map((r) => (
          <RoutineCard key={r.id} routine={r} onStart={onStart} onCopy={onCopy} />
        ))}
      </div>

      <h2 className={styles.groupTitle}>{t('My routines')}</h2>
      {custom.length === 0 ? (
        <p className={styles.muted}>
          {t("You haven't made any yet. Create one, or press")} <strong>{t('Customize')}</strong> {t('on a built-in routine to make your own version of it.')}
        </p>
      ) : (
        <div className={styles.grid}>
          {custom.map((r) => (
            <RoutineCard key={r.id} routine={r} onStart={onStart} onEdit={onEdit} onCopy={onCopy} onDelete={onDelete} />
          ))}
        </div>
      )}

      {others.length > 0 && (
        <>
          <h2 className={styles.groupTitle}>{t('More routines')}</h2>
          <div className={styles.grid}>
            {others.map((r) => (
              <RoutineCard key={r.id} routine={r} onStart={onStart} onCopy={onCopy} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function RoutineCard({
  routine,
  onStart,
  onEdit,
  onCopy,
  onDelete,
}: {
  routine: Routine;
  onStart: (r: Routine) => void;
  onEdit?: (r: Routine) => void;
  onCopy: (r: Routine) => void;
  onDelete?: (id: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const steps = routine.steps
    .map((s) => {
      const def = EXERCISES.find((e) => e.id === s.exerciseId);
      return def ? `${t(def.name)} ${describePlan(exerciseKind(def), s.plan)}` : null;
    })
    .filter((x): x is string => x !== null);

  return (
    <div className={styles.card}>
      <div>
        <h3 className={styles.name}>{t(routine.name)}</h3>
        {routine.description && <p className={styles.muted}>{t(routine.description)}</p>}
      </div>
      <ol className={styles.steps}>
        {steps.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ol>
      <p className={styles.meta}>
        {t('{n} exercises · {s}s rest between exercises', { n: steps.length, s: routine.restBetweenSec })}
      </p>
      <div className={styles.actions}>
        <button className="btn-primary" onClick={() => onStart(routine)} disabled={steps.length === 0}>
          {t('Start')}
        </button>
        {onEdit && (
          <button className="btn-secondary" onClick={() => onEdit(routine)}>
            {t('Edit')}
          </button>
        )}
        <button
          className="btn-secondary"
          onClick={() => onCopy(routine)}
          title={
            routine.builtIn
              ? t('Built-in routines stay as they are. This makes your own version that you can change.')
              : t('Make a duplicate of this routine')
          }
        >
          {routine.builtIn ? t('Customize') : t('Duplicate')}
        </button>
      </div>
      {onDelete &&
        (confirming ? (
          <div className={styles.confirm}>
            <span>{t('Delete this routine?')}</span>
            <button className={styles.link} onClick={() => onDelete(routine.id)}>
              {t('Yes, delete')}
            </button>
            <button className={styles.link} onClick={() => setConfirming(false)}>
              {t('Cancel')}
            </button>
          </div>
        ) : (
          <button className={styles.link} onClick={() => setConfirming(true)}>
            {t('Delete')}
          </button>
        ))}
    </div>
  );
}
