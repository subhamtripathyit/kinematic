# Kinematic roadmap

## Done
- 18 exercises (15 counted + 3 timed holds), grouped by body part
- Sets & reps mode, free workout mode, rest timer
- Voice coach with mute (button on video, M key)
- Debug panel (D key)
- Routines: 4 built-in + custom builder
- Rep tempo ("Slow down", time under tension)
- Form score (hidden behind "Show more" during a workout, shown in summary/history)
- History, personal bests, progress chart, backup export/import, CSV export

## Parked (do later)
- [ ] Left/right separate rep counting (lunges, curls, mountain climbers)
- [ ] Calibration: learn each user's range of motion (also fixes half-squat case)
- [ ] Deploy to Vercel + GitHub Actions CI/CD (typecheck, tests, build before deploy)
- [ ] Mobile layout (phone camera, portrait)
- [ ] Fix the squat loopholes found in first testing
- [ ] Tune thresholds for all 18 exercises on a real camera (use the debug panel)

## Later phases
- [ ] Backend: login, history synced across devices (Docker + Postgres)
- [ ] Workout plans based on weight / goal / level
