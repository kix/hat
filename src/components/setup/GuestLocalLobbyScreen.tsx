import { useState, useRef, useEffect } from 'react';
import {
  Container,
  Stack,
  Title,
  Text,
  Card,
  Group,
  Badge,
  Button,
  ThemeIcon,
  List,
  Divider,
  Textarea,
} from '@mantine/core';
import {
  IconCheck,
  IconDevices,
  IconUsers,
  IconLogout,
  IconSend,
  IconSparkles,
} from '@tabler/icons-react';
import { useI18n } from '../../i18n/i18n';
import type { Participant } from '../../auth/useMultiplayer';
import type { HatEvent } from '../../machine/hatMachine';

interface GuestLocalLobbyScreenProps {
  roomId: string;
  playerName: string;
  participants: Participant[];
  onLeave: () => void;
  send?: (event: HatEvent) => void;
  totalCustomWords?: number;
}

export function GuestLocalLobbyScreen({
  roomId,
  playerName,
  participants,
  onLeave,
  send,
  totalCustomWords,
}: GuestLocalLobbyScreenProps) {
  const { t } = useI18n();
  const [wordInput, setWordInput] = useState('');
  const [mySubmittedWords, setMySubmittedWords] = useState<string[]>([]);
  const [addedAlert, setAddedAlert] = useState<number | null>(null);
  const alertTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (alertTimerRef.current) {
        window.clearTimeout(alertTimerRef.current);
      }
    };
  }, []);

  const handleAddWords = () => {
    const rawWords = wordInput
      .split(/[,\n]+/)
      .map((w) => w.trim())
      .filter((w) => w.length > 0);

    if (rawWords.length === 0) return;

    if (send) {
      send({ type: 'ADD_CUSTOM_WORDS', words: rawWords });
    }

    setMySubmittedWords((prev) => [...prev, ...rawWords]);
    setWordInput('');
    setAddedAlert(rawWords.length);

    if (alertTimerRef.current) {
      window.clearTimeout(alertTimerRef.current);
    }
    alertTimerRef.current = window.setTimeout(() => {
      setAddedAlert(null);
    }, 3500);
  };

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
            <Text size="sm">{t('localLobby.guestDesc')}</Text>

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

        {/* Add Words to Hat Card */}
        <Card withBorder padding="lg" radius="md" style={{ background: 'var(--mantine-color-body)' }}>
          <Stack gap="sm">
            <Group gap="xs" c="orange">
              <IconSparkles size={20} />
              <Text fw={700} size="sm">
                {t('localLobby.addWordsTitle')}
              </Text>
            </Group>
            <Text size="xs" c="dimmed">
              {t('localLobby.addWordsDesc')}
            </Text>

            <Textarea
              placeholder={t('localLobby.addWordsPlaceholder')}
              minRows={2}
              maxRows={5}
              autosize
              value={wordInput}
              onChange={(e) => setWordInput(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  handleAddWords();
                }
              }}
            />

            <Group justify="space-between" align="center">
              <Button
                size="sm"
                color="orange"
                variant="filled"
                leftSection={<IconSend size={16} />}
                disabled={wordInput.trim().length === 0}
                onClick={handleAddWords}
              >
                {t('localLobby.addWordsBtn')}
              </Button>

              {totalCustomWords !== undefined && totalCustomWords > 0 && (
                <Badge variant="outline" color="orange" size="sm">
                  {t('localLobby.totalInHat', { n: totalCustomWords })}
                </Badge>
              )}
            </Group>

            {addedAlert !== null && (
              <Badge color="green" variant="light" fullWidth size="lg">
                ✅ {t('localLobby.wordsAdded', { n: addedAlert })}
              </Badge>
            )}

            {mySubmittedWords.length > 0 && (
              <Stack gap={4} mt="xs">
                <Text size="xs" fw={600} c="dimmed">
                  {t('localLobby.myWords')} ({mySubmittedWords.length})
                </Text>
                <Group gap={6} wrap="wrap">
                  {mySubmittedWords.map((word, idx) => (
                    <Badge key={`${word}-${idx}`} size="sm" variant="dot" color="orange">
                      {word}
                    </Badge>
                  ))}
                </Group>
              </Stack>
            )}
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
        <Card
          padding="md"
          radius="md"
          style={{ background: 'rgba(25, 113, 194, 0.05)', border: '1px dashed rgba(25, 113, 194, 0.3)' }}
        >
          <Text size="xs" c="blue" fw={500} ta="center">
            {t('localLobby.guestWaitingNotice')}
          </Text>
        </Card>

        {/* Leave Button */}
        <Button color="red" variant="light" leftSection={<IconLogout size={16} />} onClick={onLeave}>
          {t('lobby.leave')}
        </Button>
      </Stack>
    </Container>
  );
}
