import { Container, Divider, Stack, Title, Button, Card, Text, Group, Badge } from '@mantine/core';
import { IconQrcode, IconCopy, IconCheck, IconUsers, IconTrash } from '@tabler/icons-react';
import type { HatContext, HatEvent } from '../../machine/hatMachine';
import { TeamList } from './TeamList';
import { RoundSettingsForm } from './RoundSettingsForm';
import { StartGameButton } from './StartGameButton';
import { SetupHero } from './SetupHero';
import { useI18n } from '../../i18n/i18n';
import type { MultiplayerState } from '../../auth/useMultiplayer';
import { useState } from 'react';

interface SetupScreenProps {
  context: HatContext;
  send: (event: HatEvent) => void;
  onBack?: () => void;
  multiplayer?: MultiplayerState;
}

export function SetupScreen({ context, send, onBack, multiplayer }: SetupScreenProps) {
  const { t } = useI18n();
  const [loadingQr, setLoadingQr] = useState(false);

  const hasRoom = !!multiplayer?.roomId;
  
  // Build the join link for scanning
  const joinUrl = hasRoom
    ? `${window.location.origin}${window.location.pathname}?join=${multiplayer.roomId}`
    : '';

  const handleStartQrSession = async () => {
    if (!multiplayer) return;
    setLoadingQr(true);
    try {
      // Create room with a special flag isLocalLobby in state
      const hostName = context.teams[0]?.players[0]?.name || t('default.player');
      await multiplayer.createRoom(hostName, {
        ...context,
        isLocalLobby: true,
      } as any);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingQr(false);
    }
  };

  const handleCloseQrSession = () => {
    if (multiplayer) {
      multiplayer.leaveRoom();
    }
  };

  const copyToClipboard = () => {
    if (!joinUrl) return;
    navigator.clipboard.writeText(joinUrl);
    alert(t('lobby.linkCopied'));
  };

  const handleAutoDistribute = () => {
    if (!multiplayer || multiplayer.participants.length === 0) return;
    
    const participants = multiplayer.participants;
    let participantIndex = 0;

    // Distribute connected participants into teams
    context.teams.forEach((team) => {
      team.players.forEach((player) => {
        if (participantIndex < participants.length) {
          const p = participants[participantIndex];
          send({
            type: 'UPDATE_PLAYER_NAME',
            teamId: team.id,
            playerId: player.id,
            name: p.name,
            newPlayerId: p.userId,
          });
          participantIndex++;
        }
      });
    });
  };

  return (
    <Container size="xs" py="lg">
      <Stack gap="lg">
        <SetupHero />

        {/* QR Joining Section */}
        {multiplayer && (
          <div>
            {!hasRoom ? (
              <Button
                variant="outline"
                color="blue"
                fullWidth
                leftSection={<IconQrcode size={18} />}
                onClick={handleStartQrSession}
                loading={loadingQr}
              >
                {t('localLobby.collectByQr')}
              </Button>
            ) : (
              <Card withBorder padding="md" style={{ borderColor: 'var(--mantine-color-blue-outline)' }}>
                <Stack gap="md">
                  <Group justify="space-between" align="center">
                    <Text size="xs" fw={700} c="blue" style={{ letterSpacing: 0.5 }}>
                      {t('localLobby.collectByQr').toUpperCase()}
                    </Text>
                    <Badge color="blue" variant="light" size="lg" style={{ letterSpacing: 2 }}>
                      {multiplayer.roomId}
                    </Badge>
                  </Group>

                  <Group gap="sm" wrap="nowrap" justify="center">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(joinUrl)}`}
                      alt="Room QR Code"
                      style={{ display: 'block', borderRadius: 6, border: '1px solid var(--mantine-color-border)' }}
                    />
                    <Stack gap="xs" style={{ flex: 1 }}>
                      <Text size="xs" c="dimmed">
                        {t('lobby.scanHint')}
                      </Text>
                      <Button size="xs" variant="light" leftSection={<IconCopy size={12} />} onClick={copyToClipboard}>
                        {t('lobby.copyLink')}
                      </Button>
                      <Button size="xs" color="red" variant="subtle" leftSection={<IconTrash size={12} />} onClick={handleCloseQrSession}>
                        {t('localLobby.closeQr')}
                      </Button>
                    </Stack>
                  </Group>

                  <Divider />

                  <Stack gap="xs">
                    <Group gap="xs" c="dimmed">
                      <IconUsers size={16} />
                      <Text size="xs" fw={600}>
                        {t('localLobby.connectedPlayers')}
                      </Text>
                    </Group>

                    {multiplayer.participants.length === 0 ? (
                      <Text size="xs" c="dimmed" ta="center" py="xs">
                        {t('localLobby.noPlayersYet')}
                      </Text>
                    ) : (
                      <Stack gap={6}>
                        <Group gap={6} wrap="wrap">
                          {multiplayer.participants.map((p) => (
                            <Badge key={p.userId} variant="flat" color="blue" size="sm">
                              {p.name}
                            </Badge>
                          ))}
                        </Group>
                        <Button
                          size="xs"
                          variant="light"
                          color="green"
                          leftSection={<IconCheck size={12} />}
                          onClick={handleAutoDistribute}
                        >
                          {t('localLobby.autoDistribute')}
                        </Button>
                      </Stack>
                    )}
                  </Stack>
                </Stack>
              </Card>
            )}
          </div>
        )}

        <div>
          <Title order={3} mb="sm">
            {t('setup.teams')}
          </Title>
          <TeamList
            teams={context.teams}
            send={send}
            connectedParticipants={multiplayer?.participants}
          />
        </div>

        <Divider />

        <div>
          <Title order={3} mb="sm">
            {t('setup.settings')}
          </Title>
          <RoundSettingsForm settings={context.settings} dictionary={context.dictionary} send={send} />
        </div>

        <StartGameButton
          context={context}
          send={send}
          onBack={onBack}
        />
      </Stack>
    </Container>
  );
}
