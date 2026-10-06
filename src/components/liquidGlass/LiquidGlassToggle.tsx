import { useState } from 'react';
import { ActionIcon, Modal, Stack, Title, Text, Group, Button, Switch, Badge, Card, ThemeIcon, Tooltip } from '@mantine/core';
import { IconSparkles, IconCopy, IconCheck, IconExternalLink, IconFlame, IconLeaf } from '@tabler/icons-react';
import { useLiquidGlass } from '../../theme/LiquidGlassContext';
import { useI18n } from '../../i18n/i18n';

export function LiquidGlassToggle() {
  const { t } = useI18n();
  const { isLiquidGlass, ecoMode, toggleLiquidGlass, toggleEcoMode, glassUrl, copyGlassUrl } = useLiquidGlass();
  const [opened, setOpened] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const success = await copyGlassUrl();
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      <Tooltip label={t('glass.toggleTooltip')} withArrow>
        <ActionIcon
          variant={isLiquidGlass ? 'filled' : 'default'}
          color={isLiquidGlass ? 'grape' : undefined}
          radius="xl"
          size="lg"
          onClick={() => setOpened(true)}
          aria-label={t('glass.title')}
          style={{
            position: 'relative',
            ...(isLiquidGlass
              ? {
                  boxShadow: '0 0 16px rgba(174, 62, 201, 0.45)',
                }
              : {}),
          }}
        >
          <IconSparkles size={18} />
          {isLiquidGlass && (
            <span
              style={{
                position: 'absolute',
                top: 2,
                right: 2,
                width: 6,
                height: 6,
                borderRadius: '50%',
                backgroundColor: '#38d9a9',
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
            <ThemeIcon size="md" radius="xl" color="grape" variant="light">
              <IconSparkles size={18} />
            </ThemeIcon>
            <Title order={3} size="h4" fw={700}>
              {t('glass.modalTitle')}
            </Title>
          </Group>
        }
        centered
        radius="lg"
      >
        <Stack gap="md">
          <Card withBorder padding="md" radius="md">
            <Group justify="space-between" align="center">
              <div>
                <Text fw={600} size="sm">
                  {t('glass.enableTitle')}
                </Text>
                <Text size="xs" c="dimmed">
                  {t('glass.enableDesc')}
                </Text>
              </div>
              <Switch
                size="md"
                color="grape"
                checked={isLiquidGlass}
                onChange={toggleLiquidGlass}
              />
            </Group>
          </Card>

          {isLiquidGlass && (
            <>
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

              <Card withBorder padding="md" radius="md" style={{ background: 'rgba(174, 62, 201, 0.05)' }}>
                <Stack gap="xs">
                  <Group justify="space-between" align="center">
                    <Text fw={600} size="sm">
                      {t('glass.dedicatedUrlTitle')}
                    </Text>
                    <Badge color="grape" variant="dot" size="xs">
                      {t('glass.separateVersion')}
                    </Badge>
                  </Group>
                  <Text size="xs" c="dimmed">
                    {t('glass.dedicatedUrlDesc')}
                  </Text>
                  <Group gap="xs" grow>
                    <Button
                      size="xs"
                      variant="light"
                      color="grape"
                      leftSection={copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                      onClick={handleCopy}
                    >
                      {copied ? t('glass.copied') : t('glass.copyUrl')}
                    </Button>
                    <Button
                      size="xs"
                      variant="outline"
                      color="grape"
                      component="a"
                      href={glassUrl}
                      target="_blank"
                      rel="noopener"
                      leftSection={<IconExternalLink size={14} />}
                    >
                      {t('glass.openUrl')}
                    </Button>
                  </Group>
                </Stack>
              </Card>
            </>
          )}

          <Button fullWidth variant="light" color="gray" onClick={() => setOpened(false)}>
            {t('common.close')}
          </Button>
        </Stack>
      </Modal>
    </>
  );
}
