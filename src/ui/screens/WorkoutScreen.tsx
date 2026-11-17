import { useEffect, useRef, useState } from 'react';
import { startCamera, stopCamera } from '../../engine/camera';
import { createPoseEngine, type PoseEngine } from '../../engine/pose';
import { drawSkeleton } from '../../engine/drawing';
import { createAnalyzer, getExercise, isHold } from '../../engine/exercises';
import { emptyStats } from '../../engine/exercises/createAnalyzer';
import type { ExerciseStats, Feedback, PoseFrame } from '../../engine/types';
import { VoiceCoach } from '../../engine/voice';
import { WorkoutSession, type SessionEvent, type SetResult, type WorkoutPlan } from '../../state/workoutSession';
import { formScore, formatDuration } from '../../state/session';
import { RepCounter } from '../components/RepCounter';
import { FeedbackText } from '../components/FeedbackText';
import { DebugPanel, type DebugSnapshot } from '../components/DebugPanel';
import styles from './WorkoutScreen.module.css';

interface Props {
  exerciseId: string;
  plan: WorkoutPlan;
  voiceEnabled: boolean;
  voiceSupported: boolean;
  onToggleVoice: () => void;
  onBack: () => void;
  onFinish: (sets: SetResult[], startedAt: number) => void;
  /** Routines: e.g. "Leg day · exercise 2 of 4" */
  contextLabel?: string;
  /** Label for the end button (default "End workout") */
  endLabel?: string;
  /** Label for the back link (default "Change settings") */
  backLabel?: string;
}

interface Details {
  lastScore: number | null;
  setScore: number | null;
  lastRepMs: number | null;
  tutMs: number;
  positionMs: number;
}

const EMPTY_DETAILS: Details = { lastScore: null, setScore: null, lastRepMs: null, tutMs: 0, positionMs: 0 };

type Status = 'loading' | 'running' | 'error';

interface SessionView {
  phase: 'working' | 'resting' | 'done';
  set: number;
  restRemaining: number;
}

interface Actions {
  finishSet: () => void;
  endWorkout: () => void;
  skipRest: () => void;
}

