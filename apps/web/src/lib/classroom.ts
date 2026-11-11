/**
 * Classroom mode (VOY-F-45): the activity sheet — compute by hand the
 * distance a delay permits, choose the possible city, then check.
 * Pure logic; the numbers are those of the worked example §7.14.
 */

export const LIGHT_VACUUM_KM_PER_MS = 299.79;

export interface ClassroomChoice {
  id: string;
  city: string;
  country: string;
  distanceKm: number;
  correct: boolean;
}

export interface ClassroomExercise {
  delayMs: number;
  allowedKm: number;
  choices: ClassroomChoice[];
}

/** Maximum one-way distance light covers in a vacuum during a round trip. */
export function allowedKmForDelay(delayMs: number, kmPerMs: number = LIGHT_VACUUM_KM_PER_MS): number {
  return Math.round((delayMs / 2) * kmPerMs);
}

/** The exercise built around hop 4 of the Lyon → Ashburn example. */
export function rejectionExercise(): ClassroomExercise {
  const delayMs = 9.6;
  return {
    delayMs,
    allowedKm: allowedKmForDelay(delayMs),
    choices: [
      { id: 'paris', city: 'Paris', country: 'FR', distanceKm: 391, correct: true },
      { id: 'ashburn', city: 'Ashburn', country: 'US', distanceKm: 6496, correct: false },
    ],
  };
}

export type CheckResult = 'correct' | 'wrong' | 'empty';

/** Verifies the student's hand-computed distance and city choice. */
export function checkAnswer(
  exercise: ClassroomExercise,
  studentKm: string,
  choiceId: string | null,
): CheckResult {
  if (choiceId === null || studentKm.trim() === '') return 'empty';
  const given = Number.parseFloat(studentKm.replace(',', '.'));
  if (Number.isNaN(given)) return 'wrong';
  const tolerance = Math.max(20, exercise.allowedKm * 0.05);
  const distanceOk = Math.abs(given - exercise.allowedKm) <= tolerance;
  const choice = exercise.choices.find((entry) => entry.id === choiceId);
  return distanceOk && choice?.correct ? 'correct' : 'wrong';
}
