import { useState } from 'react';
import {
  ActionIcon,
  Modal,
  Stack,
  Title,
  Text,
  Group,
  Button,
  Switch,
  Badge,
  Card,
  ThemeIcon,
  Tooltip,
  SegmentedControl,
  SimpleGrid,
} from '@mantine/core';
import {
  IconSparkles,
  IconCopy,
  IconCheck,
  IconExternalLink,
  IconFlame,
  IconLeaf,
  IconBox,
  IconPalette,
  IconLayersSubtract,
} from '@tabler/icons-react';
import { useDesignTheme, type DesignThemeMode } from '../../theme/LiquidGlassContext';
import { useI18n } from '../../i18n/i18n';
import { Interactive3DHat } from '../3d/Interactive3DHat';

export function LiquidGlassToggle() {
  const { t } = useI18n();
  const {
    designTheme,
    setDesignTheme,
    isLiquidGlass,
    is3D,
    ecoMode,
    toggleEcoMode,
    glassUrl,
    threeDUrl,
    copyGlassUrl,
    copy3DUrl,
  } = useDesignTheme();

  const [opened, setOpened] = useState(false);
  const [copiedType, setCopiedType] = useState<'glass' | '3d' | null>(null);

  const handleCopy = async (type: 'glass' | '3d') => {
    const success = type === 'glass' ? await copyGlassUrl() : await copy3DUrl();
    if (success) {
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2000);
    }
  };

  const currentIcon = is3D ? (
    <IconBox size={18} />
  ) : isLiquidGlass ? (
    <IconSparkles size={18} />
  ) : (
    <IconPalette size={18} />
  );

  return (
    <>
      <Tooltip label={t('glass.toggleTooltip')} withArrow>
        <ActionIcon
          variant={is3D || isLiquidGlass ? 'filled' : 'default'}
          color={is3D ? 'blue' : isLiquidGlass ? 'grape' : undefined}
          radius="xl"
          size="lg"
          onClick={() => setOpened(true)}
          aria-label={t('glass.title')}
          style={{
            position: 'relative',
            ...(is3D
              ? { boxShadow: '0 0 16px rgba(77, 171, 247, 0.55)' }
              : isLiquidGlass
              ? { boxShadow: '0 0 16px rgba(174, 62, 201, 0.45)' }
              : {}),
          }}
        >
          {currentIcon}
          {(is3D || isLiquidGlass) && (
            <span
              style={{
                position: 'absolute',
                top: 2,
                right: 2,
                width: 6,
                height: 6,
                borderRadius: '50%',
                backgroundColor: is3D ? '#74c0fc' : '#38d9a9',
              }}
            />
          )}
        </ActionIcon>
      </Tooltip>

      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title={
          <Group gap="xs">
            <ThemeIcon size="md" radius="xl" color={is3D ? 'blue' : 'grape'} variant="light">
              {currentIcon}
            </ThemeIcon>
            <Title order={3} size="h4" fw={700}>
              {t('glass.modalTitle')}
            </Title>
          </Group>
        }
        centered
        radius="lg"
        size="md"
      >
        <Stack gap="md">
          {/* Theme Selector */}
          <div>
            <Text fw={600} size="sm" mb={6}>
              {t('glass.themeSelectorTitle')}
            </Text>
            <SegmentedControl
              fullWidth
              size="sm"
              value={designTheme}
              onChange={(v) => setDesignTheme(v as DesignThemeMode)}
              data={[
                {
                  value: 'classic',
                  label: (
                    <Group gap={6} justify="center">
                      <IconLayersSubtract size={15} />
                      <span>{t('glass.selectClassic')}</span>
                    </Group>
                  ),
                },
                {
                  value: 'glass',
                  label: (
                    <Group gap={6} justify="center">
                      <IconSparkles size={15} />
                      <span>{t('glass.selectGlass')}</span>
                    </Group>
                  ),
                },
                {
                  value: '3d',
                  label: (
                    <Group gap={6} justify="center">
                      <IconBox size={15} />
                      <span>{t('glass.select3D')}</span>
                    </Group>
                  ),
                },
              ]}
            />
          </div>

          {/* 3D Mode Details & Mini Interactive Preview */}
          {is3D && (
            <Card withBorder padding="sm" radius="md" style={{ background: 'rgba(77, 171, 247, 0.06)' }}>
              <Stack gap="xs" align="center">
                <Text size="xs" c="dimmed" ta="center">
                  {t('glass.mode3DDesc')}
                </Text>
                <Interactive3DHat size={140} showParticles={!ecoMode} />
                <Badge color="blue" variant="light" size="xs">
                  WebGL 3D Interactive
                </Badge>
              </Stack>
            </Card>
          )}

          {/* Glass Mode Details */}
          {isLiquidGlass && (
            <Card withBorder padding="md" radius="md" style={{ background: 'rgba(174, 62, 201, 0.06)' }}>
              <Group justify="space-between" align="center">
                <div>
                  <Text fw={600} size="sm">
                    {t('glass.enableTitle')}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {t('glass.enableDesc')}
                  </Text>
                </div>
                <Badge color="grape" variant="light" size="sm">
                  Apple Glass
                </Badge>
              </Group>
            </Card>
          )}

          {/* Performance / Eco Mode */}
          {(isLiquidGlass || is3D) && (
            <Card withBorder padding="md" radius="md">
              <Stack gap="xs">
                <Group justify="space-between" align="center">
                  <Group gap="xs">
                    <ThemeIcon size="sm" radius="xl" color={ecoMode ? 'teal' : 'orange'} variant="light">
                      {ecoMode ? <IconLeaf size={14} /> : <IconFlame size={14} />}
                    </ThemeIcon>
                    <div>
                      <Text fw={600} size="sm">
                        {t('glass.performanceModeTitle')}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {ecoMode ? t('glass.ecoModeDesc') : t('glass.ultraModeDesc')}
                      </Text>
                    </div>
                  </Group>
                  <Badge color={ecoMode ? 'teal' : 'grape'} variant="light" size="sm">
                    {ecoMode ? t('glass.eco') : t('glass.ultra')}
                  </Badge>
                </Group>
                <Switch
                  label={t('glass.enableEcoLabel')}
                  description={t('glass.enableEcoDesc')}
                  checked={ecoMode}
                  onChange={toggleEcoMode}
                  color="teal"
                />
              </Stack>
            </Card>
          )}

          {/* Dedicated URLs Box */}
          <Card withBorder padding="md" radius="md">
            <Stack gap="xs">
              <Group justify="space-between" align="center">
                <Text fw={600} size="sm">
                  {t('glass.dedicatedUrlTitle')}
                </Text>
                <Badge color="blue" variant="dot" size="xs">
                  {t('glass.separateVersion')}
                </Badge>
              </Group>
              <Text size="xs" c="dimmed">
                {t('glass.dedicatedUrlDesc')}
              </Text>

              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
                {/* Glass URL */}
                <Stack gap={4}>
                  <Text size="xs" fw={600}>
                    ✨ Liquid Glass:
                  </Text>
                  <Group gap={6} wrap="nowrap">
                    <Button
                      size="xs"
                      variant="light"
                      color="grape"
                      style={{ flex: 1 }}
                      leftSection={copiedType === 'glass' ? <IconCheck size={13} /> : <IconCopy size={13} />}
                      onClick={() => handleCopy('glass')}
                    >
                      {copiedType === 'glass' ? t('glass.copied') : t('glass.copyUrl')}
                    </Button>
                    <Button
                      size="xs"
                      variant="outline"
                      color="grape"
                      component="a"
                      href={glassUrl}
                      target="_blank"
                      rel="noopener"
                      px={8}
                    >
                      <IconExternalLink size={13} />
                    </Button>
                  </Group>
                </Stack>

                {/* 3D URL */}
                <Stack gap={4}>
                  <Text size="xs" fw={600}>
                    🎩 3D Spatial:
                  </Text>
                  <Group gap={6} wrap="nowrap">
                    <Button
                      size="xs"
                      variant="light"
                      color="blue"
                      style={{ flex: 1 }}
                      leftSection={copiedType === '3d' ? <IconCheck size={13} /> : <IconCopy size={13} />}
                      onClick={() => handleCopy('3d')}
                    >
                      {copiedType === '3d' ? t('glass.copied') : t('glass.copy3DUrl')}
                    </Button>
                    <Button
                      size="xs"
                      variant="outline"
                      color="blue"
                      component="a"
                      href={threeDUrl}
                      target="_blank"
                      rel="noopener"
                      px={8}
                    >
                      <IconExternalLink size={13} />
                    </Button>
                  </Group>
                </Stack>
              </SimpleGrid>
            </Stack>
          </Card>

          <Button fullWidth variant="light" color="gray" onClick={() => setOpened(false)}>
            {t('common.close')}
          </Button>
        </Stack>
      </Modal>
    </>
  );
}
