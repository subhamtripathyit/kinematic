import { useState } from 'react';
import { t } from '../../i18n';
import { exercisesByCategory, type Category, type ExerciseDefinition } from '../../engine/exercises';
import { COMING_SOON, GYM_EXERCISE_IDS } from '../../engine/exercises/comingSoon';
import { loadHistory } from '../../state/history';
import { currentStreak, workoutsThisWeek } from '../../state/progress';
import { daysSinceLastWeighIn, loadBody } from '../../state/body';
import styles from './PickerScreen.module.css';

type Filter = Category | 'all';

export function PickerScreen({
  onSelect,
  weeklyGoal,
  onOpenBody,
}: {
  onSelect: (exerciseId: string) => void;
  weeklyGoal: number;
  onOpenBody: () => void;
}) {
  const [filter, setFilter] = useState<Filter>('all');
  const [progress] = useState(() => {
    const history = loadHistory();
    const body = loadBody();
    const sinceWeighIn = body.goal ? daysSinceLastWeighIn(body) : null;
    return {
      streak: currentStreak(history),
      week: workoutsThisWeek(history),
      weighInDue: body.goal !== null && (sinceWeighIn === null || sinceWeighIn >= 7),
    };
  });
  const groups = exercisesByCategory();
  const visible = filter === 'all' ? groups : groups.filter((g) => g.id === filter);

  return (
    <section className={styles.screen}>
      {/* shown from the very first visit (0-day streak, 0/3 this week), so new users see the goal */}
      {(
        <div className={styles.progressChip}>
          <span>🔥 {t('{n}-day streak', { n: progress.streak })}</span>
          <span>
            · {t('{done}/{goal} workout days this week', { done: progress.week, goal: weeklyGoal })}
            {progress.week >= weeklyGoal ? ' ✓' : ''}
          </span>
        </div>
      )}
      {progress.weighInDue && (
        <button className={styles.weighIn} onClick={onOpenBody}>
          {t('⚖️ Time for a weigh-in. Log your weight →')}
        </button>
      )}
      <h1 className={styles.title}>{t('Choose an exercise')}</h1>
      <p className={styles.subtitle}>
        {t('Kinematic counts your reps and checks your form in real time. Your video never leaves your device.')}
      </p>

      <div className={styles.chips} role="tablist" aria-label={t('Filter by body part')}>
        <button
          role="tab"
          aria-selected={filter === 'all'}
          className={`${styles.chip} ${filter === 'all' ? styles.chipActive : ''}`}
          onClick={() => setFilter('all')}
        >
          All
        </button>
        {groups.map((g) => (
          <button
            key={g.id}
            role="tab"
            aria-selected={filter === g.id}
            className={`${styles.chip} ${filter === g.id ? styles.chipActive : ''}`}
            onClick={() => setFilter(g.id)}
          >
            {t(g.label)}
            <span className={styles.chipCount}>{g.exercises.length}</span>
          </button>
        ))}
      </div>

      {visible.map((group) => {
        // Each body part: "Bodyweight" and "Gym" (weights + machines). Gym exercises not built yet show as "Coming soon".
        const bodyweight = group.exercises.filter((ex) => !GYM_EXERCISE_IDS.has(ex.id));
        const gym = group.exercises.filter((ex) => GYM_EXERCISE_IDS.has(ex.id));
        const soon = COMING_SOON.filter((c) => c.category === group.id);
        const hasGym = gym.length + soon.length > 0;
        return (
          <div key={group.id} className={styles.group}>
            <h2 className={styles.groupTitle}>{t(group.label)}</h2>
            {bodyweight.length > 0 && (
              <>
                {hasGym && <h3 className={styles.subGroupTitle}>{t('Bodyweight')}</h3>}
                <div className={styles.grid}>
                  {bodyweight.map((ex) => (
                    <ExerciseCard key={ex.id} ex={ex} onSelect={onSelect} />
                  ))}
                </div>
              </>
            )}
            {hasGym && (
              <>
                <h3 className={styles.subGroupTitle}>{t('Gym')}</h3>
                <div className={styles.grid}>
                  {gym.map((ex) => (
                    <ExerciseCard key={ex.id} ex={ex} onSelect={onSelect} />
                  ))}
                  {soon.map((c) => (
                    <div key={c.name} className={`${styles.card} ${styles.soonCard}`} aria-disabled="true">
                      <span className={styles.name}>{t(c.name)}</span>
                      <span className={styles.badges}>
                        <span className={styles.soon}>{t('Coming soon')}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        );
      })}
    </section>
  );
}

function ExerciseCard({ ex, onSelect }: { ex: ExerciseDefinition; onSelect: (exerciseId: string) => void }) {
  return (
    <button className={styles.card} onClick={() => onSelect(ex.id)}>
      <span className={styles.name}>{t(ex.name)}</span>
      <span className={styles.badges}>
        <span className={styles.view}>{ex.cameraView === 'side' ? t('Side view') : t('Front view')}</span>
        {ex.kind === 'hold' && <span className={styles.timed}>{t('Timed hold')}</span>}
      </span>
      <span className={styles.hint}>{t(ex.setupHint)}</span>
    </button>
  );
}
