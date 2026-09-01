# Fitness Health PWA — Product Requirements and Design

Status: Approved product direction, ready for implementation  
Prepared: August 31, 2026  
Initial training-plan start: Monday, September 7, 2026  
Target event: Half marathon on Sunday, December 13, 2026

## 1. Executive summary

Fitness Health PWA is a private, local-first, mobile-oriented progressive web app that helps one person consistently execute a predetermined fitness plan and cook more meals at home.

The product has two connected jobs:

1. Hold the user accountable to a weekly half-marathon and full-body strength plan.
2. Make home cooking easier by tracking home-prepared meals, saved dishes, and only the fresh groceries that need to be used.

This is deliberately not a comprehensive fitness, nutrition, pantry, or calorie tracker. Its central design principle is reducing thought and data-entry burden. The app should make the next good action obvious, let the user record it quickly, and show whether the week is on track.

The application should follow the technical philosophy of the existing `simple-budget-pwa` project:

- React and TypeScript
- Vite
- Tailwind CSS and local shadcn/Radix-style primitives
- Dexie and IndexedDB for local persistence
- Zod-validated, versioned JSON backup and restore
- Workbox-powered offline application shell
- Vitest tests for domain and persistence behavior
- GitHub Actions deployment to GitHub Pages
- Mobile-first design, especially for an installed iPhone PWA

No account, server, database, Strava connection, OpenAI API, or other third-party integration is required for the initial product.

## 2. Product outcomes

The product should help the user:

- Finish the December 13 half marathon comfortably, or simply finish it.
- Complete the prescribed runs and gym sessions each week.
- Build stronger legs and a balanced base through two simple full-body workouts per week.
- Progress resistance exercises without having to invent the next workout.
- Cook more home-prepared meals, including eating leftovers.
- Notice fresh groceries before they are forgotten.
- Choose a familiar dish or ask personal ChatGPT for ideas with minimal effort.
- Reduce body fat over time without calorie or macro tracking.
- Save money indirectly by eating out less, without tracking food costs.

## 3. Design principles

### 3.1 Consistency beats completeness

Only collect data that produces a useful next action or meaningful progress signal. A theoretically complete tracker that the user avoids is a failed product.

### 3.2 Plan once, execute weekly

The initial running and gym program is built in advance. The normal experience is following it, not recreating a plan every week.

### 3.3 Commitments are flexible; workload is not

A session may move to another day within the same week. The app tracks whether the planned weekly work was completed, not whether Tuesday was obeyed perfectly. Missed mileage and lifting sessions do not roll forward or stack into the next week.

### 3.4 The home screen is action-first

The first screen answers “What should I do now?” Detailed management and history are secondary.

### 3.5 Local-first and offline-first

Personal health, workout, meal, recipe, grocery, and weight data remain on the device unless the user explicitly exports a backup.

### 3.6 Encouraging, never punitive

Use neutral language such as “waiting,” “reschedule,” and “skipped.” Avoid shame, alarming colors for ordinary misses, daily streak pressure, and all-or-nothing messaging.

### 3.7 Honest simplicity

The Fresh List is not a precise pantry inventory. Weight is not a direct body-fat measurement. “Use soon” is not a food-safety guarantee. The UI must not imply false precision.

## 4. Users and scope

### 4.1 Primary user

One adult using the app primarily on an iPhone as an installed PWA. The user:

- Currently runs approximately five miles at about a 12-minute-per-mile pace.
- Primarily uses conversational/Zone 2 effort.
- Wants to run twice weekly, with Saturday as the long-run day.
- Has mild, fading discomfort under the kneecap during running and after prolonged sitting.
- Wants a simple routine because complexity, occupied equipment, limited time, and disrupted flow reduce adherence.
- Has access to a typical commercial gym.
- Is familiar with Romanian deadlifts, overhead press, dumbbell bench press, 45-degree extensions, lat pulldowns, triceps pushdowns, and leg press.
- Wants to cook more, use groceries, lose body fat, become stronger and leaner, and spend less on eating out.

### 4.2 Product boundary

This is a personal behavior and training tracker, not medical care. It must not diagnose knee pain, prescribe rehabilitation, estimate injury risk, or provide food-safety determinations.

