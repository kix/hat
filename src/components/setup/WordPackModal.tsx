import { Badge, Card, Group, Modal, SimpleGrid, Stack, Text, UnstyledButton } from '@mantine/core';
import { IconCheck } from '@tabler/icons-react';
import type { WordPack } from '../../machine/hatMachine';
import { THEMATIC_PACK_METAS } from '../../data/thematicPacks';
import { useI18n } from '../../i18n/i18n';
import { prefetchRuStandard } from '../../data/dictionaryLoader';

interface WordPackModalProps {
  opened: boolean;
  onClose: () => void;
  selectedPack: WordPack;
  onSelectPack: (pack: WordPack) => void;
}

export function WordPackModal({
  opened,
  onClose,
  selectedPack,
  onSelectPack,
}: WordPackModalProps) {
  const { t } = useI18n();

  const handleSelect = (pack: WordPack) => {
    onSelectPack(pack);
    onClose();
  };

  const standardPacks: { id: WordPack; emoji: string; title: string; desc: string }[] = [
    {
      id: 'frequent',
      emoji: '🔥',
      title: t('roundSettings.packFrequent'),
      desc: t('pack.movies.desc') ? 'Популярные и узнаваемые слова' : 'Popular and recognized words',
    },
    {
      id: 'standard',
      emoji: '📚',
      title: t('roundSettings.packAll'),
      desc: 'Полный базовый словарь (включая редкие)',
    },
  ];

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={<Text fw={700}>{t('roundSettings.wordPack')}</Text>}
      size="lg"
      centered
      styles={{
        body: { maxHeight: '75vh', overflowY: 'auto' },
      }}
    >
      <Stack gap="lg" onMouseEnter={prefetchRuStandard} onTouchStart={prefetchRuStandard}>
        {/* Базовые словари */}
        <div>
          <Text size="xs" fw={700} c="dimmed" tt="uppercase" mb="xs">
            {t('roundSettings.groupStandard')}
          </Text>
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
            {standardPacks.map((pack) => {
              const isSelected = selectedPack === pack.id;
              return (
                <UnstyledButton
                  key={pack.id}
                  onClick={() => handleSelect(pack.id)}
                  style={{ width: '100%' }}
                >
                  <Card
                    withBorder
                    p="sm"
                    radius="md"
                    bg={isSelected ? 'var(--mantine-color-blue-light)' : undefined}
                    style={{
                      borderColor: isSelected ? 'var(--mantine-color-blue-filled)' : undefined,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <Group justify="space-between" wrap="nowrap">
                      <Group gap="sm" wrap="nowrap">
                        <Text size="1.6rem">{pack.emoji}</Text>
                        <div>
                          <Text fw={600} size="sm">
                            {pack.title}
                          </Text>
                          <Text size="xs" c="dimmed" lineClamp={1}>
                            {pack.desc}
                          </Text>
                        </div>
                      </Group>
                      {isSelected && (
                        <Badge size="sm" circle color="blue">
                          <IconCheck size={12} />
                        </Badge>
                      )}
                    </Group>
                  </Card>
                </UnstyledButton>
              );
            })}
          </SimpleGrid>
        </div>

        {/* Тематические наборы */}
        <div>
          <Text size="xs" fw={700} c="dimmed" tt="uppercase" mb="xs">
            {t('roundSettings.groupThematic')}
          </Text>
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
            {THEMATIC_PACK_METAS.map((pack) => {
              const isSelected = selectedPack === pack.id;
              return (
                <UnstyledButton
                  key={pack.id}
                  onClick={() => handleSelect(pack.id)}
                  style={{ width: '100%' }}
                >
                  <Card
                    withBorder
                    p="sm"
                    radius="md"
                    bg={isSelected ? 'var(--mantine-color-grape-light)' : undefined}
                    style={{
                      borderColor: isSelected ? 'var(--mantine-color-grape-filled)' : undefined,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <Group justify="space-between" wrap="nowrap">
                      <Group gap="sm" wrap="nowrap">
                        <Text size="1.6rem">{pack.emoji}</Text>
                        <div>
                          <Text fw={600} size="sm">
                            {t(pack.titleKey)}
                          </Text>
                          <Text size="xs" c="dimmed" lineClamp={1}>
                            {t(pack.descKey)}
                          </Text>
                        </div>
                      </Group>
                      {isSelected && (
                        <Badge size="sm" circle color="grape">
                          <IconCheck size={12} />
                        </Badge>
                      )}
                    </Group>
                  </Card>
                </UnstyledButton>
              );
            })}
          </SimpleGrid>
        </div>

        {/* Свой список */}
        <div>
          <Text size="xs" fw={700} c="dimmed" tt="uppercase" mb="xs">
            {t('roundSettings.groupCustom')}
          </Text>
          <UnstyledButton
            onClick={() => handleSelect('custom')}
            style={{ width: '100%' }}
          >
            <Card
              withBorder
              p="sm"
              radius="md"
              bg={selectedPack === 'custom' ? 'var(--mantine-color-teal-light)' : undefined}
              style={{
                borderColor: selectedPack === 'custom' ? 'var(--mantine-color-teal-filled)' : undefined,
                cursor: 'pointer',
              }}
            >
              <Group justify="space-between" wrap="nowrap">
                <Group gap="sm" wrap="nowrap">
                  <Text size="1.6rem">✏️</Text>
                  <div>
                    <Text fw={600} size="sm">
                      {t('roundSettings.packCustom')}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {t('roundSettings.customLabel')} / {t('aiPack.btn')}
                    </Text>
                  </div>
                </Group>
                {selectedPack === 'custom' && (
                  <Badge size="sm" circle color="teal">
                    <IconCheck size={12} />
                  </Badge>
                )}
              </Group>
            </Card>
          </UnstyledButton>
        </div>
      </Stack>
    </Modal>
  );
}
