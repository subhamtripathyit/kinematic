import { useEffect, useRef, useState } from 'react';
import { t } from '../../i18n';
import type { CameraFacing } from '../../engine/camera';
import type { PoseEngine } from '../../engine/pose';
import { acquireCamera, getPoseEngine, releaseMedia } from '../../engine/mediaSession';
import { drawSkeleton } from '../../engine/drawing';
import { createAnalyzer, getExercise, isHold } from '../../engine/exercises';
import { emptyStats } from '../../engine/exercises/createAnalyzer';
import type { ExerciseStats, Feedback, PoseFrame } from '../../engine/types';
import { VoiceCoach } from '../../engine/voice';
import { WorkoutSession, type SessionEvent, type SetResult, type WorkoutPlan } from '../../state/workoutSession';
import { formScore, formatDuration } from '../../state/session';
import type { StartMode } from '../../state/settings';
import { RepCounter } from '../components/RepCounter';
import { FeedbackText } from '../components/FeedbackText';
import { DebugPanel, type DebugSnapshot } from '../components/DebugPanel';
import styles from './WorkoutScreen.module.css';
import { MAX_REST_SEC, RestAdjust } from '../components/RestAdjust';

interface Props {
  exerciseId: string;
  plan: WorkoutPlan;
  /** front (mirrored, like a mirror) or back camera (not mirrored) */
  camera?: CameraFacing;
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
  /** best single set before this workout (reps, or hold ms); 0 = never done */
  previousBest?: number;
  /** routines: keep the camera + model running when this screen closes (the next exercise reuses them) */
  keepMediaAlive?: boolean;
  /** how each set starts */
  startMode?: StartMode;
  countdownSec?: number;
}

/** Before counting starts: a countdown, or waiting for the user to get into position. */
type GateView = { mode: 'countdown'; remaining: number } | { mode: 'position' } | null;

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
  adjustRest: (deltaSec: number) => void;
  skipCountdown: () => void;
}

