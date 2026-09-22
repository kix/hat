import { Text } from '@mantine/core';
import { useI18n } from '../../i18n/i18n';
import classes from './StreakBadge.module.css';

interface StreakBadgeProps {
  streak: number;
}

export function StreakBadge({ streak }: StreakBadgeProps) {
  const { t } = useI18n();

  if (streak < 3) return null;

  return (
    <div className={classes.streakBadge}>
      <span className={classes.fireIcon}>🔥</span>
      <Text size="xs" fw={800} style={{ color: '#fff', textTransform: 'uppercase' }}>
        {streak >= 5 ? t('rp.onFireStreak', { n: streak }) : t('rp.streak', { n: streak })}
      </Text>
    </div>
  );
}
