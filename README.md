# Kinematic

Real-time workout form checker. Pick an exercise, stand in front of your laptop camera,
and Kinematic counts your reps and tells you how to fix your form. Everything runs in the
browser: your video is never uploaded.

Features:
- 18 exercises: 15 counted (reps) + 3 timed holds (plank, side plank, wall sit)
- Sets, reps/seconds target and rest timer between sets
- Voice coach (rep count, tips, rest countdown); can be turned off
- Routines: run several exercises back to back (4 built-in + build your own)
- Rep tempo ("Slow down") and form score per rep (tap "Show more" during a workout)
- Workout history, progress chart and personal bests, saved in this browser (no account needed)
- Backup: export / import your history and routines, or export a CSV for Excel
- Debug panel for tuning (press D on the workout screen)

See ROADMAP.md for what's planned next.

Exercises, grouped by body part:

| Category | Exercises |
|---|---|
| Legs | Squat, Lunge, Glute bridge, Wall sit (timed) |
| Chest | Push-up, Dips |
| Back | Pull-up, Romanian deadlift |
| Shoulders | Shoulder press, Lateral raise |
| Arms | Bicep curl |
| Core | Crunch, Sit-up, Hanging knee raise, Plank (timed), Side plank (timed) |
| Full body / Cardio | Jumping jacks, Mountain climbers |

## Run it

Needs Node.js 20+.

```bash
npm install
npm run dev
```

Open http://localhost:5173 in Chrome or Edge and allow camera access.
The first load needs internet (it downloads the MediaPipe pose model, ~5 MB).

Other commands:

```bash
npm test            # engine unit tests
npm run typecheck   # TypeScript check
npm run build       # production build into dist/
```

## Folder structure

```
src/
  engine/            the brain: plain TypeScript, no React
    camera.ts          turns on the webcam
    pose.ts            MediaPipe wrapper -> 33 body points per frame
    geometry.ts        angle maths, smoothing, "is the body in frame"
    repCounter.ts      generic rep counter (rest -> moving -> active -> rest)
    feedback.ts        keeps tips on screen steady (no flicker)
    drawing.ts         draws the skeleton on the canvas
    voice.ts           voice coach (browser speech)
    exercises/         one file per exercise: main angle, thresholds, form rules
  ui/
    screens/           Picker, Workout, Summary
    components/        RepCounter, FeedbackText
  state/
    workoutSession.ts  sets + rest timer logic
    session.ts         workout summary
    history.ts         saved workouts (localStorage)
    settings.ts        voice on/off, last plan per exercise
  styles/            global CSS + variables
tests/engine/        unit tests for the brain
```

## Add an exercise

1. Copy `src/engine/exercises/squat.ts` and change the name, `category`, angle, thresholds and checks.
   Categories live in `src/engine/exercises/categories.ts`.
2. Add it to the list in `src/engine/exercises/index.ts`.

## Tuning

Thresholds are first guesses. If reps are missed or double-counted, adjust the
`counter` numbers in that exercise's file.