export function WorkoutScreen({
  exerciseId,
  plan,
  camera = 'user',
  voiceEnabled,
  voiceSupported,
  onToggleVoice,
  onBack,
  onFinish,
  contextLabel,
  endLabel,
  backLabel,
  previousBest = 0,
  keepMediaAlive = false,
  startMode = 'countdown',
  countdownSec = 3,
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
  const [sides, setSides] = useState({ left: 0, right: 0 });
  const hasSides = !isHold(exercise) && !!exercise.sides;
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [inFrame, setInFrame] = useState(true);
  /** shape of the camera picture, so the video box matches it (portrait on phones) */
  const [videoAspect, setVideoAspect] = useState<string | null>(null);
  const [pbBanner, setPbBanner] = useState(false);
  const [gateView, setGateView] = useState<GateView>(null);
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
    let shownSides = { left: -1, right: -1 };
    let pbAnnounced = false;
    let pbTimer = 0;

    // Start gate: nothing is counted until it says "Go!".
    let gate: 'countdown' | 'position' | 'go' = 'go';
    let gateEndsAt = 0;
    let shownGateSecond = -1;
    let positionSince: number | null = null;

    const beginCountdown = (now: number, seconds: number) => {
      gate = 'countdown';
      gateEndsAt = now + seconds * 1000;
      shownGateSecond = -1;
    };
    const startGate = (now: number) => {
      if (startMode === 'position') {
        gate = 'position';
        positionSince = null;
        setGateView({ mode: 'position' });
        voice.say(t('Get into your starting position.'), { interrupt: true });
      } else {
        beginCountdown(now, countdownSec);
      }
    };
    const go = () => {
      gate = 'go';
      setGateView(null);
      analyzer.reset();
      statsRef.current = emptyStats();
      shownFeedbackId = undefined;
      setFeedback(null);
      voice.say(t('Go!'), { interrupt: true });
    };

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
      shownSides = { left: -1, right: -1 };
      setSides({ left: 0, right: 0 });
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
          voice.say(plan.sets > 1 ? t('Workout complete. Great job!') : t('Set complete. Great job!'), { interrupt: true });
          finish();
          return;
        }
        resetLiveState();
        if (session.phase === 'working') {
          // No rest: next set starts immediately.
          voice.say(t('Set {done} done. Set {next}, go!', { done: event.setNumber, next: session.currentSet }), { interrupt: true });
          setView({ phase: 'working', set: session.currentSet, restRemaining: 0 });
          return;
        }
        voice.say(t('Set {n} done. Rest {s} seconds.', { n: event.setNumber, s: plan.restSec }), { interrupt: true });
        shownRest = -1;
        setView({ phase: 'resting', set: event.setNumber, restRemaining: session.restRemainingSec(now) });
      } else {
        resetLiveState();
        setView({ phase: 'working', set: event.nextSet, restRemaining: 0 });
        if (startMode === 'position') {
          startGate(now);
        } else if (restSkipped) {
          // rest was cut short: give a countdown to get back into position
          voice.say(t('Set {n}.', { n: event.nextSet }), { interrupt: true });
          startGate(now);
        } else {
          // the rest timer already counted down 3-2-1
          voice.say(t('Go! Set {n}.', { n: event.nextSet }), { interrupt: true });
        }
        restSkipped = false;
      }
    };

    let restSkipped = false;

    actionsRef.current = {
      finishSet: () => {
        const now = performance.now();
        handle(session.completeSet(statsRef.current, now), now);
      },
      endWorkout: () => {
        session.finishEarly(statsRef.current);
        finish();
      },
      skipRest: () => {
        restSkipped = true;
        handle(session.skipRest(), performance.now());
      },
      adjustRest: (deltaSec) => {
        const now = performance.now();
        session.adjustRest(deltaSec, now, MAX_REST_SEC);
        setView((v) => ({ ...v, restRemaining: session.restRemainingSec(now) }));
      },
      skipCountdown: () => {
        if (gate !== 'go') go();
      },
    };

    const loop = () => {
      if (finished) return;
      rafId = requestAnimationFrame(loop);
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || !engine) return;
      const now = performance.now();

      // Countdown runs on the clock.
      if (gate === 'countdown') {
        const remaining = Math.max(0, Math.ceil((gateEndsAt - now) / 1000));
        if (remaining !== shownGateSecond) {
          shownGateSecond = remaining;
          if (remaining > 0) {
            setGateView({ mode: 'countdown', remaining });
            if (remaining <= 3) voice.say(String(remaining), { interrupt: true });
          }
        }
        if (now >= gateEndsAt) go();
      }

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
        setVideoAspect(`${video.videoWidth} / ${video.videoHeight}`);
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

      // Before "Go!": show the skeleton, but don't count anything.
      if (gate === 'countdown') {
        if (ctx) drawSkeleton(ctx, frame, true);
        return;
      }
      if (gate === 'position') {
        const check = analyzer.update(frame);
        if (ctx) drawSkeleton(ctx, frame, check.inFrame);
        // ready = whole body visible, and (for rep exercises) standing in the start position
        const ready = check.inFrame && (hold || check.debug.phase === 'rest');
        const framingTip = check.feedback && check.feedback.level !== 'good' ? check.feedback : null;
        const tipId = framingTip?.id ?? null;
        if (tipId !== shownFeedbackId) {
          shownFeedbackId = tipId;
          setFeedback(framingTip);
          if (framingTip) voice.say(t(framingTip.message), { cooldownMs: 4000 });
        }
        if (ready) {
          positionSince ??= now;
          if (now - positionSince >= 1000) beginCountdown(now, 3);
        } else {
          positionSince = null;
        }
        return;
      }

      const result = analyzer.update(frame);
      statsRef.current = result.stats;
      if (ctx) drawSkeleton(ctx, frame, result.inFrame);

      const left = result.stats.leftReps ?? 0;
      const right = result.stats.rightReps ?? 0;
      if (left !== shownSides.left || right !== shownSides.right) {
        shownSides = { left, right };
        setSides(shownSides);
      }

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
            else if (newCount % 10 === 0 && left > 0) voice.say(t('{n} seconds', { n: newCount }), { interrupt: true });
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

      // New personal best: beat your best single set (only once per workout, and not on your first try).
      const setValue = hold ? result.stats.holdMs : result.stats.reps;
      if (!pbAnnounced && previousBest > 0 && setValue > previousBest) {
        pbAnnounced = true;
        voice.say(t('New personal best!'));
        setPbBanner(true);
        pbTimer = window.setTimeout(() => setPbBanner(false), 4000);
      }

      const feedbackId = result.feedback?.id ?? null;
      if (feedbackId !== shownFeedbackId) {
        shownFeedbackId = feedbackId;
        setFeedback(result.feedback);
        // Speak tips and warnings; "Good rep!" is covered by the rep count.
        if (result.feedback && result.feedback.level !== 'good') {
          voice.say(t(result.feedback.message), { cooldownMs: 4000 });
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
        // Reuses the camera and model if a routine's previous exercise left them running.
        await acquireCamera(video, camera);
        if (cancelled) return;
        const created = await getPoseEngine();
        if (cancelled) return;
        engine = created;
        startedAtRef.current = Date.now();
        setStatus('running');
        if (plan.mode === 'plan' && plan.sets > 1) voice.say(t('Set 1 of {n}.', { n: plan.sets }), { interrupt: true });
        startGate(performance.now());
        rafId = requestAnimationFrame(loop);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : t('Something went wrong while starting.'));
        setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      engine = null;
      if (!keepMediaAlive) releaseMedia();
      actionsRef.current = null;
      window.clearTimeout(pbTimer);
    };
  }, [exerciseId, plan, hold, voice, camera, previousBest, keepMediaAlive, startMode, countdownSec]);

  const running = status === 'running';
  const resting = running && view.phase === 'resting';

  return (
    <div className={styles.layout}>
      <section
        className={`${styles.stage} ${running && !resting && !inFrame ? styles.outOfFrame : ''}`}
        style={videoAspect ? { aspectRatio: videoAspect } : undefined}
      >
        <video ref={videoRef} className={`${styles.media} ${camera === 'user' ? styles.mirrored : ''}`} playsInline muted />
        <canvas ref={canvasRef} className={`${styles.media} ${camera === 'user' ? styles.mirrored : ''}`} />
        {pbBanner && <div className={styles.pbBanner}>{t('New personal best!')}</div>}
        {status !== 'error' && voiceSupported && (
          <button
            className={`${styles.muteButton} ${voiceEnabled ? '' : styles.muted}`}
            onClick={onToggleVoice}
            aria-pressed={!voiceEnabled}
            title={voiceEnabled ? t('Mute voice coach (M)') : t('Unmute voice coach (M)')}
          >
            <SpeakerIcon muted={!voiceEnabled} />
            <span>{voiceEnabled ? t('Mute') : t('Unmute')}</span>
          </button>
        )}
        {status === 'loading' && (
          <div className={styles.overlay}>
            <p>{t('Starting the camera and loading the pose model…')}</p>
            <p className={styles.small}>{t('Allow camera access if your browser asks.')}</p>
          </div>
        )}
        {status === 'error' && (
          <div className={styles.overlay}>
            <p>{error ? t(error) : ''}</p>
            <button className="btn-secondary" onClick={onBack}>
              {t('Back')}
            </button>
          </div>
        )}
        {running && !resting && gateView?.mode === 'countdown' && (
          <div className={`${styles.overlay} ${styles.countdownOverlay}`}>
            <p className={styles.restLabel}>{t('Get in position')}</p>
            <p key={gateView.remaining} className={styles.countdownNumber}>
              {gateView.remaining}
            </p>
            <button className="btn-secondary" onClick={() => actionsRef.current?.skipCountdown()}>
              {t('Skip countdown')}
            </button>
          </div>
        )}
        {running && !resting && gateView?.mode === 'position' && (
          <div className={`${styles.overlay} ${styles.positionOverlay}`}>
            <p className={styles.restLabel}>{t('Get into your starting position')}</p>
            <p className={styles.small}>{t("Counting starts when the camera sees you're ready.")}</p>
            <button className="btn-secondary" onClick={() => actionsRef.current?.skipCountdown()}>
              {t('Start now')}
            </button>
          </div>
        )}
        {resting && (
          <div className={styles.overlay}>
            <p className={styles.restLabel}>{t('Rest')}</p>
            <p className={styles.restTime}>{formatDuration(view.restRemaining)}</p>
            <p className={styles.small}>
              Next: set {view.set + 1}
              {free ? '' : ` of ${plan.sets}`}
            </p>
            <RestAdjust onAdjust={(d) => actionsRef.current?.adjustRest(d)} />
            <button className="btn-primary" onClick={() => actionsRef.current?.skipRest()}>
              {t('Skip rest')}
            </button>
          </div>
        )}
      </section>

      <aside className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            {contextLabel && <p className={styles.context}>{contextLabel}</p>}
            <h2 className={styles.title}>{t(exercise.name)}</h2>
            <p className={styles.setInfo}>
              {free
                ? t('Free workout · set {n}', { n: view.set })
                : t('Set {n} of {total} · target {target}', {
                    n: view.set,
                    total: plan.sets,
                    target: hold ? formatDuration(plan.target) : t('{n} reps', { n: plan.target }),
                  })}
            </p>
          </div>
        </div>
        <p className={styles.hint}>{t(exercise.setupHint)}</p>

        <RepCounter
          value={hold ? formatDuration(count) : count}
          target={free ? undefined : hold ? formatDuration(plan.target) : plan.target}
          label={hold ? 'held' : 'reps'}
          sides={hasSides ? sides : undefined}
        />
        <FeedbackText feedback={resting ? { id: 'rest', message: t('Resting. Get ready for the next set.'), level: 'info' } : feedback} />

        <button className={styles.linkButton} onClick={() => setShowMore((v) => !v)} aria-expanded={showMore}>
          {showMore ? t('Show less') : t('Show more')}
        </button>
        {showMore && (
          <dl className={styles.details}>
            {hold ? (
              <>
                <dt>{t('Form score (this set)')}</dt>
                <dd>{details.setScore ?? '–'}</dd>
                <dt>{t('Time in position')}</dt>
                <dd>{formatDuration(details.positionMs / 1000)}</dd>
              </>
            ) : (
              <>
                <dt>{t('Last rep form score')}</dt>
                <dd>{details.lastScore ?? '–'}</dd>
                <dt>{t('Form score (this set)')}</dt>
                <dd>{details.setScore ?? '–'}</dd>
                <dt>{t('Last rep took')}</dt>
                <dd>{details.lastRepMs === null ? '–' : `${(details.lastRepMs / 1000).toFixed(1)}s`}</dd>
                <dt>{t('Time under tension')}</dt>
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
          {showDebug ? t('Hide') : t('Show')} debug panel (D)
        </button>

        <div className={styles.actions}>
          <button className="btn-secondary" onClick={() => actionsRef.current?.finishSet()} disabled={!running || resting}>
            {t('Finish set')}
          </button>
          <button className="btn-primary" onClick={() => actionsRef.current?.endWorkout()} disabled={!running}>
            {endLabel ?? t('End workout')}
          </button>
        </div>
        <button className={styles.linkButton} onClick={onBack}>
          {backLabel ?? t('Change settings')}
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
