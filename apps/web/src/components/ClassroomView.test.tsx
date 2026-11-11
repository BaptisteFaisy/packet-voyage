// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '../test-utils.tsx';
import { ClassroomView } from './ClassroomView.tsx';
import { allowedKmForDelay, rejectionExercise } from '../lib/classroom.ts';

describe('ClassroomView (VOY-F-45)', () => {
  it('VOY-F-45 the hand computation of §7.14 hop 4 allows 1,439 km in 9.6 ms', () => {
    expect(allowedKmForDelay(9.6)).toBe(1439);
    expect(rejectionExercise().choices.length).toBe(2);
  });

  it('VOY-F-45 compute by hand, choose the possible city, then check — correct path', () => {
    renderWithProviders(<ClassroomView />);
    fireEvent.change(screen.getByTestId('classroom-km'), { target: { value: '1439' } });
    fireEvent.click(screen.getByTestId('classroom-choice-paris'));
    fireEvent.click(screen.getByTestId('classroom-check'));
    const result = screen.getByTestId('classroom-result');
    expect(result.className).toContain('correct');
    expect(result.textContent).toContain('1,439 km');
    expect(result.textContent).toContain('rejected by light');
  });

  it('VOY-F-45 choosing the city the light rejects is reported wrong', () => {
    renderWithProviders(<ClassroomView />);
    fireEvent.change(screen.getByTestId('classroom-km'), { target: { value: '1439' } });
    fireEvent.click(screen.getByTestId('classroom-choice-ashburn'));
    fireEvent.click(screen.getByTestId('classroom-check'));
    expect(screen.getByTestId('classroom-result').className).toContain('wrong');
  });

  it('VOY-F-45 an empty answer is not marked wrong, just incomplete', () => {
    renderWithProviders(<ClassroomView />);
    fireEvent.click(screen.getByTestId('classroom-check'));
    const result = screen.getByTestId('classroom-result');
    expect(result.className).not.toContain('wrong');
    expect(result.className).not.toContain('correct');
  });
});
