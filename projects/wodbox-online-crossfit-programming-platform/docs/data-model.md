# WODBox Data Model

## Core Entities

### User
- id (UUID, PK)
- email (unique, not null)
- password_hash (not null)
- display_name (not null)
- level: beginner | intermediate | advanced (default: intermediate)
- unit_preference: kg | lb (default: kg)
- role: athlete | admin (default: athlete)
- created_at, updated_at

### Workout
- id (UUID, PK)
- title (e.g., "Monday 250414")
- publish_date (date, unique, not null) — the day this workout goes live
- is_published (boolean, default false)
- coach_notes (text, optional) — internal notes not shown to athletes
- created_at, updated_at

### WorkoutSection
- id (UUID, PK)
- workout_id (FK → Workout)
- section_type: warmup | strength | metcon | cooldown (not null)
- sort_order (int, not null)
- title (optional, e.g., "Back Squat 5×5")
- description (text, optional — general section instructions)

### WorkoutExercise
- id (UUID, PK)
- section_id (FK → WorkoutSection)
- exercise_id (FK → Exercise)
- prescription (text, not null — e.g., "5 reps", "400m", "max reps")
- sort_order (int)
- rest_interval (text, optional — e.g., "90 sec between sets")
- scaling_notes (text, optional)

### Exercise
- id (UUID, PK)
- name (text, unique, not null — e.g., "Thruster")
- slug (text, unique, not null — URL-safe identifier)
- description (text, not null)
- movement_standards (text, not null — what counts as a valid rep)
- demo_url (text, optional — YouTube/Vimeo link)
- category: weightlifting | gymnastics | monostructural | bodyweight (not null)
- scaling_progression (text, optional — e.g., "Pull-up → Banded pull-up → Ring row")
- created_at, updated_at

### WorkoutLog
- id (UUID, PK)
- user_id (FK → User)
- workout_id (FK → Workout)
- logged_at (timestamp, not null)
- result_type: for_time | amrap | max_load | other (not null)
- result_value (text, not null — e.g., "8:42", "15 rounds + 3 reps", "100kg")
- is_rx (boolean — did athlete do prescribed version?)
- notes (text, optional)
- section_logs (jsonb, optional — per-section breakdown if applicable)
- created_at

## Relationships
- Workout 1:N WorkoutSection (cascade delete)
- WorkoutSection 1:N WorkoutExercise (cascade delete)
- Exercise 1:N WorkoutExercise
- User 1:N WorkoutLog
- Workout 1:N WorkoutLog

## Constraints
- Workout.publish_date must be unique (one published workout per day)
- WorkoutLog (user_id, workout_id) should have a unique constraint (one log per athlete per workout)
- Exercise.slug must be URL-safe and unique
- WorkoutSection.sort_order must be unique within a Workout
- WorkoutExercise.sort_order must be unique within a WorkoutSection