Persistent, worsening, sharp, swelling-related, or gait-altering pain should be evaluated by an appropriate clinician. The app should not repeatedly ask about symptoms or add pain logging; that friction was explicitly rejected.

## 5. Confirmed non-goals

The initial release will not include:

- Calorie counting
- Macronutrient tracking
- Body-fat percentage estimation
- Daily weight requirements
- Progress photos
- Required waist measurements
- Run pace, duration, heart rate, route, or perceived-effort tracking
- Pain or injury questionnaires
- Strava or wearable integrations
- Gym-plan generation on every session
- Advanced periodization
- A complete pantry inventory
- Grocery quantities or automatic ingredient subtraction
- Exact food-expiration prediction
- Food-safety advice
- Grocery receipt AI/OCR
- OpenAI API integration
- Actual grocery or restaurant cost tracking
- Social features, leaderboards, or sharing
- User accounts or cloud synchronization
- A permanent navigation tab for Settings

## 6. Information architecture

Use four persistent bottom-navigation destinations.

### 6.1 Today

The default and most important screen. It shows:

- The single best next action
- Today’s planned activity, if any
- Any overdue activity waiting to be rescheduled
- Compact weekly completion for runs, strength, and home-prepared meals
- Upcoming sessions
- One suggested dish or fresh ingredient that needs attention
- Quick actions: start workout, log run, log meal, add fresh groceries

### 6.2 Plan

This contains:

- Current week calendar/board
- Full half-marathon plan
- Gym workout definition
- Activity detail
- Rescheduling
- Plan editing behind a deliberate edit mode

### 6.3 Kitchen

This contains:

- Fresh List
- Use Soon items
- Saved Dishes
- Ready-to-make and almost-ready matching
- Meal history
- Add dish
- Ask ChatGPT prompt generation

### 6.4 Progress

This contains:

- Weekly adherence
- Planned versus actual running distance
- Exercise progression
- Home-prepared meal counts
- Weekly weight and smoothed trend
- Optional monthly waist measurements

### 6.5 Settings

Settings should be reached from a top-level menu and contain:

- Units and week preferences
- Adjustable cooking goal
- Plan editing/reset controls
- Backup export, validation, and restore
- Data deletion
- PWA installation guidance
- Low-priority calendar reminder controls when implemented

## 7. Core weekly behavior model

### 7.1 Definitions

- **Plan session:** a run, strength workout, race, or intentional rest/recovery item defined by the training plan.
- **Commitment:** a plan session that counts toward the week’s required work.
- **Scheduled date:** the current intended day for a commitment.
- **Original date:** the day originally defined by the plan.
- **Status:** upcoming, due, waiting, completed, or skipped.
- **Rescheduled:** a session whose scheduled date differs from its original date. This is metadata, not a failure status.

### 7.2 Normal weekly target

Most weeks contain four fitness commitments:

- One Tuesday easy run
- One Saturday long run
- One Monday full-body workout
- One Thursday full-body workout

The plan may intentionally reduce commitments during recovery, taper, or race week. Success is measured against the plan for that specific week, not a hard-coded four-session quota.

### 7.3 Rescheduling

- A due activity can be moved to another day in the same Monday–Sunday week.
- Moving Tuesday’s run to Wednesday moves the commitment; Tuesday does not require a replacement activity.
- The Today view should surface a missed session as “waiting” and present a fast Reschedule action.
- The UI should warn, but not hard-block, when a move creates two demanding lower-body sessions on adjacent days.
- Prefer keeping the long run away from a heavy lower-body lifting day.
- A session incomplete at the end of Sunday becomes skipped.
- Skipped sessions never roll automatically into the next week.
- Missed running distance is never added to a later run.

### 7.4 Weekly adherence

Calculate separately:

- Runs completed / planned runs
- Strength sessions completed / planned strength sessions
- Total fitness commitments completed / total planned commitments
- Home-prepared meals / adjustable weekly cooking goal

Also show consecutive weeks that met every planned fitness commitment. Do not use a daily streak.

## 8. Running plan

### 8.1 Philosophy

This is a completion-focused plan built around the user’s explicit limit of two runs per week. Two weekly runs provide less training margin than conventional beginner half-marathon plans, so the plan should remain conservative, conversational, and honest about that constraint.

