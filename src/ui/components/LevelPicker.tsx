import { useState } from 'react';
import { t } from '../../i18n';
import { LEVELS, levelInfo, type Level } from '../../engine/exercises/levels';
import styles from './LevelPicker.module.css';

interface Props {
  /** undefined = not picked yet */
  level?: Level;
  onChange: (level: Level) => void;
}

/** "Your level" card on the Routines tab, with the 6 levels to choose from. */
export function LevelPicker({ level, onChange }: Props) {
  const [open, setOpen] = useState(level === undefined);
  const current = level ? levelInfo(level) : null;

  return (
    <div className={styles.card}>
      <div className={styles.head}>
        <div>
          <p className={styles.label}>{t('Your level')}</p>
          {current ? (
            <p className={styles.current}>
              {t('Level {n}', { n: current.id })} · {t(current.name)} <span className={styles.muted}>({t(current.experience)})</span>
            </p>
          ) : (
            <p className={styles.current}>{t('Pick your level so routines fit you')}</p>
          )}
          {current && <p className={styles.muted}>{t(current.effect)}</p>}
        </div>
        {current && (
          <button className="btn-secondary" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
            {open ? t('Close') : t('Change')}
          </button>
        )}
      </div>

      {open && (
        <>
          <div className={styles.grid} role="radiogroup" aria-label={t('Your level')}>
            {LEVELS.map((l) => (
              <button
                key={l.id}
                role="radio"
                aria-checked={l.id === level}
                className={`${styles.option} ${l.id === level ? styles.selected : ''}`}
                onClick={() => {
                  onChange(l.id);
                  setOpen(false);
                }}
              >
                <span className={styles.optionTitle}>
                  {l.id}. {t(l.name)}
                </span>
                <span className={styles.muted}>({t(l.experience)})</span>
                <span className={styles.effect}>{t(l.effect)}</span>
              </button>
            ))}
          </div>
          <p className={styles.muted}>
            {t('Experience means training regularly, about 3 times a week. Pick what feels right; you can change it anytime. Levels apply to routines only.')}
          </p>
        </>
      )}
    </div>
  );
}
