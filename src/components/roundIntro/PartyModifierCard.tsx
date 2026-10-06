import { Card, Group, Stack, Text, ThemeIcon, ActionIcon, Tooltip } from '@mantine/core';
import { IconDice, IconSparkles } from '@tabler/icons-react';
import { getModifierById } from '../../data/partyModifiers';
import { useI18n } from '../../i18n/i18n';
import type { HatEvent } from '../../machine/hatMachine';

interface PartyModifierCardProps {
  modifierId?: string | null;
  send: (event: HatEvent) => void;
}

export function PartyModifierCard({ modifierId, send }: PartyModifierCardProps) {
  const { lang, t } = useI18n();
  const modifier = getModifierById(modifierId);

  if (!modifier) return null;

  const title = lang === 'en' ? modifier.titleEn : modifier.titleRu;
  const desc = lang === 'en' ? modifier.descEn : modifier.descRu;

  return (
    <Card
      withBorder
      padding="md"
      radius="md"
      style={{
        background: 'linear-gradient(135deg, rgba(255, 146, 43, 0.08) 0%, rgba(250, 82, 82, 0.08) 100%)',
        borderColor: 'rgba(255, 146, 43, 0.35)',
      }}
    >
      <Stack gap="xs">
        <Group justify="space-between" wrap="nowrap" align="center">
          <Group gap="xs" wrap="nowrap">
            <ThemeIcon size="lg" radius="xl" color="orange" variant="light">
              <IconSparkles size={18} />
            </ThemeIcon>
            <div>
              <Text size="xs" fw={700} c="orange" tt="uppercase" style={{ letterSpacing: 0.5 }}>
                {t('partyModifiers.badge')}
              </Text>
              <Text size="sm" fw={700}>
                {modifier.emoji} {title}
              </Text>
            </div>
          </Group>

          <Tooltip label={t('partyModifiers.reroll')} withArrow>
            <ActionIcon
              variant="subtle"
              color="orange"
              size="lg"
              onClick={() => send({ type: 'REROLL_MODIFIER' })}
              aria-label={t('partyModifiers.reroll')}
            >
              <IconDice size={20} />
            </ActionIcon>
          </Tooltip>
        </Group>

        <Text size="xs" c="dimmed" style={{ lineHeight: 1.4 }}>
          {desc}
        </Text>
      </Stack>
    </Card>
  );
}