Every regular run is an easy/Zone 2 or conversational-effort run. The app does not require pace or heart-rate entry. Walking breaks are allowed. Only planned distance, actual distance, completion date, and optional free-text notes are stored.

### 8.2 Schedule

The plan begins Monday, September 7, 2026. Distances are miles.

| Week | Dates | Tuesday easy run | Saturday long run / event | Gym commitments | Purpose |
|---:|---|---:|---:|---:|---|
| 1 | Sep 7–13 | 3.0 | 5.0 | Mon + Thu | Establish rhythm |
| 2 | Sep 14–20 | 3.0 | 6.0 | Mon + Thu | Build |
| 3 | Sep 21–27 | 3.0 | 7.0 | Mon + Thu | Build |
| 4 | Sep 28–Oct 4 | 3.0 | 5.0 | Mon + Thu | Recovery |
| 5 | Oct 5–11 | 3.5 | 8.0 | Mon + Thu | Build |
| 6 | Oct 12–18 | 3.5 | 9.0 | Mon + Thu | Build |
| 7 | Oct 19–25 | 3.0 | 6.0 | Mon + Thu | Recovery |
| 8 | Oct 26–Nov 1 | 4.0 | 10.0 | Mon + Thu | Build |
| 9 | Nov 2–8 | 4.0 | 8.0 | Mon + Thu | Recovery/consolidation |
| 10 | Nov 9–15 | 4.0 | 11.0 | Mon + Thu | Build |
| 11 | Nov 16–22 | 4.0 | 8.0 | Mon + Thu | Recovery/consolidation |
| 12 | Nov 23–29 | 4.0 | 12.0 | Mon + Thu | Peak long run |
| 13 | Nov 30–Dec 6 | 3.0 | 8.0 | Mon + Thu, reduced volume | Taper begins |
| 14 | Dec 7–13 | 2.0 | 13.1 race on Sun Dec 13 | Mon only, light | Race week |

This plan contains 14 calendar weeks from September 7 through race day. The implementation must seed exact dates rather than deriving the race from an approximate weekend.

### 8.3 Running completion

- Start Run displays planned distance and a brief “easy, conversational effort; walking is allowed” reminder.
- Complete Run asks only for actual distance.
- Actual distance defaults to planned distance for one-tap completion and can be edited.
- No pace, time, zone, exertion, or pain fields appear.
- A partial run can be completed with its actual distance and counts as completed, while progress retains the planned-versus-actual difference.

### 8.4 Safety language

Place a short, non-repetitive note in plan information/settings rather than every run form:

> This plan is general fitness guidance, not medical advice. Do not push through sharp, worsening, swelling-related, or stride-changing pain. Seek professional evaluation when appropriate.

## 9. Strength plan

### 9.1 Philosophy

Repeat the same core full-body workout twice weekly. This is intentional:

- Fewer decisions
- Faster learning
- Easier progression
- Predictable duration
- Less disruption when equipment is occupied
- Each major movement pattern trained twice weekly

The plan should fit approximately 45 minutes. The completion requirement is the core workout, not optional accessories.

### 9.2 Five-minute warm-up

Display the following sequence at the start of each workout:

1. Easy stationary bike — 2 minutes
2. Bodyweight squat to a bench — 8 controlled repetitions
3. Unweighted hip hinge — 8 repetitions
4. Lateral band steps — 8 steps in each direction
5. Incline push-ups against a bench — 8 repetitions

The UI should say that a painful warm-up movement should be skipped or adjusted. Warm-up items do not require individual logging; one Start Main Workout action advances past the warm-up.

### 9.3 Core workout

| Order | Exercise | Prescription | Default substitute |
|---:|---|---|---|
| 1 | Leg press | 3 × 8–12 | Goblet squat to a bench |
| 2 | Dumbbell Romanian deadlift | 3 × 8–12 | 45-degree back extension |
| 3A | Dumbbell bench press | 3 × 8–12 | Chest-press machine |
| 3B | Seated cable row | 3 × 8–12 | Chest-supported dumbbell row |
| 4A | Lat pulldown | 2 × 8–12 | Assisted pull-up |
| 4B | Hip-abduction machine | 2 × 12–20 | Lateral band walks |

