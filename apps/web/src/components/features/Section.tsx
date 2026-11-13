import type { ReactNode } from 'react';

export interface SectionProps {
  id: string;
  title: string;
  text: string;
  children: ReactNode;
  /** The figures the block computed, shown under it: the block's own proof. */
  proof?: ReactNode;
}

/**
 * One block of the catalogue: a title, what the capability does, the live
 * example that proves it, and the figures it produced. The `feature-<id>` test
 * id is what the page's own test counts, so a block cannot quietly disappear.
 */
export function Section({ id, title, text, children, proof }: SectionProps) {
  return (
    <section className="feature-block" data-testid={`feature-${id}`} id={`feature-${id}`}>
      <h3>{title}</h3>
      <p className="feature-text">{text}</p>
      {children}
      {proof}
    </section>
  );
}
