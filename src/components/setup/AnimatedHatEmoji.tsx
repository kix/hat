import styles from './AnimatedHatEmoji.module.css';

export function AnimatedHatEmoji() {
  return (
    <span className={styles.hat} role="img" aria-label="Шляпа">
      🎩
    </span>
  );
}