Exercises 3A/3B and 4A/4B may be shown as suggested supersets to save time, but the user can complete exercises in any order.

The routine does not require a barbell or rack. Every exercise detail has a Substitute action so occupied equipment does not interrupt the workout.

### 9.4 Optional finishers

Overhead press, triceps pushdown, calf work, core work, and additional back extensions may be stored as optional finishers. They do not appear by default in the core flow and never affect workout completion or adherence.

### 9.5 Set logging

For each work set, log:

- Exercise or selected substitute
- Set number
- Weight in pounds
- Repetitions
- Completion

Defaults should minimize typing:

- Prepopulate weight and target reps from the most recent performance for that exact exercise.
- Allow “repeat last set” with one tap.
- Use a numeric keypad.
- Preserve an incomplete workout draft if the app closes.
- Make the next incomplete set obvious.

### 9.6 Double progression

Use deterministic progression rather than AI:

1. Each exercise has a configured rep range.
2. Keep the same weight until all prescribed work sets reach the top of the range.
3. When every work set reaches the top with completed reps, recommend the smallest configured weight increase next time.
4. If the target is not reached, retain the same recommendation next time.
5. If performance declines for three consecutive sessions at the same load, recommend a small deload using the nearest available lower increment.
6. Never require training to failure.

Default increments:

- Upper-body dumbbell/cable/machine exercise: smallest available increment, default 5 lb total unless configured otherwise.
- Leg press: default 10 lb.
- Hip-abduction machine: smallest available increment.
- Bodyweight/band substitutions: progress repetitions first, then band resistance or external load.

Every recommendation is editable. Display it plainly:

> Last time: 3 × 12 at 30 lb  
> Suggested today: 35 lb

### 9.7 Taper modification

- Week 13: keep both gym sessions but reduce each prescribed exercise by one work set and avoid grinding repetitions.
- Race week: one light Monday session at reduced volume and comfortable existing loads; no Thursday strength commitment.
- After the race, the app should not invent a new program. Show a Plan Complete state and invite the user to intentionally create the next phase.

## 10. Kitchen model

### 10.1 Home-prepared meal definition

A home-prepared meal is anything eaten from food prepared or assembled at home instead of dining out or ordering delivery. It includes:

- Cooking a new meal
- Meal prep
- Packed lunches
- Simple assembled meals
- Leftovers

The app counts home-prepared meals against a small set of configurable weekly meal commitments. The initial personal defaults are:

- Breakfast: 7 of 7 daily slots
- Work lunch: all five Monday–Friday slots
- Dinner: any 5 of 7 daily slots

Only one meal can satisfy a given daily slot. Additional home-prepared meals remain in total history but do not inflate slot adherence. A meal-prepped or leftover meal counts because the desired behavior is eating food prepared at home, not cooking from scratch for every sitting.

Meal-goal versions are effective-dated by week so future changes do not rewrite historical adherence. Missed slots do not roll into the next week.

### 10.2 Meal logging

Primary quick action: Log Home Meal.

Flow:

1. Default timestamp is now.
2. Infer Breakfast, Work Lunch, Dinner, or Other from the time and weekday; allow a quick correction.
3. Optionally select a saved dish.
4. Optionally mark as leftovers.
5. Save.

Only the inferred meal slot is required. Today provides a one-tap time-aware action such as Log Breakfast or Log Dinner. Kitchen opens the same preselected action and saves in a second tap. Duplicate taps for an already-counted daily slot should not create another adherence credit. Eating-out entries may be supported as an optional secondary type for context, but are not required and should not add friction to the primary flow.

Logging a saved dish updates its times-cooked and last-cooked date. It does not automatically subtract groceries.

The two Kitchen mandates—meeting home-prepared meal commitments and using fresh groceries—must receive equal top-level prominence. Meal tracking must not bury Add Fresh Groceries, Use Soon, or Cook It, and Fresh List maintenance must not add steps to ordinary meal logging.

### 10.3 Fresh List, not pantry inventory

The Fresh List tracks only recently purchased ingredients worth remembering. It intentionally excludes exact quantities and the expectation of cataloguing shelf-stable staples.

Each item stores:

