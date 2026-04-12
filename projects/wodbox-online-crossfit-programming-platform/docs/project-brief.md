# WODBox — Online CrossFit Programming Platform

## Vision
WODBox is a virtual CrossFit box: a web platform that delivers a fresh, complete, and well-programmed CrossFit workout every day. Athletes open the app, see today's session, understand exactly what to do, and log their results.

## Core User Stories

### Athlete (primary user)
- As an athlete, I want to see today's complete workout (warm-up, strength, metcon, cool-down) so I can train effectively.
- As an athlete, I want scaling options for every workout so I can train at my level.
- As an athlete, I want to see movement demos and standards so I perform exercises correctly.
- As an athlete, I want to log my results (time, reps, loads) so I can track progress.
- As an athlete, I want to see my workout history so I can measure improvement.
- As an athlete, I want the experience to work perfectly on my phone.

### Coach/Admin
- As a coach, I want to program workouts days/weeks in advance so athletes always have content.
- As a coach, I want to publish/unpublish workouts so I control the release schedule.
- As a coach, I want to define scaling tiers per workout so all levels are served.
- As a coach, I want to manage the exercise library so movements are well-documented.

## Key Features (MVP)

1. **Daily WOD Page** — The hero feature. Shows today's complete session broken into sections (warm-up, strength/skill, metcon, cool-down). Each section lists movements, reps/rounds, loads, and time domains. Scaling options visible per exercise.

2. **Authentication & Profiles** — Email/password signup and login. Athlete profile with name, current level (beginner/intermediate/advanced), and unit preference (kg/lb).

3. **Exercise Library** — Catalog of CrossFit movements (air squat, thruster, pull-up, muscle-up, etc.) with: name, description, movement standards, demo video URL, scaling progressions, and category tags (gymnastics, weightlifting, monostructural, etc.).

4. **Workout Logging** — After completing a workout, athletes log results: time to complete, rounds completed (for AMRAPs), loads used, and optional notes. Results are saved to history.

5. **Workout History & Progress** — Athletes can view past workouts and logged results. Basic progress indicators (PR tracking for benchmark workouts).

6. **Admin Workout Programming** — Coach-facing interface to create workout drafts, set publish dates, define sections (warm-up, strength, metcon, cool-down), attach exercises from the library, and add scaling tiers and coach notes.

7. **Responsive Mobile-First Design** — The app must be designed and tested mobile-first. Most athletes interact during or around training time from their phones.

## Out of Scope (Post-MVP)
- Leaderboards and social features
- Subscription/payment integration
- Video hosting (use YouTube/Vimeo embeds)
- Custom programming per individual athlete
- Push notifications
- Progressive Web App / offline mode
- Multi-language support

## Technical Direction
- Monorepo with separate frontend and backend
- Frontend: React SPA, mobile-first responsive design, Tailwind CSS
- Backend: Hono HTTP API server, PostgreSQL database
- Authentication: JWT-based email/password auth
- Deployment: single service, server serves compiled SPA + API

## Design Principles
- **Clarity over aesthetics**: Athletes need to read workouts quickly, often mid-breath. Typography and spacing matter more than visual flair.
- **Speed**: The daily WOD page must load fast. This is the most visited page by far.
- **Progressive disclosure**: Default view shows the workout at a glance. Tap to expand sections, see demos, or log results.
- **CrossFit authenticity**: Use proper CrossFit terminology (WOD, metcon, AMRAP, EMOM, RX, scaled, etc.). The app should feel like it was made by people who train.