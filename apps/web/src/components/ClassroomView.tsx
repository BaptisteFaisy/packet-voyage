import { useState } from 'react';
import { useI18n } from '../i18n/context.tsx';
import { checkAnswer, rejectionExercise } from '../lib/classroom.ts';
import type { CheckResult, ClassroomChoice } from '../lib/classroom.ts';

function CityChoice({ entry, selected, onSelect }: { entry: ClassroomChoice; selected: boolean; onSelect: () => void }) {
  const { t } = useI18n();
  const label = entry.id === 'paris' ? t('classroom.choiceParis') : t('classroom.choiceAshburn');
  return (
    <label className="classroom-choice">
      <input
        type="radio"
        name="city"
        value={entry.id}
        checked={selected}
        onChange={onSelect}
        data-testid={`classroom-choice-${entry.id}`}
      />
      {label}
    </label>
  );
}

function ResultMessage({ result }: { result: CheckResult | null }) {
  const { t } = useI18n();
  if (result === 'correct') {
    return (
      <p className="classroom-result correct" role="status" data-testid="classroom-result">
        {t('classroom.success')}
      </p>
    );
  }
  if (result === 'wrong') {
    return (
      <p className="classroom-result wrong" role="status" data-testid="classroom-result">
        {t('classroom.failure')}
      </p>
    );
  }
  if (result === 'empty') {
    return (
      <p className="classroom-result" role="status" data-testid="classroom-result">
        {t('classroom.empty')}
      </p>
    );
  }
  return null;
}

/**
 * Classroom mode (VOY-F-45): the activity sheet — compute by hand the
 * distance a delay permits, choose the possible city, then check.
 */
export function ClassroomView() {
  const { t } = useI18n();
  const exercise = rejectionExercise();
  const [answerKm, setAnswerKm] = useState('');
  const [choice, setChoice] = useState<string | null>(null);
  const [result, setResult] = useState<CheckResult | null>(null);

  const verify = () => setResult(checkAnswer(exercise, answerKm, choice));

  return (
    <section className="classroom-view" data-testid="classroom-view">
      <h2>{t('classroom.title')}</h2>
      <p>{t('classroom.subtitle')}</p>
      <h3>{t('classroom.step1')}</h3>
      <p>{t('classroom.step1Text')}</p>
      <fieldset className="classroom-exercise">
        <legend>{t('classroom.exerciseDelay')}</legend>
        <p>
          <label htmlFor="classroom-km">{t('classroom.q1')}</label>
        </p>
        <p className="classroom-hint">{t('classroom.q1Hint')}</p>
        <input
          id="classroom-km"
          type="text"
          inputMode="decimal"
          value={answerKm}
          onChange={(event) => setAnswerKm(event.target.value)}
          data-testid="classroom-km"
        />
        <p>{t('classroom.q2')}</p>
        {exercise.choices.map((entry) => (
          <CityChoice
            key={entry.id}
            entry={entry}
            selected={choice === entry.id}
            onSelect={() => setChoice(entry.id)}
          />
        ))}
      </fieldset>
      <button type="button" onClick={verify} data-testid="classroom-check">
        {t('classroom.checkButton')}
      </button>
      <ResultMessage result={result} />
    </section>
  );
}