- Display name
- Normalized matching name
- Added/purchased date
- Optional user-selected reminder date
- State: recent, use soon, or removed
- Optional note

Default behavior:

- Batch-add items from one text field.
- Accept commas, semicolons, or new lines as separators.
- Work well with iPhone keyboard dictation.
- Assign the same current date to the entire batch.
- Automatically label an active item “use soon” seven days after it was added, unless the user supplied a reminder date.
- “Use soon” is a planning prompt, not an expiration or food-safety claim.
- From a Use Soon card, offer Cook It, Keep It, and Remove.
- Keep It resets the attention date without changing the original added date.
- Cook It opens matching saved dishes and meal logging.

Do not automatically remove or decrement ingredients when a meal is logged. After logging a dish, the app may offer a non-blocking Review Fresh List link.

### 10.4 Saved Dish model

A Saved Dish is intentionally lighter than a formal recipe. It contains:

- Name, required
- Key ingredients, zero or more
- Short instructions or notes, optional
- Source URL, optional
- Photo, optional
- “Would make again,” optional tri-state or boolean
- Created date
- Updated date
- Times cooked, derived or maintained
- Last cooked date, derived or maintained

Photos should be resized/compressed before local storage so they do not make IndexedDB and backups unreasonably large.

### 10.5 Local dish matching

Match normalized Fresh List names against normalized Saved Dish key ingredients. Support lightweight aliases/plurals where practical, but do not build an elaborate ingredient ontology.

Rank into:

1. Uses an item marked Use Soon
2. Ready to make from listed fresh ingredients, assuming ordinary staples may exist
3. Missing one key fresh ingredient
4. Familiar dishes that have not been cooked recently

The UI must describe results probabilistically (“Looks ready” or “Missing one listed ingredient”) because the Fresh List is intentionally incomplete.

### 10.6 Ask ChatGPT

This feature uses the user’s existing ChatGPT subscription manually and does not call an API.

Provide two actions:

- **What should I cook?** Includes the full active Fresh List and all Saved Dish summaries.
- **Use this ingredient** Includes the selected ingredient, other active Fresh List items, and relevant Saved Dishes.

The app generates and copies a prompt, then opens ChatGPT in a new browser/app destination where supported. The user pastes the prompt. No automatic response import is promised.

Default prompt:

```text
Help me decide what to cook.

Fresh ingredients I should use:
{{active fresh items with added dates and use-soon labels}}

Dishes I already like:
{{saved dish names and key ingredients}}

Prioritize ingredients marked use soon.
First recommend any saved dish that fits.
Then suggest up to three simple new dishes.
New dishes should take no more than 45 minutes and require at most two additional groceries.
Do not include calorie or macro tracking.
```

If the dish collection becomes too large for a convenient prompt, prioritize relevant, favored, and least-recently-cooked dishes while offering an Include All toggle. For the initial personal-scale collection, include all by default.

### 10.7 Deferred receipt text experiment

A local “Paste receipt text” parser may be explored after the core Kitchen flow. It would rely on text copied with iPhone Live Text and heuristically remove prices/totals. It is not part of initial acceptance because receipt abbreviations and layouts make reliability uncertain.

AI receipt parsing is explicitly deferred. A GitHub Pages client cannot securely contain an OpenAI API key, ChatGPT Plus does not include API usage, and a secure implementation would require a separately hosted serverless backend and separate API billing.

## 11. Progress model

### 11.1 Primary progress signals

- Weekly fitness-plan adherence
- Planned versus actual running distance by week
- Longest completed training run
- Exercise weight/repetition history
- Home-prepared meals by week
- Weekly body-weight trend

### 11.2 Weight

- One weigh-in per week is encouraged, not enforced.
- Default unit is pounds and can be configured.
- Show raw weekly points and a smoothed trend when enough data exists.
- Do not interpret individual fluctuations as success or failure.
- Do not convert weight into a claimed body-fat percentage.
- A target weight is not required because the stated goal is lower body fat and recomposition rather than reaching a specific scale number.

### 11.3 Waist

Waist measurement is optional and secondary, suggested no more than monthly. It should not appear in the default quick-log flow or generate reminders unless explicitly enabled.

### 11.4 Recomposition framing

