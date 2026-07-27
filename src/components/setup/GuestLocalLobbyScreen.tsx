import { Container, Stack, Title, Text, Card, Group, Badge, Button, ThemeIcon, List } from '@mantine/core';
import { IconCheck, IconDevices, IconUsers, IconLogout } from '@tabler/icons-react';
import { useI18n } from '../../i18n/i18n';
import type { Participant } from '../../auth/useMultiplayer';

interface GuestLocalLobbyScreenProps {
  roomId: string;
  playerName: string;
  participants: Participant[];
  onLeave: () => void;
}

export function GuestLocalLobbyScreen({
  roomId,
  playerName,
  participants,
  onLeave,
}: GuestLocalLobbyScreenProps) {
  const { t } = useI18n();

  // Filter out the host since they are not a guest in the list (or keep them)
  const otherParticipants = participants.filter((p) => p.name !== playerName);

  return (
    <Container size="xs" py="xl" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center' }}>
      <Stack gap="lg" style={{ width: '100%' }}>
        
        {/* Title / Hero */}
        <Stack align="center" gap={6} style={{ textAlign: 'center' }}>
          <ThemeIcon size={64} radius="xl" color="green" variant="light">
            <IconCheck size={36} />
          </ThemeIcon>
          <Title order={1} size={32} fw={800} style={{ letterSpacing: -0.5 }}>
            {t('localLobby.guestTitle')}
          </Title>
          <Text size="sm" c="dimmed">
            {t('localLobby.guestSubtitle')}
          </Text>
        </Stack>

        {/* Info Card */}
        <Card withBorder padding="lg" radius="md" style={{ background: 'var(--mantine-color-body)' }}>
          <Stack gap="md">
            <Text size="sm">
              {t('localLobby.guestDesc')}
            </Text>

            <Divider />

            <Group justify="space-between">
              <Text size="sm" fw={600} c="dimmed">
                {t('localLobby.guestStatus')}
              </Text>
              <Badge color="green" variant="light" size="lg">
                <span dangerouslySetInnerHTML={{ __html: t('localLobby.guestConnectedAs', { name: playerName }) }} />
              </Badge>
            </Group>

            <Group justify="space-between">
              <Text size="sm" fw={600} c="dimmed">
                {t('localLobby.guestRoomCode')}
              </Text>
              <Text fw={700} size="lg" style={{ letterSpacing: 2 }}>
                {roomId}
              </Text>
            </Group>
          </Stack>
        </Card>

        {/* Players List Card */}
        <Card withBorder padding="md" radius="md">
          <Stack gap="xs">
            <Group gap="xs" c="blue">
              <IconUsers size={18} />
              <Text fw={600} size="sm">
                {t('localLobby.guestPlayersInLobby')}
              </Text>
            </Group>

            {otherParticipants.length === 0 ? (
              <Text size="xs" c="dimmed" py="xs" ta="center">
                {t('localLobby.noPlayersYet')}
              </Text>
            ) : (
              <List spacing="xs" size="sm" center>
                {otherParticipants.map((p) => (
                  <List.Item
                    key={p.userId}
                    icon={
                      <ThemeIcon color="blue" size={16} radius="xl">
                        <IconDevices size={10} />
                      </ThemeIcon>
                    }
                  >
                    <Text size="sm" fw={500}>
                      {p.name} {p.isHost ? `(${t('lobby.host')})` : ''}
                    </Text>
                  </List.Item>
                ))}
              </List>
            )}
          </Stack>
        </Card>

        {/* Waiting Card / Notice */}
        <Card padding="md" radius="md" style={{ background: 'rgba(25, 113, 194, 0.05)', border: '1px dashed rgba(25, 113, 194, 0.3)' }}>
          <Text size="xs" c="blue" fw={500} ta="center">
            {t('localLobby.guestWaitingNotice')}
          </Text>
        </Card>

        {/* Leave Button */}
        <Button
          color="red"
          variant="light"
          leftSection={<IconLogout size={16} />}
          onClick={onLeave}
        >
          {t('lobby.leave')}
        </Button>

      </Stack>
    </Container>
  );
}

import { Divider } from '@mantine/core';
