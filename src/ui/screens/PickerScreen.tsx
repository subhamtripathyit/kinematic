import { useState } from 'react';
import { exercisesByCategory, type Category } from '../../engine/exercises';
import styles from './PickerScreen.module.css';

type Filter = Category | 'all';

export function PickerScreen({ onSelect }: { onSelect: (exerciseId: string) => void }) {
  const [filter, setFilter] = useState<Filter>('all');
  const groups = exercisesByCategory();
  const visible = filter === 'all' ? groups : groups.filter((g) => g.id === filter);

  return (
    <section className={styles.screen}>
      <h1 className={styles.title}>Choose an exercise</h1>
      <p className={styles.subtitle}>
        Kinematic counts your reps and checks your form in real time. Your video never leaves your laptop.
      </p>

      <div className={styles.chips} role="tablist" aria-label="Filter by body part">
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
            {g.label}
            <span className={styles.chipCount}>{g.exercises.length}</span>
          </button>
        ))}
      </div>

      {visible.map((group) => (
        <div key={group.id} className={styles.group}>
          <h2 className={styles.groupTitle}>{group.label}</h2>
          <div className={styles.grid}>
            {group.exercises.map((ex) => (
              <button key={ex.id} className={styles.card} onClick={() => onSelect(ex.id)}>
                <span className={styles.name}>{ex.name}</span>
                <span className={styles.badges}>
                  <span className={styles.view}>{ex.cameraView === 'side' ? 'Side view' : 'Front view'}</span>
                  {ex.kind === 'hold' && <span className={styles.timed}>Timed hold</span>}
                </span>
                <span className={styles.hint}>{ex.setupHint}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
