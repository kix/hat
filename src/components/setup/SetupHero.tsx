import { Group, Title } from '@mantine/core';
import { AnimatedHatEmoji } from './AnimatedHatEmoji';
import { AuthMenu } from '../auth/AuthMenu';
import { LiquidGlassToggle } from '../liquidGlass/LiquidGlassToggle';
import { useI18n } from '../../i18n/i18n';
import styles from './SetupHero.module.css';

interface SetupHeroProps {
  onViewProfile?: () => void;
  onViewLeaderboard?: () => void;
}

export function SetupHero({ onViewProfile, onViewLeaderboard }: SetupHeroProps = {}) {
  const { t } = useI18n();
  return (
    <div className={styles.hero}>
      <div className={styles.topActions}>
        <LiquidGlassToggle />
        <AuthMenu onViewProfile={onViewProfile} onViewLeaderboard={onViewLeaderboard} />
      </div>
      <Group justify="center" gap="xs">
        <AnimatedHatEmoji />
        <Title order={1} ta="center" className={styles.title}>
          {t('app.title')}
        </Title>
      </Group>
    </div>
  );
}
