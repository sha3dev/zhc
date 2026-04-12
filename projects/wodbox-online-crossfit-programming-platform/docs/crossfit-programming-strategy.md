# WODBox CrossFit Programming Strategy

**Version**: 1.0
**Author**: Elite CrossFit Performance Coach (External Advisor)
**Date**: 2026-04-11
**Status**: Advisory — subject to CEO approval before engineering implementation

---

## Table of Contents

1. [Programming Methodology](#1-programming-methodology)
2. [Daily Session Template](#2-daily-session-template)
3. [Scaling Framework](#3-scaling-framework)
4. [Exercise Taxonomy](#4-exercise-taxonomy)
5. [Content Quality Checklist](#5-content-quality-checklist)

---

## 1. Programming Methodology

### 1.1 Core Model: Constantly Varied, Functional Movement, High Intensity

WODBox programming follows the CrossFit charter: constantly varied functional movements executed at high intensity relative to the athlete's capacity. "Constantly varied" does not mean random. It means structured variance — deliberate rotation across movement categories, time domains, and modalities so that no single domain is overtrained or neglected.

### 1.2 Three Modalities

Every training week must distribute work across the three CrossFit modalities:

| Modality | Examples | Adaptation Target |
|---|---|---|
| **Weightlifting** (M1) | Squats, deadlifts, presses, Olympic lifts | Strength, power, force production |
| **Gymnastics** (M2) | Pull-ups, dips, muscle-ups, handstand push-ups, L-sits | Bodyweight control, midline stability, coordination |
| **Monostructural** (M3) | Running, rowing, cycling, jump rope, skiing | Cardiovascular endurance, aerobic/anaerobic capacity |

### 1.3 Weekly Balance

A 7-day training week (5 active days, 2 rest days) should follow this template:

| Day | Focus | Primary Modality | Secondary Element |
|---|---|---|---|
| **Day 1** | Strength + Short Metcon | Weightlifting (heavy) | Gymnastics skill or short M3 |
| **Day 2** | Gymnastics Skill + Moderate Metcon | Gymnastics (skill/progression) | Mixed-modal conditioning |
| **Day 3** | Weightlifting + Longer Metcon | Weightlifting (moderate) | M3-biased metcon |
| **Day 4** | Rest | — | — |
| **Day 5** | Heavy Lift + Sprint Metcon | Weightlifting (heavy) | Short, intense metcon (< 8 min) |
| **Day 6** | Long Grinder | M3-heavy mixed modal | Gymnastics endurance |
| **Day 7** | Rest | — | — |

**Rules:**
- No more than 2 heavy weightlifting days per week.
- No more than 1 long metcon (> 15 min) per week.
- At least 1 pure gymnastics skill session per week.
- Every week includes at least one session from each time domain: short (< 8 min), medium (8–15 min), and long (> 15 min).
- No two consecutive heavy squat days. No heavy pulling (deadlift, clean) on consecutive training days.

### 1.4 Cyclical Programming (12-Week Macrocycle)

Each 12-week cycle is divided into three 4-week mesocycles:

| Mesocycle | Weeks | Emphasis | Load/Intensity |
|---|---|---|---|
| **Base** | 1–4 | Volume accumulation, movement quality, aerobic base building | Moderate loads (65–75% 1RM), higher rep schemes, longer metcons |
| **Build** | 5–8 | Intensity progression, heavier loads, skill consolidation | Building loads (75–85% 1RM), moderate volume, mixed time domains |
| **Peak** | 9–12 | Peak intensity, benchmark testing, competition-style workouts | High loads (85–95%+ 1RM), lower volume, short/sprint metcons |

**Cycle transition rules:**
- Week 4 of each mesocycle should be a slight deload (reduce volume 20–30%, maintain intensity).
- Include 1 benchmark workout per mesocycle to measure adaptation.
- Movement patterns rotate: if Back Squat is the primary squat in weeks 1–4, Front Squat becomes primary in weeks 5–8, and Overhead Squat in weeks 9–12.
- Olympic lifting progressions follow a similar rotation: Clean-focus → Snatch-focus → Jerk-focus.

### 1.5 Variance Rules

To ensure constantly varied programming:

1. **No repeated metcon structure** (same format, e.g., two AMRAPs in a row) on consecutive training days.
2. **No repeated primary lift** on consecutive training days.
3. **Time domain rotation**: never schedule more than 2 metcons in the same time domain in a row.
4. **Movement pattern collision avoidance**: see Section 2.5 (Interaction Rules).

### 1.6 Intensity Management

- Programmed intensity is relative to the athlete's level. RX loads and standards are targets, not mandates.
- Weekly training load should follow a wave: moderate → moderate-high → high → deload.
- If an athlete logs 3+ consecutive sessions at RX with declining performance or excessive soreness, the system should recommend a lighter session (this is a post-MVP feature, but the data model should support it).

---

## 2. Daily Session Template

### 2.1 Canonical Session Structure

Every WODBox daily session consists of four ordered sections:

```
┌─────────────────────────────────────────┐
│  1. WARM-UP           (8–12 min)        │
├─────────────────────────────────────────┤
│  2. STRENGTH / SKILL   (12–20 min)      │
├─────────────────────────────────────────┤
│  3. METCON            (5–20 min)        │
├─────────────────────────────────────────┤
│  4. COOL-DOWN          (5–8 min)        │
└─────────────────────────────────────────┘
  Total: 30–60 minutes
```

### 2.2 Section Definitions

#### 2.2.1 Warm-Up (8–12 min)

**Purpose**: Prepare the body for the specific demands of the session. Raise core temperature, mobilize joints relevant to the day's movements, activate stabilizers, and practice movement patterns at low intensity.

**Structure:**
1. **General warm-up** (3–5 min): Light monostructural work (row, bike, run, jump rope) — enough to break a sweat.
2. **Dynamic mobility** (2–4 min): Joint-specific mobilization targeting the day's primary movement patterns (e.g., hip openers on squat days, shoulder dislocates on pressing days).
3. **Movement prep** (3–5 min): Progressive rehearsal of the day's movements with PVC, empty barbell, or bodyweight. Build from pattern to load.

**Rules:**
- Never program static stretching in the warm-up.
- Warm-up movements should directly prepare for the strength/skill section.
- Include 2–4 specific mobility drills relevant to the session's primary movements.
- Provide movement-specific cues (e.g., "focus on keeping elbows high" for front squat warm-up).

#### 2.2.2 Strength / Skill (12–20 min)

**Purpose**: Develop absolute strength, explosive power (Olympic lifts), or gymnastics skill (bodyweight strength and positions). This is the primary adaptation driver for the session.

**Strength sessions** (weightlifting focus):
- Rep schemes: 5×5, 5×3, 3×3, 5×2, 1×5 (across multiple sets), or EMOM lifting
- Working loads: 65–95% of 1RM depending on mesocycle position
- Rest between sets: 90–180 seconds
- Time domain: 12–18 minutes including warm-up sets

**Skill sessions** (gymnastics focus):
- Progressive skill work: holds, negatives, banded variations, partial ROM
- Rep schemes: EMOM skill practice, max sets, or accumulator ladders
- Rest between efforts: 60–120 seconds
- Time domain: 10–15 minutes

**Rules:**
- One primary lift or skill per session. A secondary accessory is allowed (e.g., 3×12 DB walking lunges after back squats) but only after the primary work.
- Clearly state working percentages or RPE targets.
- Include a "build to" instruction when athletes should work up to a heavy set.

#### 2.2.3 Metcon (5–20 min)

**Purpose**: Metabolic conditioning — the heart rate-elevating, breathing-heavy component. This is where mixed-modal fitness is trained.

**Formats:**
| Format | Code | Description |
|---|---|---|
| For Time | `FOR_TIME` | Complete prescribed work as fast as possible. Time cap required. |
| AMRAP | `AMRAP` | As Many Rounds As Possible in fixed time. |
| EMOM | `EMOM` | Every Minute On the Minute — prescribed work each minute for set duration. |
| TABATA | `TABATA` | 20 sec work / 10 sec rest, 8 rounds. |
| CHIPPER | `CHIPPER` | Long list of reps, work through once. |
| LADDER | `LADDER` | Ascending or descending rep scheme each round. |

**Time domains and intent:**

| Duration | Primary Energy System | Typical Format |
|---|---|---|
| Short (< 8 min) | Anaerobic (phosphocreatine + glycolytic) | Sprint AMRAPs, low-rep chippers, heavy EMOMs |
| Medium (8–15 min) | Mixed aerobic/anaerobic | Standard couplets/triplets, moderate volume |
| Long (> 15 min) | Primarily aerobic | High-rep chippers, multiple-round AMRAPs, hero WODs |

**Rules:**
- Every metcon must have a time cap (for FOR_TIME formats) or a fixed duration (for AMRAP/EMOM).
- Metcon should contain 2–4 movements. Fewer movements = higher intensity. More movements = pacing and strategy.
- Avoid movements in the metcon that heavily tax the same pattern as the strength section (see Interaction Rules below).

#### 2.2.4 Cool-Down (5–8 min)

**Purpose**: Bring heart rate down, reduce muscle tone, begin recovery. Static stretching and positional holds targeting the session's worked muscle groups.

**Structure:**
1. **Cool-down movement** (2–3 min): Very light rowing, walking, or cycling to bring heart rate below 120 bpm.
2. **Static stretching** (3–5 min): 2–4 stretches held 30–60 seconds each, targeting the session's primary muscle groups.

**Rules:**
- Focus stretches on the muscles most worked in the session.
- Provide breathing cues ("breathe deeply, exhale into the stretch").
- This section is the lowest priority for data tracking but high priority for athlete recovery education.

### 2.3 Time Budget by Session Type

| Session Type | Warm-Up | Strength/Skill | Metcon | Cool-Down | Total |
|---|---|---|---|---|---|
| **Strength day** | 10 min | 18 min | 8 min | 5 min | ~41 min |
| **Gymnastics skill day** | 10 min | 15 min | 12 min | 5 min | ~42 min |
| **Metcon-heavy day** | 10 min | 12 min | 18 min | 5 min | ~45 min |
| **Benchmark/test day** | 12 min | 15 min | Varies | 8 min | ~35–50 min |

### 2.4 Time Cap Guidance

Every "For Time" metcon must include a time cap. Use this table to set caps:

| Metcon Reps (total) | Suggested Time Cap |
|---|---|
| < 50 reps | 5–8 min |
| 50–100 reps | 8–12 min |
| 100–200 reps | 12–18 min |
| > 200 reps or long monostructural | 18–25 min |

If more than 20% of RX athletes would reasonably exceed the cap, either reduce volume or increase the cap.

### 2.5 Interaction Rules (Within-Day Conflict Avoidance)

These rules prevent programming movements in the same session that create excessive fatigue on the same muscle group or pattern:

| If Strength Is... | Avoid in Metcon | Reason |
|---|---|---|
| Heavy back squat / front squat | Box jumps, wall balls, heavy lunges | Excessive quad/posterior chain fatigue |
| Heavy deadlift | Kettlebell swings, rowing (heavy), toes-to-bar | Posterior chain and grip fatigue |
| Heavy press / push jerk | Handstand push-ups, push-ups, burpees | Shoulder/tricep fatigue |
| Pull-ups (heavy volume) | Toes-to-bar, rope climbs | Grip and lat fatigue |
| Clean / snatch | Thrusters, squat cleans (unless intended) | Redundant hip and leg loading |
| Heavy bench press | Push-ups, HSPU, dips | Horizontal/vertical press redundancy |

**General principle**: If the strength section heavily taxes a muscle group or movement pattern, the metcon should use a different pattern. A well-programmed session balances push/pull, upper/lower, and anterior/posterior demands across the two sections.

---

## 3. Scaling Framework

### 3.1 Three-Tier Scaling Model

Every workout published on WODBox must include scaling guidance for three tiers:

| Tier | Code | Description | Target Athlete |
|---|---|---|---|
| **RX** | `RX` | As prescribed. Full range of motion, prescribed loads, and movement standards. | Experienced CrossFit athletes (1+ year consistent training) |
| **Intermediate** | `SCALED_INT` | Reduced load, modified movement, or substitution. Preserves the workout's intended stimulus. | Athletes with 3–12 months training who lack strength or skill for RX |
| **Beginner** | `SCALED_BEG` | Significantly simplified movements, very light loads, extended time caps. Prioritizes mechanics and safety. | New athletes (< 3 months), deconditioned individuals, or those with mobility limitations |

### 3.2 Scaling Principles

1. **Preserve the stimulus, not the movement.** If the workout's intent is a sprint (short, fast, breathing heavy), then the scaled version should still feel like a sprint. If you scale the movement but the athlete is now doing a slow grind, the scaling has failed.

2. **Scale load before complexity.** For weightlifting, reduce the load before substituting the movement. A lighter thruster is still a thruster. Only substitute when the athlete cannot safely perform the movement pattern at any load.

3. **Scale complexity before volume.** For gymnastics, reduce the movement difficulty before cutting reps. 5 strict pull-ups is better training than 15 banded pull-ups with poor mechanics.

4. **Never scale to nothing.** Every scaled option should still be challenging for the target athlete. If a movement is scaled so low that it requires no effort, the scaling is too aggressive.

5. **Explicitly state what changes.** Each scaled tier must say exactly what is different from the tier above it. "Scale as needed" is not acceptable.

### 3.3 Category-Specific Scaling Guidelines

#### 3.3.1 Weightlifting Scaling

| Lift Category | RX | Intermediate | Beginner |
|---|---|---|---|
| **Barbell lifts** (squat, press, deadlift) | Prescribed % of 1RM or fixed load | Reduce load to 70–80% of RX | Reduce load to 50–65% of RX; consider dumbbell or kettlebell substitute |
| **Olympic lifts** (clean, snatch, jerk) | Prescribed load, full squat | Reduce load 60–75% of RX; power variation allowed | Reduce load to 40–55% of RX; hang variation + power variation; or substitute with a simpler explosive movement (e.g., dumbbell snatch, med ball clean) |
| **Complex movements** (thruster, cluster, squat clean thruster) | Prescribed | Reduce load 70–80% of RX | Substitute with simpler multi-joint movement at lower load (e.g., front squat + push press separately) |

#### 3.3.2 Gymnastics Scaling

| Movement | RX | Intermediate | Beginner |
|---|---|---|---|
| **Pull-up** | Strict or kipping pull-up | Banded pull-up (light band) or negative pull-ups | Ring row or jumping pull-up |
| **Toes-to-bar** | Full TTB | Knees-to-elbows or knees-above-90° | Hanging knee raises or V-ups on floor |
| **Handstand push-up** | RX HSPU (deficit if prescribed) | Abmat HSPU or pike push-ups (elevated) | Pike push-ups (floor) or dumbbell shoulder press |
| **Muscle-up** | Bar or ring muscle-up | 2:1 pull-up + dip combo or banded MU | 3:1 pull-up + dip or jumping MU transition drill |
| **Double-under** | Double-unders | 2:1 single-unders or 1.5:1 single-unders with double-under attempts | Single-unders or penguin jumps |
| **Handstand walk** | Prescribed distance | Wall walk or wall-facing handstand hold | Bear crawl or plate overhead walk |
| **Ring dip** | Strict or kipping ring dip | Band-assisted ring dip | Box dip or push-up with range of motion emphasis |

#### 3.3.3 Monostructural Scaling

| Movement | RX | Intermediate | Beginner |
|---|---|---|---|
| **Running** (400m) | 400m run | 400m run (no pace change) or 300m row | 200m run or 250m row or 1 min bike |
| **Rowing** (calories or distance) | Prescribed cals/meters | Reduce by 20–30% | Reduce by 40–50% or substitute with light movement |
| **Assault bike / Echo bike** | Prescribed cals | Reduce by 20% | Reduce by 30–40% |
| **Jump rope** | Double-unders if prescribed | See gymnastics scaling above | Single-unders at 2:1 ratio |
| **Box jump** | RX height (24/20 inch) | Step-ups at RX height or lower box (20/16 inch) | Step-ups at lower height (16/12 inch) |

#### 3.3.4 Time Cap Scaling

| Metcon Duration | RX Cap | Intermediate Cap | Beginner Cap |
|---|---|---|---|
| Sprint (< 8 min) | As programmed | Add 1–2 min | Add 2–4 min or reduce rounds/reps by 25% |
| Medium (8–15 min) | As programmed | Add 2–3 min | Add 3–5 min or reduce rounds/reps by 25–33% |
| Long (> 15 min) | As programmed | Add 3–5 min | Reduce total volume by 30% and maintain original cap |

### 3.4 Scaling Decision Tree (for coaches programming)

When deciding how to scale a movement, follow this sequence:

```
1. Can the athlete perform the movement safely at RX load/standard?
   → YES: Program RX
   → NO: Go to 2

2. Can the athlete perform the movement safely at a reduced load?
   → YES: Reduce load (Intermediate tier)
   → NO: Go to 3

3. Can the athlete perform a simpler variation of the same movement pattern?
   → YES: Substitute with progression (Intermediate or Beginner tier)
   → NO: Go to 4

4. Substitute with a movement that trains the same fitness quality
   (e.g., can't do pull-ups → ring rows for pulling strength)
   → Program as Beginner tier
```

---

## 4. Exercise Taxonomy

### 4.1 Categories

| Code | Category | Description |
|---|---|---|
| `WL` | Weightlifting | Barbell, dumbbell, kettlebell, and loaded movements |
| `GYM` | Gymnastics | Bodyweight strength and skill movements (pulling, pushing, holds, inversions) |
| `MONO` | Monostructural | Cardio/endurance movements (running, rowing, cycling, jumping rope) |
| `BW` | Bodyweight | Bodyweight conditioning movements not typically classified as gymnastics skill (burpees, air squats, sit-ups) |

### 4.2 Essential Movement List (50 Movements)

#### Weightlifting (`WL`) — 18 Movements

| # | Movement | Primary Pattern | Scaling Progression (RX → Intermediate → Beginner) |
|---|---|---|---|
| 1 | **Back Squat** | Squat | Back Squat → Front Squat → Goblet Squat |
| 2 | **Front Squat** | Squat | Front Squat → Goblet Squat → Air Squat with pause |
| 3 | **Overhead Squat** | Squat/Overhead stability | OHS → Front Squat + OH hold → Goblet Squat |
| 4 | **Deadlift** | Hinge | Conventional DL → Sumo DL → Kettlebell DL |
| 5 | **Shoulder Press** | Vertical press | Strict Press → Push Press → Seated DB Press |
| 6 | **Push Press** | Vertical press (dynamic) | Push Press → Strict Press → Seated DB Press |
| 7 | **Push Jerk** | Vertical press (explosive) | Push Jerk → Push Press → Strict Press |
| 8 | **Split Jerk** | Vertical press (explosive) | Split Jerk → Push Jerk → Push Press |
| 9 | **Bench Press** | Horizontal press | Bench Press → DB Bench → Push-up variation |
| 10 | **Clean** | Olympic lift | Squat Clean → Power Clean → Hang Power Clean |
| 11 | **Snatch** | Olympic lift | Squat Snatch → Power Snatch → Hang Power Snatch → DB Snatch |
| 12 | **Thruster** | Squat + press combo | Barbell Thruster → DB Thruster → Front Squat + Push Press separate |
| 13 | **Sumo Deadlift High Pull** | Hip extension + pull | SDHP → Kettlebell Swing → DB High Pull |
| 14 | **Kettlebell Swing** | Hip hinge (dynamic) | KB Swing (Russian) → KB Swing (to eye level) → KB Deadlift |
| 15 | **Turkish Get-Up** | Full-body stability | Full TGU → Half TGU (to elbow) → Loaded roll-to-elbow |
| 16 | **Dumbbell Snatch** | Single-arm explosive | DB Snatch → DB High Pull → DB Swing |
| 17 | **Barbell Row** | Horizontal pull | BB Row → DB Row → Ring Row |
| 18 | **Weighted Lunge** | Unilateral leg | Barbell Lunge → DB Lunge → Bodyweight Lunge |

#### Gymnastics (`GYM`) — 16 Movements

| # | Movement | Primary Pattern | Scaling Progression (RX → Intermediate → Beginner) |
|---|---|---|---|
| 19 | **Pull-Up** | Vertical pull | Pull-Up → Banded Pull-Up → Negative Pull-Up → Ring Row |
| 20 | **Chest-to-Bar Pull-Up** | Vertical pull (extended ROM) | C2B Pull-Up → Pull-Up → Banded Pull-Up → Ring Row |
| 21 | **Bar Muscle-Up** | Vertical pull + transition | Bar MU → C2B Pull-Up + Dip → Pull-Up + Jumping Transition |
| 22 | **Ring Muscle-Up** | Vertical pull + push + transition | Ring MU → Bar MU → 2:1 Pull-Up + Ring Dip |
| 23 | **Ring Dip** | Vertical push | Ring Dip → Band-Assisted Ring Dip → Box Dip |
| 24 | **Handstand Push-Up** | Vertical push (inverted) | HSPU (deficit) → HSPU (Abmat) → Pike Push-Up → DB Shoulder Press |
| 25 | **Handstand Walk** | Balance (inverted) | HS Walk → Wall Walk → Bear Crawl |
| 26 | **Toes-to-Bar** | Core + hanging | TTB → Knees-to-Elbow → Hanging Knee Raise → V-Up |
| 27 | **Double-Under** | Jump rope (coordination) | Double-Under → 1.5:1 Single-Under with DU attempts → 2:1 Single-Under |
| 28 | **Muscle-Up Transition Drill** | Skill/accessory | Low-ring transition → Banded transition → Jumping transition |
| 29 | **L-Sit** | Core + support hold | L-Sit (rings/parallettes) → Tucked L-Sit → Hanging L-Sit → Hanging Knee Raise |
| 30 | **Pistol (Single-Leg Squat)** | Unilateral squat | Pistol → Pistol to Box → Assisted Pistol (band/ring) → Step-Up to balance |
| 31 | **Strict Handstand Push-Up** | Vertical push (strict) | Strict HSPU → Strict Pike Push-Up → DB Strict Press |
| 32 | **Rope Climb** | Vertical climb + grip | Rope Climb (legless) → Rope Climb (with legs) → Rope Pull-Up → Towel Pull-Up |
| 33 | **Wall Walk** | Inverted pressing / positioning | Wall Walk → Wall-facing partial walk → Inchworm |
| 34 | **False Grip Hang** | Skill/accessory (ring) | False Grip Hang → Active Hang → Dead Hang |

#### Monostructural (`MONO`) — 8 Movements

| # | Movement | Primary System | Scaling Progression |
|---|---|---|---|
| 35 | **Run** | Aerobic/anaerobic | RX distance → 75% distance → 50% distance or row/bike equivalent |
| 36 | **Row** (ergometer) | Aerobic/anaerobic | RX cals/meters → 75–80% cals/meters → 60% cals/meters |
| 37 | **Assault Bike / Echo Bike** | Aerobic/anaerobic | RX cals → 80% cals → 60% cals |
| 38 | **Ski Erg** | Aerobic/anaerobic (pulling) | RX cals/meters → 75% cals/meters → 60% cals/meters |
| 39 | **Bike (air or stationary)** | Aerobic | RX cals/meters → 80% → 60% |
| 40 | **Jump Rope (single-under)** | Aerobic/coordination | RX reps → 75% reps → Step-touch or low-impact equivalent |
| 41 | **Sprint Shuttle Run** | Anaerobic (agility) | RX distance → Reduced distance → Line drills |
| 42 | **Stair Climb / Step-Up (weighted)** | Aerobic + leg endurance | RX load/reps → Reduced load → Bodyweight |

#### Bodyweight (`BW`) — 8 Movements

| # | Movement | Primary Pattern | Scaling Progression |
|---|---|---|---|
| 43 | **Air Squat** | Squat | Air Squat → Box Squat → Assisted Squat (pole/ring) |
| 44 | **Push-Up** | Horizontal push | Push-Up → Push-Up from knees → Push-Up from box/wall |
| 45 | **Burpee** | Full-body conditioning | Burpee (chest-to-ground) → Burpee (no push-up) → Step-back burpee |
| 46 | **Sit-Up** (abmat) | Core flexion | Abmat Sit-Up → Crunch → Butterfly Sit-Up |
| 47 | **Box Jump** | Explosive hip extension | Box Jump → Step-Up → Step-Up to lower target |
| 48 | **Box Step-Up** | Unilateral leg | Weighted Step-Up → Bodyweight Step-Up → Lower box Step-Up |
| 49 | **Walking Lunge** | Unilateral leg | Walking Lunge → Reverse Lunge → Split Squat in place |
| 50 | **Hollow Body Hold** | Core stability | Hollow Hold (arms overhead) → Hollow Hold (arms by side) → Tucked Hollow Hold |

### 4.3 Movement Tagging System

Each exercise in the library should carry the following tags to support smart programming:

| Tag Type | Examples | Purpose |
|---|---|---|
| **Category** | `WL`, `GYM`, `MONO`, `BW` | Primary classification |
| **Primary Pattern** | `squat`, `hinge`, `vertical_push`, `vertical_pull`, `horizontal_push`, `horizontal_pull`, `core`, `cardio` | Movement pattern classification |
| **Plane** | `sagittal`, `frontal`, `transverse` | Movement plane (for variance tracking) |
| **Equipment** | `barbell`, `dumbbell`, `kettlebell`, `pull-up_bar`, `rings`, `rope`, `box`, `rower`, `bike`, `bodyweight` | Equipment requirement |
| **Complexity** | `basic`, `intermediate`, `advanced` | Movement difficulty / learning curve |
| **Joint Demand** | `shoulder`, `hip`, `knee`, `ankle`, `wrist`, `spine` | Primary joint stress (for fatigue management) |

---

## 5. Content Quality Checklist

### 5.1 Workout Entry — Required Fields

Every workout published on WODBox must pass this checklist before being published. Use this as both a coach-facing validation tool and an engineering constraint.

#### Workout-Level

- [ ] **Title**: Clear, descriptive title (e.g., "Monday 260413 — Heavy Back Squat + Sprint Metcon")
- [ ] **Publish date**: Set and unique (no duplicate dates)
- [ ] **Total session time**: Estimated total duration stated (e.g., "~45 min")
- [ ] **Coach notes**: Internal notes filled (even if brief — "Testing back squat 5RM, metcon is a sprint couplet")
- [ ] **Session type**: Tagged as `strength`, `skill`, `metcon_heavy`, `benchmark`, or `test`

#### Section-Level (per section)

- [ ] **Section type**: Warm-up, Strength, Metcon, or Cool-down
- [ ] **Title**: Descriptive section title (e.g., "Back Squat — Build to a Heavy 5")
- [ ] **Description**: General instructions for the section (what the athlete should do and why)
- [ ] **Time domain**: Estimated duration stated
- [ ] **Sort order**: Correct ordering within the workout

#### Exercise-Level (per exercise in a section)

- [ ] **Exercise linked**: Connected to an exercise in the library (not free text)
- [ ] **Prescription**: Clear rep/set scheme (e.g., "5 sets of 3 reps", "400m", "max reps unbroken")
- [ ] **Load**: Stated as fixed weight (e.g., "60/40 kg"), percentage (e.g., "75% of 1RM"), or RPE (e.g., "RPE 8")
- [ ] **Rest interval**: Stated for strength/skill sections (e.g., "90 sec between sets")
- [ ] **Movement standards**: Linked from exercise library or restated if modified for this workout
- [ ] **Scaling tiers present**: At least RX and one scaled option per exercise

#### Metcon-Specific

- [ ] **Format**: Explicitly stated (For Time, AMRAP, EMOM, etc.)
- [ ] **Time cap or duration**: Every metcon has a time boundary
- [ ] **Scoring**: How to score the workout (e.g., "Total time", "Rounds + reps completed", "Total load lifted")
- [ ] **Scaling intent note**: 1–2 sentences explaining the intended stimulus and how scaling preserves it (e.g., "This should be a 5-minute sprint. Scale load so you can do the first round unbroken.")

### 5.2 Movement Description Quality Standard

Every exercise in the library must have:

| Field | Standard |
|---|---|
| **Name** | Standard CrossFit name (no invented names) |
| **Description** | 2–4 sentences explaining the movement clearly. A knowledgeable athlete should understand what to do after reading it. |
| **Movement standards** | Bullet-point list of what counts as a valid rep (start position, end position, required range of motion). Must be unambiguous. |
| **Common faults** | Top 2–3 technique errors and brief correction cues. |
| **Scaling progression** | Ordered list from hardest to easiest variation. At least 3 levels. |
| **Category tags** | All applicable tags from Section 4.3 applied |
| **Demo URL** | Video link present (can be placeholder if no video yet, but must be flagged as missing) |

### 5.3 Coach Notes Quality Standard

Coach notes (internal, not athlete-facing) must answer:

1. **What is the primary stimulus?** (e.g., "Heavy single back squat + sprint couplet under 6 minutes")
2. **What is the scaling priority?** (e.g., "Load first. If athlete can't squat 60/40 kg, reduce to a weight they can cycle for 10+ reps unbroken.")
3. **What should coaching focus be?** (e.g., "Watch for forward lean out of the bottom of the squat. Cue 'chest up' and 'knees out'.")
4. **Are there safety concerns?** (e.g., "Box jumps after heavy squats — athletes may be unstable. Encourage step-downs for anyone feeling compromised.")

### 5.4 Publishing Gate

Before any workout can be published (`is_published = true`), the system should validate:

1. All required fields in Section 5.1 are present and non-empty.
2. Every exercise in every section links to an existing library exercise.
3. At least RX + one scaled tier is defined for every exercise in the metcon.
4. The metcon section has a format and time cap/duration.
5. No two workouts share the same publish date.
6. The workout contains all four section types (warm-up, strength, metcon, cool-down).

---

## Appendix A: Benchmark Workouts

The following benchmark workouts should be pre-loaded into the system for progress tracking:

| Benchmark | Type | Time Domain | Primary Test |
|---|---|---|---|
| **Fran** | For Time (couplet) | ~3–8 min | Thruster + pull-up cycling under fatigue |
| **Cindy** | AMRAP 20 min | 20 min | Bodyweight endurance (pull-up, push-up, squat) |
| **Grace** | For Time | ~2–6 min | Clean & jerk power output |
| **Helen** | For Time | ~8–14 min | Running + pull-up + kettlebell conditioning |
| **Filthy Fifty** | Chipper | ~15–25 min | Broad fitness across 10 movements |
| **Fight Gone Bad** | AMRAP-style | 15 min (3 rounds of 5 min) | Multi-modal work capacity |
| **Diane** | For Time | ~3–7 min | Deadlift + handstand push-up strength-endurance |
| **Annie** | For Time | ~4–9 min | Double-under + sit-up coordination and core |
| **Eva** | For Time | ~20–35 min | Long endurance: run, kettlebell swing, pull-up |
| **Nancy** | For Time | ~8–15 min | Running + overhead squat under fatigue |

## Appendix B: Weekly Programming Template (Blank)

Use this template when programming each week:

```
WEEK OF: [Date]
MESOCYCLE: [Base / Build / Peak] — Week [#]

DAY 1 — [Date]
  Warm-Up: [General] + [Specific mobility]
  Strength: [Primary lift], [Sets x Reps @ Load]
  Metcon: [Format], [Movements], [Time cap/duration]
  Scaling: [Key scaling notes]
  Cool-Down: [Target stretches]

DAY 2 — [Date]
  ...

DAY 3 — [Date]
  ...

DAY 4 — REST

DAY 5 — [Date]
  ...

DAY 6 — [Date]
  ...

DAY 7 — REST

WEEKLY REVIEW:
- Modality balance: WL [X sessions] | GYM [X sessions] | MONO [X sessions]
- Time domains: Short [X] | Medium [X] | Long [X]
- Heavy days: [X] (target: 2)
- Interaction conflicts: [None / List any]
- Benchmark included: [Yes/No — if yes, which one]
```

---

*This document is the authoritative reference for CrossFit programming standards on WODBox. All coach-facing tools, workout validators, and exercise library structures should be built to enforce these standards.*