Progress should combine adherence, weight trend, and strength progression. The interface should not declare that body fat increased or decreased from these proxies.

## 12. Screen requirements

### 12.1 Today screen

Priority order:

1. Waiting/overdue commitment needing a decision
2. Today’s planned fitness commitment
3. Next upcoming commitment
4. Weekly completion strip
5. Kitchen suggestion/use-soon item
6. Quick actions

Example:

```text
TODAY

Full Body · about 45 min
Suggested first exercise: Leg press
[Start workout]

THIS WEEK
Runs       0 / 2
Strength   1 / 2
Meal goals  9 / 17

COMING UP
Sat · Long run · 6 miles

COOK TONIGHT
Chicken and mushroom skillet · looks ready
Spinach · use soon
```

On a rest day, the primary card should say the next planned session and may elevate cooking without inventing an exercise obligation.

### 12.2 Weekly Plan screen

- Monday–Sunday layout optimized for a phone, likely a vertical day list rather than a cramped seven-column calendar.
- Each commitment card shows type, prescribed work, state, and scheduled date.
- Tap a card for complete, reschedule, edit note, or skip.
- Show completed activities without hiding the original plan.
- Allow browsing prior and future weeks.
- Protect wholesale plan editing behind an explicit Edit Plan mode.

### 12.3 Active workout screen

- Keep the screen awake when supported.
- Show elapsed time as optional context, never a completion requirement.
- Warm-up card first.
- Show one exercise group at a time with last performance and suggested load.
- Make set entry large and thumb-friendly.
- Provide Substitute at exercise level.
- Preserve partial work automatically.
- Finish Workout summarizes exercises, sets, and any new progression milestones.

### 12.4 Kitchen screen

Top-level sections on one screen or internal tabs:

- Use Soon
- Fresh List
- What Can I Make
- Saved Dishes

Prominent actions:

- Add Fresh Groceries
- Log Home Meal
- Add Dish
- Ask ChatGPT

### 12.5 Progress screen

Default to a concise recent period rather than an analytics dashboard. Recommended modules:

- Current and recent weekly adherence cards
- Running mileage bars: planned versus actual
- Exercise progression list with latest achievement
- Home-meal weekly counts
- Weight trend line

Avoid composite “health scores” that hide what behavior needs attention.

## 13. Data model

Use stable UUIDs and explicit schema versions. Suggested entities follow; implementation may refine field names while preserving behavior.

### 13.1 `planPrograms`

- `id`
- `name`
- `startDate`
- `endDate`
- `status`: active, completed, archived
- `createdAt`
- `updatedAt`

### 13.2 `planSessions`

- `id`
- `programId`
- `type`: easy_run, long_run, race, strength, rest
- `originalDate`
- `scheduledDate`
- `title`
- `plannedDistanceMiles`, nullable
- `workoutTemplateId`, nullable
- `required`
- `status`: upcoming, waiting, completed, skipped
- `completedAt`, nullable
- `actualDistanceMiles`, nullable
- `notes`, nullable

### 13.3 `workoutTemplates`

- `id`
- `name`
- `warmupSteps`
- `exerciseDefinitions`
- `active`
- `createdAt`
- `updatedAt`

### 13.4 `exercises`

- `id`
- `name`
- `movementPattern`
- `repMin`
- `repMax`
- `targetSets`
- `defaultIncrementLb`
- `substituteExerciseIds`
- `optional`

### 13.5 `workoutLogs`

- `id`
- `planSessionId`, nullable for ad hoc workouts
- `templateId`
- `startedAt`
- `completedAt`, nullable
- `status`: in_progress, completed, abandoned
- `notes`, nullable

### 13.6 `setLogs`

- `id`
- `workoutLogId`
- `plannedExerciseId`
- `performedExerciseId`
- `setNumber`
- `weightLb`
- `reps`
- `completedAt`

### 13.7 `mealLogs`

- `id`
- `occurredAt`
- `mealDate`: local calendar date used for daily-slot credit
- `mealType`: breakfast, work_lunch, dinner, other
- `type`: home_prepared, ate_out
- `dishId`, nullable
- `leftovers`
- `notes`, nullable

### 13.8 `mealGoals`

