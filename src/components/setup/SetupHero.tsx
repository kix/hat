import { Group, Title } from '@mantine/core';
import { AnimatedHatEmoji } from './AnimatedHatEmoji';
import { AuthMenu } from '../auth/AuthMenu';
import { useI18n } from '../../i18n/i18n';
import styles from './SetupHero.module.css';

export function SetupHero() {
  const { t } = useI18n();
  return (
    <div className={styles.hero}>
      <AuthMenu />
      <Group justify="center" gap="xs">
        <AnimatedHatEmoji />
        <Title order={1} ta="center" className={styles.title}>
          {t('app.title')}
        </Title>
      </Group>
    </div>
  );
}
