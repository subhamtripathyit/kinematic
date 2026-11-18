import { useEffect, useMemo, useState } from 'react';
import { t } from '../../i18n';
import { getExercise } from '../../engine/exercises';
import { VoiceCoach } from '../../engine/voice';
import { DEMOS } from './demos';
import { GROUND_Y, HEAD_R, buildSkeleton, lerpPose, place, type Skeleton } from './rig';
import styles from './FormDemo.module.css';

interface Props {
  exerciseId: string;
  /** read the how-to and mistakes aloud when opened (if the voice coach is on) */
  speakOnOpen: boolean;
}

/** "How to do it": animated stick figure doing the movement, plus common mistakes. */
export function FormDemo({ exerciseId, speakOnOpen }: Props) {
  const demo = DEMOS[exerciseId];
  const exercise = getExercise(exerciseId);
  const [progress, setProgress] = useState(0);
  const [voice] = useState(() => new VoiceCoach(true));

  const script = demo
    ? `${t('How to do {name}.', { name: t(exercise.name) })} ${t(demo.howTo)} ${t('Common mistakes')}: ${demo.mistakes.map((m) => t(m)).join('. ')}.`
    : '';

  // Animate: smooth back-and-forth between the two key poses.
  useEffect(() => {
    if (!demo) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setProgress(demo.hold ? 0 : 1);
      return;
    }
    let id = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const phase = ((now - start) % demo.periodMs) / demo.periodMs;
      setProgress((1 - Math.cos(phase * 2 * Math.PI)) / 2);
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [demo]);

  useEffect(() => {
    if (speakOnOpen && script) voice.say(script, { interrupt: true });
    return () => voice.stop();
  }, [speakOnOpen, script, voice]);

  const skeleton = useMemo<Skeleton | null>(() => {
    if (!demo) return null;
    const pose = lerpPose(demo.frames[0], demo.frames[1], progress);
    return place(buildSkeleton(pose), demo.placement);
  }, [demo, progress]);

  if (!demo || !skeleton) return <p className={styles.muted}>{t('No demo for this exercise yet.')}</p>;

  const p = skeleton.points;
  const anchor = p.wrist ?? p.wL;

  return (
    <div className={styles.wrap}>
      <svg viewBox="0 0 240 200" className={styles.svg} role="img" aria-label={`${t(exercise.name)} demonstration`}>
        {demo.placement.y.mode === 'ground' && (
          <line x1={8} x2={232} y1={GROUND_Y + 3} y2={GROUND_Y + 3} className={styles.floor} />
        )}
        {demo.props?.includes('wall') && p.hip && (
          <line x1={p.hip.x - 8} x2={p.hip.x - 8} y1={30} y2={GROUND_Y + 3} className={styles.floor} />
        )}
        {demo.props?.includes('bar') && anchor && (
          <line x1={40} x2={200} y1={anchor.y - 3} y2={anchor.y - 3} className={styles.bar} />
        )}
        {demo.props?.includes('bars') && anchor && (
          <>
            <line x1={anchor.x - 40} x2={anchor.x + 40} y1={anchor.y + 3} y2={anchor.y + 3} className={styles.bar} />
            <line x1={anchor.x + 30} x2={anchor.x + 30} y1={anchor.y + 3} y2={GROUND_Y + 3} className={styles.post} />
          </>
        )}
        {skeleton.bones.map(([a, b, far], i) => (
          <line
            key={i}
            x1={p[a].x}
            y1={p[a].y}
            x2={p[b].x}
            y2={p[b].y}
            className={far ? styles.boneFar : styles.bone}
          />
        ))}
        {Object.entries(p)
          .filter(([k]) => k !== skeleton.head)
          .map(([k, v]) => (
            <circle key={k} cx={v.x} cy={v.y} r={2.6} className={styles.joint} />
          ))}
        {/* head + neck */}
        {(p.shoulder || p.neck) && (
          <line
            x1={(p.shoulder ?? p.neck).x}
            y1={(p.shoulder ?? p.neck).y}
            x2={p[skeleton.head].x}
            y2={p[skeleton.head].y}
            className={styles.bone}
          />
        )}
        <circle cx={p[skeleton.head].x} cy={p[skeleton.head].y} r={HEAD_R} className={styles.head} />
      </svg>

      <div className={styles.text}>
        <p className={styles.howTo}>
          {demo.hold && <span className={styles.holdTag}>{t('Hold')}</span>}
          {t(demo.howTo)}
        </p>
        <p className={styles.mistakesTitle}>{t('Common mistakes')}</p>
        <ul className={styles.mistakes}>
          {demo.mistakes.map((m) => (
            <li key={m}>{t(m)}</li>
          ))}
        </ul>
        <button className={styles.readAloud} onClick={() => voice.say(script, { interrupt: true })}>
          {t('Read aloud')}
        </button>
      </div>
    </div>
  );
}