- `id`
- `mealType`: breakfast, work_lunch, dinner
- `label`
- `targetPerWeek`
- `eligibleWeekdays`
- `effectiveFrom`
- `effectiveUntil`, nullable
- `enabled`
- `createdAt`
- `updatedAt`

### 13.9 `dishes`

- `id`
- `name`
- `ingredients`: array of display and normalized names
- `notes`, nullable
- `sourceUrl`, nullable
- `photoRef`, nullable
- `wouldMakeAgain`, nullable
- `createdAt`
- `updatedAt`

Times cooked and last cooked should preferably be derived from `mealLogs` to avoid inconsistency.

### 13.10 `freshItems`

- `id`
- `name`
- `normalizedName`
- `addedAt`
- `attentionAt`
- `state`: recent, use_soon, removed
- `removedAt`, nullable
- `notes`, nullable

### 13.11 `measurements`

- `id`
- `type`: weight, waist
- `value`
- `unit`
- `measuredAt`
- `notes`, nullable

### 13.12 `settings`

- `weekStartsOn`: Monday
- `distanceUnit`: miles
- `weightUnit`: pounds
- `homeMealWeeklyGoal`: derived compatibility summary of enabled meal commitments
- `freshItemAttentionDays`: default 7
- `calendarRemindersEnabled`: default false
- `schemaVersion`

## 14. Offline, privacy, and backup

- Core application operations work offline after the first successful load.
- All data is stored in IndexedDB.
- No analytics or telemetry by default.
- No secrets are shipped to the browser.
- Export creates a versioned JSON backup containing all structured data and, if feasible within a reasonable size, compressed dish photos.
- Restore validates with Zod before writing.
- Invalid or future-version backups fail safely without modifying current data.
- Restore should preview counts and require confirmation.
- Document that clearing browser/site data can erase local information and encourage periodic backup.

## 15. PWA and GitHub Pages requirements

- Installable manifest with standalone display.
- iPhone safe-area handling.
- Appropriate app icons and theme colors.
- App shell cached for offline use.
- Update notification when a new deployed version is ready.
- GitHub Pages-compatible relative/base paths.
- GitHub Actions workflow runs tests and production build before deployment.
- No server is assumed.

## 16. Calendar reminders — final priority

Implement only after the complete core product is working and tested.

Preferred version-one reminder design:

- Export planned sessions as calendar events or an `.ics` file.
- Let the phone calendar provide reliable notifications.
- Keep in-app waiting/overdue prompts regardless of calendar use.

Do not implement Web Push in the initial release. Reliable closed-app push would require server infrastructure, which conflicts with the static GitHub Pages architecture.

## 17. Onboarding

Keep onboarding short and skippable:

1. Explain that data stays on this device.
2. Confirm September 7 plan start and December 13 race.
3. Confirm default units: miles and pounds.
4. Choose a weekly home-meal goal, suggesting five.
5. Seed the approved running and strength program.
6. Land on Today.

Do not ask for weight, waist, injuries, calorie goals, current lifts, notification permission, or a complete pantry during onboarding.

## 18. Accessibility and interaction

- Meet WCAG AA contrast.
- Minimum comfortable mobile tap targets.
- Do not encode status by color alone.
- Support reduced motion.
- Label numeric inputs clearly for screen readers.
- Provide visible focus states.
- Use plain language and short action labels.
- Confirm destructive data deletion and backup restore.
- Allow undo for ordinary record deletion where practical.

## 19. Implementation phases

### Phase 1 — Foundation

- Scaffold from the architectural conventions of `simple-budget-pwa` without copying budget-specific domain code.
- Configure PWA, Dexie, routing/view state, styling primitives, tests, and GitHub Pages build.
- Implement schema and backup/restore foundations.

### Phase 2 — Fitness plan and Today

- Seed exact running plan and gym template.
- Build plan-session state and rescheduling.
- Build Today and weekly Plan views.
- Implement simple run completion.

### Phase 3 — Active strength workout

- Warm-up sequence
- Exercise/set logging
- Draft persistence
- Substitutions
- Double-progression recommendations
- Workout completion and history

### Phase 4 — Kitchen