export function WorkoutScreen({
  exerciseId,
  plan,
  voiceEnabled,
  voiceSupported,
  onToggleVoice,
  onBack,
  onFinish,
  contextLabel,
  endLabel = 'End workout',
  backLabel = 'Change settings',
}: Props) {
  const exercise = getExercise(exerciseId);
  const hold = isHold(exercise);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const statsRef = useRef<ExerciseStats>(emptyStats());
  const startedAtRef = useRef(Date.now());
  const actionsRef = useRef<Actions | null>(null);
  const onFinishRef = useRef(onFinish);
  const onToggleVoiceRef = useRef(onToggleVoice);
  const free = plan.mode === 'free';
  const [voice] = useState(() => new VoiceCoach(voiceEnabled));

  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);
  /** reps, or whole seconds held */
  const [count, setCount] = useState(0);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [inFrame, setInFrame] = useState(true);
  const [view, setView] = useState<SessionView>({ phase: 'working', set: 1, restRemaining: 0 });

  const [showMore, setShowMore] = useState(false);
  const [details, setDetails] = useState<Details>(EMPTY_DETAILS);
  const [showDebug, setShowDebug] = useState(false);
  const [debugSnapshot, setDebugSnapshot] = useState<DebugSnapshot | null>(null);
  // The frame loop reads this ref (it can't see React state).
  const showDebugRef = useRef(false);

  const toggleDebug = () => {
    showDebugRef.current = !showDebugRef.current;
    setShowDebug(showDebugRef.current);
  };

  useEffect(() => {
    onFinishRef.current = onFinish;
    onToggleVoiceRef.current = onToggleVoice;
  });

  useEffect(() => {
    voice.setEnabled(voiceEnabled);
  }, [voice, voiceEnabled]);

  // Keyboard: "D" shows/hides the debug panel, "M" mutes/unmutes the voice.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const key = e.key.toLowerCase();
      if (key === 'd') toggleDebug();
      if (key === 'm') onToggleVoiceRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let stream: MediaStream | null = null;
    let engine: PoseEngine | null = null;
    let rafId = 0;
    let lastVideoTime = -1;
    let finished = false;

    const analyzer = createAnalyzer(exerciseId);
    const session = new WorkoutSession(plan, hold ? 'hold' : 'reps');

    // Last values sent to React, so we only re-render when something changes.
    let shownCount = -1;
    let shownFeedbackId: string | null | undefined;
    let shownInFrame: boolean | null = null;
    let shownRest = -1;
    let shownDetailsKey = '';

    // Frame-rate counter and debug panel throttle.
    let fpsFrames = 0;
    let fpsWindowStart = performance.now();
    let fps = 0;
    let lastDebugAt = 0;

    const resetLiveState = () => {
      analyzer.reset();
      statsRef.current = emptyStats();
      shownCount = -1;
      shownFeedbackId = undefined;
      shownDetailsKey = '';
      setFeedback(null);
      setDetails(EMPTY_DETAILS);
    };

    const finish = () => {
      if (finished) return;
      finished = true;
      cancelAnimationFrame(rafId);
      onFinishRef.current(session.results, startedAtRef.current);
    };

    const handle = (event: SessionEvent, now: number) => {
      if (!event) return;
      if (event.type === 'set-complete') {
        if (event.isLast) {
          voice.say(plan.sets > 1 ? 'Workout complete. Great job!' : 'Set complete. Great job!', { interrupt: true });
          finish();
          return;
        }
        resetLiveState();
        if (session.phase === 'working') {
          // No rest: next set starts immediately.
          voice.say(`Set ${event.setNumber} done. Set ${session.currentSet}, go!`, { interrupt: true });
          setView({ phase: 'working', set: session.currentSet, restRemaining: 0 });
          return;
        }
        voice.say(`Set ${event.setNumber} done. Rest ${plan.restSec} seconds.`, { interrupt: true });
        shownRest = -1;
        setView({ phase: 'resting', set: event.setNumber, restRemaining: session.restRemainingSec(now) });
      } else {
        voice.say(`Go! Set ${event.nextSet}.`, { interrupt: true });
        resetLiveState();
        setView({ phase: 'working', set: event.nextSet, restRemaining: 0 });
      }
    };

    actionsRef.current = {
      finishSet: () => {
        const now = performance.now();
        handle(session.completeSet(statsRef.current, now), now);
      },
      endWorkout: () => {
        session.finishEarly(statsRef.current);
        finish();
      },
      skipRest: () => handle(session.skipRest(), performance.now()),
    };

    const loop = () => {
      if (finished) return;
      rafId = requestAnimationFrame(loop);
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || !engine) return;
      const now = performance.now();

      // Rest countdown runs on the clock, not on video frames.
      if (session.phase === 'resting') {
        const remaining = session.restRemainingSec(now);
        if (remaining !== shownRest) {
          shownRest = remaining;
          setView((v) => ({ ...v, restRemaining: remaining }));
          if (remaining > 0 && remaining <= 3) voice.say(String(remaining), { interrupt: true });
        }
        handle(session.updateResting(now), now);
      }

      if (video.readyState < 2 || video.currentTime === lastVideoTime) return;
      lastVideoTime = video.currentTime;

      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }

      let frame: PoseFrame | null = null;
      try {
        frame = engine.detect(video, now);
      } catch (err) {
        console.error('Pose detection failed for a frame', err);
      }

      fpsFrames++;
      if (now - fpsWindowStart >= 1000) {
        fps = (fpsFrames * 1000) / (now - fpsWindowStart);
        fpsFrames = 0;
        fpsWindowStart = now;
      }

      const ctx = canvas.getContext('2d');

      // While resting: just draw the skeleton, don't count anything.
      if (session.phase !== 'working') {
        if (ctx) drawSkeleton(ctx, frame, true);
        return;
      }

      const result = analyzer.update(frame);
      statsRef.current = result.stats;
      if (ctx) drawSkeleton(ctx, frame, result.inFrame);

      const newCount = hold ? Math.floor(result.stats.holdMs / 1000) : result.stats.reps;
      if (newCount !== shownCount) {
        const previous = shownCount;
        shownCount = newCount;
        setCount(newCount);
        if (previous >= 0 && newCount > previous) {
          if (!hold) {
            voice.say(String(newCount), { interrupt: true });
          } else {
            const left = plan.mode === 'plan' ? plan.target - newCount : Infinity;
            if (left > 0 && left <= 3) voice.say(String(left), { interrupt: true });
            else if (newCount % 10 === 0 && left > 0) voice.say(`${newCount} seconds`, { interrupt: true });
          }
        }
      }

      // "Show more" numbers: update when a rep finishes or every second of a hold.
      const detailsKey = `${result.stats.formScores.length}|${Math.floor(result.stats.positionMs / 1000)}|${newCount}`;
      if (detailsKey !== shownDetailsKey) {
        shownDetailsKey = detailsKey;
        setDetails({
          lastScore: result.lastRepScore,
          setScore: formScore(hold ? 'hold' : 'reps', result.stats),
          lastRepMs: result.lastRepMs,
          tutMs: result.stats.tutMs,
          positionMs: result.stats.positionMs,
        });
      }

      const feedbackId = result.feedback?.id ?? null;
      if (feedbackId !== shownFeedbackId) {
        shownFeedbackId = feedbackId;
        setFeedback(result.feedback);
        // Speak tips and warnings; "Good rep!" is covered by the rep count.
        if (result.feedback && result.feedback.level !== 'good') {
          voice.say(result.feedback.message, { cooldownMs: 4000 });
        }
      }
      if (result.inFrame !== shownInFrame) {
        shownInFrame = result.inFrame;
        setInFrame(result.inFrame);
      }

      if (showDebugRef.current && now - lastDebugAt >= 100) {
        lastDebugAt = now;
        setDebugSnapshot({ value: result.value, inFrame: result.inFrame, debug: result.debug, fps });
      }

      handle(session.updateWorking(result.stats, now), now);
    };

    (async () => {
      try {
        const video = videoRef.current;
        if (!video) return;
        stream = await startCamera(video);
        if (cancelled) return stopCamera(stream);

        const created = await createPoseEngine();
        if (cancelled) {
          created.close();
          stopCamera(stream);
          return;
        }
        engine = created;
        startedAtRef.current = Date.now();
        setStatus('running');
        voice.say(plan.mode === 'plan' && plan.sets > 1 ? `Set 1 of ${plan.sets}. Go!` : 'Go!', { interrupt: true });
        rafId = requestAnimationFrame(loop);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Something went wrong while starting.');
        setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      engine?.close();
      engine = null;
      stopCamera(stream);
      stream = null;
      actionsRef.current = null;
    };
  }, [exerciseId, plan, hold, voice]);

  const running = status === 'running';
  const resting = running && view.phase === 'resting';

  return (
    <div className={styles.layout}>
      <section className={`${styles.stage} ${running && !resting && !inFrame ? styles.outOfFrame : ''}`}>
        <video ref={videoRef} className={styles.media} playsInline muted />
        <canvas ref={canvasRef} className={styles.media} />
        {status !== 'error' && voiceSupported && (
          <button
            className={`${styles.muteButton} ${voiceEnabled ? '' : styles.muted}`}
            onClick={onToggleVoice}
            aria-pressed={!voiceEnabled}
            title={voiceEnabled ? 'Mute voice coach (M)' : 'Unmute voice coach (M)'}
          >
            <SpeakerIcon muted={!voiceEnabled} />
            <span>{voiceEnabled ? 'Mute' : 'Unmute'}</span>
          </button>
        )}
        {status === 'loading' && (
          <div className={styles.overlay}>
            <p>Starting the camera and loading the pose model…</p>
            <p className={styles.small}>Allow camera access if your browser asks.</p>
          </div>
        )}
        {status === 'error' && (
          <div className={styles.overlay}>
            <p>{error}</p>
            <button className="btn-secondary" onClick={onBack}>
              Back
            </button>
          </div>
        )}
        {resting && (
          <div className={styles.overlay}>
            <p className={styles.restLabel}>Rest</p>
            <p className={styles.restTime}>{formatDuration(view.restRemaining)}</p>
            <p className={styles.small}>
              Next: set {view.set + 1}
              {free ? '' : ` of ${plan.sets}`}
            </p>
            <button className="btn-primary" onClick={() => actionsRef.current?.skipRest()}>
              Skip rest
            </button>
          </div>
        )}
      </section>

      <aside className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            {contextLabel && <p className={styles.context}>{contextLabel}</p>}
            <h2 className={styles.title}>{exercise.name}</h2>
            <p className={styles.setInfo}>
              {free
                ? `Free workout · set ${view.set}`
                : `Set ${view.set} of ${plan.sets} · target ${hold ? formatDuration(plan.target) : `${plan.target} reps`}`}
            </p>
          </div>
        </div>
        <p className={styles.hint}>{exercise.setupHint}</p>

        <RepCounter
          value={hold ? formatDuration(count) : count}
          target={free ? undefined : hold ? formatDuration(plan.target) : plan.target}
          label={hold ? 'held' : 'reps'}
        />
        <FeedbackText feedback={resting ? { id: 'rest', message: 'Resting. Get ready for the next set.', level: 'info' } : feedback} />

        <button className={styles.linkButton} onClick={() => setShowMore((v) => !v)} aria-expanded={showMore}>
          {showMore ? 'Show less' : 'Show more'}
        </button>
        {showMore && (
          <dl className={styles.details}>
            {hold ? (
              <>
                <dt>Form score (this set)</dt>
                <dd>{details.setScore ?? '–'}</dd>
                <dt>Time in position</dt>
                <dd>{formatDuration(details.positionMs / 1000)}</dd>
              </>
            ) : (
              <>
                <dt>Last rep form score</dt>
                <dd>{details.lastScore ?? '–'}</dd>
                <dt>Form score (this set)</dt>
                <dd>{details.setScore ?? '–'}</dd>
                <dt>Last rep took</dt>
                <dd>{details.lastRepMs === null ? '–' : `${(details.lastRepMs / 1000).toFixed(1)}s`}</dd>
                <dt>Time under tension</dt>
                <dd>{formatDuration(details.tutMs / 1000)}</dd>
              </>
            )}
          </dl>
        )}

        {showDebug &&
          (isHold(exercise) ? (
            <DebugPanel snapshot={debugSnapshot} rule={exercise.positionRule} />
          ) : (
            <DebugPanel snapshot={debugSnapshot} counter={exercise.counter} />
          ))}
        <button className={styles.linkButton} onClick={toggleDebug}>
          {showDebug ? 'Hide' : 'Show'} debug panel (D)
        </button>

        <div className={styles.actions}>
          <button className="btn-secondary" onClick={() => actionsRef.current?.finishSet()} disabled={!running || resting}>
            Finish set
          </button>
          <button className="btn-primary" onClick={() => actionsRef.current?.endWorkout()} disabled={!running}>
            {endLabel}
          </button>
        </div>
        <button className={styles.linkButton} onClick={onBack}>
          {backLabel}
        </button>
        <p className={styles.keys}>Shortcuts: M = mute, D = debug panel</p>
      </aside>
    </div>
  );
}

function SpeakerIcon({ muted }: { muted: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 5 6 9H2v6h4l5 4V5z" />
      {muted ? (
        <>
          <line x1="22" y1="9" x2="16" y2="15" />
          <line x1="16" y1="9" x2="22" y2="15" />
        </>
      ) : (
        <>
          <path d="M15.5 8.5a5 5 0 0 1 0 7" />
          <path d="M19 5a10 10 0 0 1 0 14" />
        </>
      )}
    </svg>
  );
}
