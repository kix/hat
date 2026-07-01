import { Group, Title } from '@mantine/core';
import { AnimatedHatEmoji } from './AnimatedHatEmoji';
import styles from './SetupHero.module.css';

export function SetupHero() {
  return (
    <div className={styles.hero}>
      <Group justify="center" gap="xs">
        <AnimatedHatEmoji />
        <Title order={1} ta="center" className={styles.title}>
          Шляпа
        </Title>
      </Group>
    </div>
  );
}
