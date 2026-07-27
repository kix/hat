import { useI18n } from '../../i18n/i18n';
import styles from './AnimatedHatEmoji.module.css';

export function AnimatedHatEmoji() {
  const { t } = useI18n();
  return (
    <span className={styles.hat} role="img" aria-label={t('hatEmoji.aria')}>
      🎩
    </span>
  );
}
