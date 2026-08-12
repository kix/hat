import { Button, Card, Container, Divider, Group, Select, Stack, Text, Title, Badge } from '@mantine/core';
import { IconCopy, IconLogout } from '@tabler/icons-react';
import type { HatContext, HatEvent } from '../../machine/hatMachine';
import type { Participant } from '../../auth/useMultiplayer';
import { RoundSettingsForm } from './RoundSettingsForm';
import { useI18n } from '../../i18n/i18n';

interface LobbyScreenProps {
  roomId: string;
  isHost: boolean;
  participants: Participant[];
  context: HatContext;
  send: (event: HatEvent) => void;
  onLeave: () => void;
  onStartGame: () => void;
}

export function LobbyScreen({
  roomId,
  isHost,
  participants,
  context,
  send,
  onLeave,
  onStartGame,
}: LobbyScreenProps) {
  const { t } = useI18n();
  const joinUrl = `${window.location.origin}${window.location.pathname}?join=${roomId}`;

  const copyToClipboard = () => {
    void navigator.clipboard.writeText(joinUrl);
    alert(t('lobby.linkCopied'));
  };

  // Проверяем, сколько команд полностью укомплектовано (по 2 игрока в каждой)
  const configuredTeamsCount = context.teams.filter(
    (team) => team.players[0].name && team.players[1].name
  ).length;

  const canStart =
    (context.settings.gameMode === 'pairs' ? configuredTeamsCount >= 1 : configuredTeamsCount >= 2) &&
    context.dictionary !== null;

  const handleAssignPlayer = (teamId: string, playerIndex: 0 | 1, value: string | null) => {
    const selectedPart = participants.find((p) => p.userId === value);
    const playerName = selectedPart ? selectedPart.name : '';
    const playerId = selectedPart ? selectedPart.userId : '';

    send({
      type: 'UPDATE_PLAYER_NAME',
      teamId,
      playerId: playerIndex === 0 ? context.teams.find((t) => t.id === teamId)!.players[0].id : context.teams.find((t) => t.id === teamId)!.players[1].id,
      name: playerName,
      newPlayerId: playerId || undefined,
    });
  };

  // Варианты выбора игроков из участников для селектора
  const playerOptions = participants.map((p) => ({
    value: p.userId,
    label: p.name + (p.isHost ? t('lobby.hostSuffix') : ''),
  }));

  return (
    <Container size="xs" py="lg">
      <Stack gap="lg">
        {/* Шапка с кодом комнаты */}
        <Card withBorder padding="md" style={{ background: 'rgba(0,0,0,0.02)' }}>
          <Stack align="center" gap="xs">
            <Text size="xs" c="dimmed" fw={600} style={{ letterSpacing: 1 }}>
              {t('lobby.roomCode')}
            </Text>
            <Title order={1} size={48} style={{ letterSpacing: 4 }}>
              {roomId}
            </Title>
            <Group gap="xs">
              <Button size="xs" variant="light" leftSection={<IconCopy size={14} />} onClick={copyToClipboard}>
                {t('lobby.copyLink')}
              </Button>
              <Button size="xs" color="red" variant="subtle" leftSection={<IconLogout size={14} />} onClick={onLeave}>
                {t('lobby.leave')}
              </Button>
            </Group>
          </Stack>
        </Card>

        {/* QR-код для подключения с мобильного */}
        <Card withBorder padding="sm">
          <Stack align="center" gap={6}>
            <Text size="xs" c="dimmed">
              {t('lobby.scanHint')}
            </Text>
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(joinUrl)}`}
              alt="Room QR Code"
              style={{ display: 'block', borderRadius: 4 }}
            />
          </Stack>
        </Card>

        {/* Список участников в комнате */}
        <Card withBorder padding="md">
          <Stack gap="xs">
            <Group justify="space-between">
              <Text fw={600} size="sm">
                {t('lobby.participants')}
              </Text>
              <Badge variant="filled">{participants.length}</Badge>
            </Group>
            <Divider />
            <Stack gap={6}>
              {participants.map((p) => (
                <Group key={p.userId} justify="space-between">
                  <Text size="sm" fw={p.isHost ? 600 : 400}>
                    {p.name}
                  </Text>
                  {p.isHost && (
                    <Badge size="xs" color="yellow">
                      {t('lobby.host')}
                    </Badge>
                  )}
                </Group>
              ))}
            </Stack>
          </Stack>
        </Card>

        {/* Настройка команд (только для хоста) */}
        <Card withBorder padding="md">
          <Stack gap="md">
            <Text fw={600} size="sm">
              {t('lobby.teamAssignment')}
            </Text>
            <Divider />

            {context.teams.map((team) => (
              <Card withBorder key={team.id} padding="xs" radius="sm">
                <Stack gap="xs">
                  <Group justify="space-between">
                    <Text fw={600} size="sm">
                      {context.settings.gameMode === 'pairs' ? t('setup.players') : team.name}
                    </Text>
                  </Group>

                  {isHost ? (
                    <Group grow gap="xs">
                      <Select
                        placeholder={t('lobby.explainerPlaceholder')}
                        data={playerOptions}
                        value={participants.find(p => p.name === team.players[0].name)?.userId || ''}
                        onChange={(val) => handleAssignPlayer(team.id, 0, val)}
                        clearable
                        searchable
                      />
                      <Select
                        placeholder={t('lobby.guesserPlaceholder')}
                        data={playerOptions}
                        value={participants.find(p => p.name === team.players[1].name)?.userId || ''}
                        onChange={(val) => handleAssignPlayer(team.id, 1, val)}
                        clearable
                        searchable
                      />
                    </Group>
                  ) : (
                    <Group grow gap="xs">
                      <Card withBorder padding="xs" bg="gray.0" ta="center">
                        <Text size="xs" c="dimmed">{t('lobby.explains')}</Text>
                        <Text size="sm" fw={500} truncate>{team.players[0].name || '—'}</Text>
                      </Card>
                      <Card withBorder padding="xs" bg="gray.0" ta="center">
                        <Text size="xs" c="dimmed">{t('lobby.guesses')}</Text>
                        <Text size="sm" fw={500} truncate>{team.players[1].name || '—'}</Text>
                      </Card>
                    </Group>
                  )}
                </Stack>
              </Card>
            ))}

            {isHost && context.settings.gameMode !== 'pairs' && context.teams.length < 6 && (
              <Button size="xs" variant="light" onClick={() => send({ type: 'ADD_TEAM' })}>
                {t('lobby.addTeam')}
              </Button>
            )}
          </Stack>
        </Card>

        {/* Настройки раундов (хост редактирует, клиенты смотрят) */}
        <Card withBorder padding="md">
          <Stack gap="xs">
            <Text fw={600} size="sm">
              {t('lobby.gameSettings')}
            </Text>
            <Divider />
            {isHost ? (
              <RoundSettingsForm settings={context.settings} dictionary={context.dictionary} send={send} />
            ) : (
              <Stack gap="xs">
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">{t('lobby.roundTime')}</Text>
                  <Text size="sm" fw={500}>{t('lobby.secShort', { n: context.settings.roundDurationSec })}</Text>
                </Group>
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">{t('lobby.skipWords')}</Text>
                  <Text size="sm" fw={500}>{context.settings.allowSkip ? t('lobby.allowed') : t('lobby.forbidden')}</Text>
                </Group>
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">{t('lobby.wordCount')}</Text>
                  <Text size="sm" fw={500}>{context.settings.wordCount}</Text>
                </Group>
              </Stack>
            )}
          </Stack>
        </Card>

        {/* Кнопка запуска */}
        {isHost ? (
          <Button size="xl" color="blue" fullWidth disabled={!canStart} onClick={onStartGame}>
            {!canStart && configuredTeamsCount < (context.settings.gameMode === 'pairs' ? 1 : 2)
              ? (context.settings.gameMode === 'pairs' ? t('lobby.needPlayers') : t('lobby.needTeams'))
              : context.dictionary === null
              ? t('lobby.loadingDict')
              : t('lobby.startGame')}
          </Button>
        ) : (
          <Card withBorder padding="sm" bg="blue.0" ta="center">
            <Text size="sm" c="blue.7" fw={500}>
              {t('lobby.waitingHost')}
            </Text>
          </Card>
        )}
      </Stack>
    </Container>
  );
}
