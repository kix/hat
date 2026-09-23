import { Badge, type MantineSize } from '@mantine/core';
import { useI18n } from '../../i18n/i18n';

interface StageBadgeProps {
  stageIndex: number;
  size?: MantineSize;
  variant?: 'light' | 'filled' | 'outline';
}

const STAGE_COLORS: Record<number, string> = {
  1: 'blue',
  2: 'grape',
  3: 'teal',
};

export function StageBadge({ stageIndex, size = 'sm', variant = 'light' }: StageBadgeProps) {
  const { t } = useI18n();

  const badgeKey =
    stageIndex === 1
      ? 'stage.badge1'
      : stageIndex === 2
        ? 'stage.badge2'
        : 'stage.badge3';

  const color = STAGE_COLORS[stageIndex] || 'blue';

  return (
    <Badge color={color} size={size} variant={variant}>
      {t(badgeKey)}
    </Badge>
  );
}