- One-tap time-aware home-meal logging
- Configurable Breakfast, Work Lunch, and Dinner commitments
- Daily-slot deduplication and weekly progress
- Batch Fresh List entry
- Use Soon logic
- Saved Dishes
- Local dish matching
- Ask ChatGPT prompt generation/copy/open flow

### Phase 5 — Progress

- Weekly adherence
- Running plan versus actual
- Strength history
- Meal counts
- Weekly weight and optional waist trend

### Phase 6 — Polish and release

- Accessibility review
- Offline and install testing
- Backup/restore verification
- Responsive and iPhone safe-area QA
- Documentation
- GitHub Pages deployment

### Phase 7 — Lowest-priority enhancements

- Calendar/ICS reminders
- Paste-receipt-text experiment
- Optional dish-photo refinements
- Post-race plan editing tools

## 20. Acceptance criteria

### 20.1 Core application

- The app installs as a PWA and relaunches in standalone mode.
- After an initial load, core functionality works offline.
- Refreshing or closing the PWA does not lose committed data or an active workout draft.
- A valid backup can restore into an empty database and reproduce all structured records.

### 20.2 Fitness

- The exact September 7–December 13 plan is visible by week.
- A planned session can be moved within its week without being marked failed.
- An incomplete prior-day session appears as waiting.
- End-of-week incomplete sessions become skipped and do not roll over.
- A run can be completed by confirming/editing only actual distance.
- The full warm-up is visible without requiring five separate checkoffs.
- A user can complete the prescribed strength workout, substitute any exercise, and log every set.
- The next session receives a correct deterministic double-progression recommendation.
- Race week does not expect a Thursday gym workout.

### 20.3 Kitchen

- A home-prepared meal can be logged in no more than two taps when no dish is selected.
- Leftovers count as home-prepared meals.
- Breakfast, Work Lunch, and Dinner commitments can be configured independently.
- Today infers a useful meal type and logs it in one tap.
- At most one adherence credit is awarded per configured daily meal slot.
- Work-lunch credits respect configured Monday–Friday eligibility.
- Changing a meal target does not rewrite prior-week denominators.
- Meal commitments and the Fresh List are both visible as top-level Kitchen actions.
- Multiple Fresh List items can be entered in one text/dictation field.
- Fresh items become Use Soon after the configured interval.
- The user can keep, cook with, or remove a Use Soon item.
- A Saved Dish can be created with only a name; all other fields are optional.
- Relevant dishes appear for matching fresh ingredients.
- Ask ChatGPT creates a complete prompt containing the Fresh List and Saved Dish summaries, copies it, and offers to open ChatGPT.
- No OpenAI API key or server is required.

### 20.4 Progress

- Weekly fitness adherence uses that week’s actual planned commitments.
- Running shows planned and actual distance without pace.
- Strength history shows exercise loads and reps.
- Home-prepared meal commitments are counted by category and week.
- Weekly weight can be logged without a target weight or body-fat estimate.

## 21. Testing priorities

Automated tests should emphasize domain rules rather than component snapshots:

- Exact seeded plan dates and distances
- Rescheduling inside a week
- Week-boundary skipping and non-rollover
- Adherence denominators during taper and race week
- Partial run completion
- Exercise substitution history
- Double-progression success, hold, and deload cases
- Active-workout draft recovery
- Home-meal counting including leftovers
- Meal-type inference, eligible weekdays, daily-slot deduplication, and effective-dated goals
- Fresh-item batch parsing and seven-day Use Soon transition
- Dish ingredient normalization/matching
- Prompt generation with full lists and safe handling of empty lists
- Dexie migrations
- Backup validation and round-trip restore
- Offline asset configuration and GitHub Pages base paths

## 22. Future considerations, not commitments

- A new post-race strength/running phase
- A/B strength templates after the repeated routine is established
- True receipt-image parsing using a secure serverless backend and separately billed API
- Cloud synchronization if multi-device use becomes important
- Web Push if server infrastructure is intentionally adopted
- More sophisticated ingredient aliases

These should be considered only after observing actual use. The product should earn complexity rather than assume it.

## 23. Final product statement

Fitness Health PWA is an accountability tool, not a life-logging system. Its success is measured by whether the user opens it, immediately understands the next useful action, completes more planned training, cooks more meals, uses more fresh groceries, and can see meaningful progress without feeling burdened by tracking.
