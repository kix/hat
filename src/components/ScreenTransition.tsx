import type { ReactNode } from 'react';
import styles from './ScreenTransition.module.css';

interface ScreenTransitionProps {
  children: ReactNode;
}

// Keyed by the caller with the current screen's state value, so switching
// screens remounts this wrapper (and replays the enter animation) instead of
// just updating its children in place.
export function ScreenTransition({ children }: ScreenTransitionProps) {
  return <div className={styles.screen}>{children}</div>;
}
