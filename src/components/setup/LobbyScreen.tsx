import { Button, Card, Container, Divider, Group, Select, Stack, Text, Title, Badge } from '@mantine/core';
import { IconCopy, IconLogout } from '@tabler/icons-react';
import type { HatContext, HatEvent } from '../../machine/hatMachine';
import type { Participant } from '../../auth/useMultiplayer';
import { RoundSettingsForm } from './RoundSettingsForm';

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
  const joinUrl = `${window.location.origin}${window.location.pathname}?join=${roomId}`;

  const copyToClipboard = () => {
    void navigator.clipboard.writeText(joinUrl);
    alert('Ссылка на комнату скопирована в буфер обмена!');
  };

  // Проверяем, сколько команд полностью укомплектовано (по 2 игрока в каждой)
  const configuredTeamsCount = context.teams.filter(
    (team) => team.players[0].name && team.players[1].name
  ).length;

  const canStart = configuredTeamsCount >= 2 && context.dictionary !== null;

  // Обработчик назначения игрока из списка участников в ячейку команды
  const handleAssignPlayer = (teamId: string, playerIndex: 0 | 1, value: string | null) => {
    const selectedPart = participants.find((p) => p.userId === value);
    const playerName = selectedPart ? selectedPart.name : '';
    const playerId = selectedPart ? selectedPart.userId : '';

    send({
      type: 'UPDATE_PLAYER_NAME',
      teamId,
      playerId: playerIndex === 0 ? context.teams.find((t) => t.id === teamId)!.players[0].id : context.teams.find((t) => t.id === teamId)!.players[1].id,
      name: playerName,
    });
    
    // Также можно сохранить ID игрока для дальнейшей идентификации
    if (playerId) {
      const team = context.teams.find((t) => t.id === teamId);
      if (team) {
        const playerSlot = team.players[playerIndex];
        playerSlot.id = playerId; // Перезаписываем ID на реальный userId
      }
    }
  };

  // Варианты выбора игроков из участников для селектора
  const playerOptions = participants.map((p) => ({
    value: p.userId,
    label: p.name + (p.isHost ? ' (Создатель)' : ''),
  }));

  return (
    <Container size="xs" py="lg">
      <Stack gap="lg">
        {/* Шапка с кодом комнаты */}
        <Card withBorder padding="md" style={{ background: 'rgba(0,0,0,0.02)' }}>
          <Stack align="center" gap="xs">
            <Text size="xs" c="dimmed" fw={600} style={{ letterSpacing: 1 }}>
              КОД КОМНАТЫ
            </Text>
            <Title order={1} size={48} style={{ letterSpacing: 4 }}>
              {roomId}
            </Title>
            <Group gap="xs">
              <Button size="xs" variant="light" leftSection={<IconCopy size={14} />} onClick={copyToClipboard}>
                Копировать ссылку
              </Button>
              <Button size="xs" color="red" variant="subtle" leftSection={<IconLogout size={14} />} onClick={onLeave}>
                Выйти
              </Button>
            </Group>
          </Stack>
        </Card>

        {/* QR-код для подключения с мобильного */}
        <Card withBorder padding="sm">
          <Stack align="center" gap={6}>
            <Text size="xs" c="dimmed">
              Отсканируйте камерой телефона для входа:
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
                Участники в комнате
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
                      Создатель
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
              Распределение по командам
            </Text>
            <Divider />

            {context.teams.map((team) => (
              <Card withBorder key={team.id} padding="xs" radius="sm">
                <Stack gap="xs">
                  <Group justify="space-between">
                    <Text fw={600} size="sm">
                      {team.name}
                    </Text>
                  </Group>

                  {isHost ? (
                    <Group grow gap="xs">
                      <Select
                        placeholder="Объясняющий"
                        data={playerOptions}
                        value={participants.find(p => p.name === team.players[0].name)?.userId || ''}
                        onChange={(val) => handleAssignPlayer(team.id, 0, val)}
                        clearable
                        searchable
                      />
                      <Select
                        placeholder="Угадывающий"
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
                        <Text size="xs" c="dimmed">Объясняет</Text>
                        <Text size="sm" fw={500} truncate>{team.players[0].name || '—'}</Text>
                      </Card>
                      <Card withBorder padding="xs" bg="gray.0" ta="center">
                        <Text size="xs" c="dimmed">Угадывает</Text>
                        <Text size="sm" fw={500} truncate>{team.players[1].name || '—'}</Text>
                      </Card>
                    </Group>
                  )}
                </Stack>
              </Card>
            ))}

            {isHost && context.teams.length < 6 && (
              <Button size="xs" variant="light" onClick={() => send({ type: 'ADD_TEAM' })}>
                + Добавить команду
              </Button>
            )}
          </Stack>
        </Card>

        {/* Настройки раундов (хост редактирует, клиенты смотрят) */}
        <Card withBorder padding="md">
          <Stack gap="xs">
            <Text fw={600} size="sm">
              Настройки игры
            </Text>
            <Divider />
            {isHost ? (
              <RoundSettingsForm settings={context.settings} dictionary={context.dictionary} send={send} />
            ) : (
              <Stack gap="xs">
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">Время раунда:</Text>
                  <Text size="sm" fw={500}>{context.settings.roundDurationSec} сек</Text>
                </Group>
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">Пропуск слов:</Text>
                  <Text size="sm" fw={500}>{context.settings.allowSkip ? 'Разрешен' : 'Запрещен'}</Text>
                </Group>
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">Количество слов:</Text>
                  <Text size="sm" fw={500}>{context.settings.wordCount}</Text>
                </Group>
              </Stack>
            )}
          </Stack>
        </Card>

        {/* Кнопка запуска */}
        {isHost ? (
          <Button size="xl" color="blue" fullWidth disabled={!canStart} onClick={onStartGame}>
            {!canStart && configuredTeamsCount < 2
              ? 'Настройте минимум 2 команды'
              : context.dictionary === null
              ? 'Загрузка словаря...'
              : 'Начать игру'}
          </Button>
        ) : (
          <Card withBorder padding="sm" bg="blue.0" ta="center">
            <Text size="sm" c="blue.7" fw={500}>
              Ожидание, пока создатель запустит игру...
            </Text>
          </Card>
        )}
      </Stack>
    </Container>
  );
}
