import { useI18n } from '../../i18n/i18n';
import { useDesignTheme } from '../../theme/LiquidGlassContext';
import { Interactive3DHat } from '../3d/Interactive3DHat';
import styles from './AnimatedHatEmoji.module.css';

export function AnimatedHatEmoji() {
  const { t } = useI18n();
  const { is3D } = useDesignTheme();

  if (is3D) {
    return (
      <div style={{ display: 'inline-flex', verticalAlign: 'middle', margin: '-8px 0' }}>
        <Interactive3DHat size={52} showParticles={false} />
      </div>
    );
  }

  return (
    <span className={styles.hat} role="img" aria-label={t('hatEmoji.aria')}>
      🎩
    </span>
  );
}
