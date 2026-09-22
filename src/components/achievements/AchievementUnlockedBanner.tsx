import { useEffect, useState } from 'react';
import { Card, Stack, Group, Title, Text, Badge, ThemeIcon, CloseButton, Transition } from '@mantine/core';
import { IconSparkles, IconTrophy } from '@tabler/icons-react';
import confetti from 'canvas-confetti';
import { useI18n } from '../../i18n/i18n';
import type { AchievementDefinition } from '../../utils/achievements';

interface AchievementUnlockedBannerProps {
  achievements: AchievementDefinition[];
}

export function AchievementUnlockedBanner({ achievements }: AchievementUnlockedBannerProps) {
  const { t } = useI18n();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (achievements.length > 0) {
      try {
        confetti({
          particleCount: 50,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {
        // Ignore in environments where canvas is not supported
      }
    }
  }, [achievements]);

  if (!visible || achievements.length === 0) return null;

  return (
    <Transition mounted={visible} transition="slide-down" duration={300}>
      {(styles) => (
        <Card
          style={{
            ...styles,
            background: 'linear-gradient(135deg, rgba(250, 176, 5, 0.15) 0%, rgba(253, 126, 20, 0.1) 100%)',
            borderColor: 'rgba(250, 176, 5, 0.4)',
            boxShadow: '0 4px 20px rgba(250, 176, 5, 0.15)',
          }}
          withBorder
          padding="md"
          radius="md"
        >
          <Stack gap="xs">
            <Group justify="space-between" align="center">
              <Group gap="xs">
                <ThemeIcon color="yellow" variant="filled" size="md" radius="xl">
                  <IconTrophy size={16} />
                </ThemeIcon>
                <Title order={4} size="sm" c="yellow.8" fw={700}>
                  {t('profile.newAchievementUnlocked')}
                </Title>
              </Group>
              <CloseButton size="sm" onClick={() => setVisible(false)} aria-label="Close" />
            </Group>

            <Stack gap="xs" mt={4}>
              {achievements.map((ach) => (
                <Card key={ach.id} withBorder padding="xs" radius="sm" style={{ background: 'var(--mantine-color-body)' }}>
                  <Group justify="space-between" align="center" wrap="nowrap">
                    <Group gap="sm" wrap="nowrap">
                      <Text size="xl">{ach.emoji}</Text>
                      <Stack gap={1}>
                        <Text size="sm" fw={700}>
                          {t(ach.titleKey)}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {t(ach.descKey)}
                        </Text>
                      </Stack>
                    </Group>
                    <Badge color="yellow" variant="light" size="md" leftSection={<IconSparkles size={12} />}>
                      +{ach.xpReward} XP
                    </Badge>
                  </Group>
                </Card>
              ))}
            </Stack>
          </Stack>
        </Card>
      )}
    </Transition>
  );
}
