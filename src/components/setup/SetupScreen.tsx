import { Container, Divider, Stack, Title, Button, Card, Text, Group, Badge, Modal, Loader, ThemeIcon } from '@mantine/core';
import { IconQrcode, IconCopy, IconCheck, IconUsers, IconTrash, IconWifi, IconAlertTriangle } from '@tabler/icons-react';
import type { HatContext, HatEvent } from '../../machine/hatMachine';
import { TeamList } from './TeamList';
import { RoundSettingsForm } from './RoundSettingsForm';
import { StartGameButton } from './StartGameButton';
import { SetupHero } from './SetupHero';
import { useI18n } from '../../i18n/i18n';
import type { MultiplayerState } from '../../auth/useMultiplayer';
import { useState } from 'react';

import type { User } from '@supabase/supabase-js';

interface SetupScreenProps {
  context: HatContext;
  send: (event: HatEvent) => void;
  onBack?: () => void;
  multiplayer?: MultiplayerState;
  currentUser?: User | null;
}

export function SetupScreen({ context, send, onBack, multiplayer, currentUser }: SetupScreenProps) {
  const { t } = useI18n();
  const [loadingQr, setLoadingQr] = useState(false);
  const [nfcModalOpen, setNfcModalOpen] = useState(false);
  const [nfcStatus, setNfcStatus] = useState<'prompt' | 'success' | 'error'>('prompt');
  const [nfcErrorMsg, setNfcErrorMsg] = useState('');

  const hasRoom = !!multiplayer?.roomId;
  const isNfcSupported = 'NDEFReader' in window;
  
  // Build the join link for scanning
  const joinUrl = hasRoom
    ? `${window.location.origin}${window.location.pathname}?join=${multiplayer.roomId}`
    : '';

  const handleStartQrSession = async () => {
    if (!multiplayer) return;
    setLoadingQr(true);
    try {
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

  const handleWriteNfc = async () => {
    setNfcStatus('prompt');
    setNfcErrorMsg('');
    setNfcModalOpen(true);
    try {
      const NDEFReaderClass = (window as any).NDEFReader;
      if (!NDEFReaderClass) throw new Error(t('nfc.notSupported'));
      const ndef = new NDEFReaderClass();
      await ndef.write(joinUrl);
      setNfcStatus('success');
      setTimeout(() => setNfcModalOpen(false), 2000);
    } catch (err: any) {
      console.error(err);
      setNfcStatus('error');
      setNfcErrorMsg(err.message || String(err));
    }
  };

  const handleAutoDistribute = () => {
    if (!multiplayer || multiplayer.participants.length === 0) return;
    
    const participants = multiplayer.participants;
    let participantIndex = 0;

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

        {/* QR & NFC Joining Section */}
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
                      {isNfcSupported && (
                        <Button size="xs" variant="light" color="indigo" leftSection={<IconWifi size={12} />} onClick={handleWriteNfc}>
                          {t('nfc.writeBtn')}
                        </Button>
                      )}
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
          {(() => {
            const connectedParticipants = [...(multiplayer?.participants || [])];
            if (currentUser && !connectedParticipants.some((p) => p.userId === currentUser.id)) {
              const fullName = currentUser.user_metadata?.full_name || currentUser.email || '';
              if (fullName) {
                connectedParticipants.push({
                  userId: currentUser.id,
                  name: fullName,
                  isHost: true,
                });
              }
            }
            return (
              <TeamList
                teams={context.teams}
                send={send}
                connectedParticipants={connectedParticipants}
              />
            );
          })()}
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

      {/* NFC Write Modal */}
      <Modal
        opened={nfcModalOpen}
        onClose={() => setNfcModalOpen(false)}
        title={t('nfc.writeTitle')}
        centered
        size="xs"
      >
        <Stack align="center" gap="md" py="lg" ta="center">
          {nfcStatus === 'prompt' && (
            <>
              <Loader size="lg" color="indigo" />
              <Text size="sm">{t('nfc.writePrompt')}</Text>
            </>
          )}

          {nfcStatus === 'success' && (
            <>
              <ThemeIcon size={48} radius="xl" color="green">
                <IconCheck size={30} />
              </ThemeIcon>
              <Text size="sm" fw={600} c="green">{t('nfc.writeSuccess')}</Text>
            </>
          )}

          {nfcStatus === 'error' && (
            <>
              <ThemeIcon size={48} radius="xl" color="red">
                <IconAlertTriangle size={30} />
              </ThemeIcon>
              <Text size="sm" fw={600} c="red">{t('nfc.error', { error: nfcErrorMsg })}</Text>
              <Button size="xs" variant="default" onClick={handleWriteNfc}>
                {t('common.tryAgain')}
              </Button>
            </>
          )}
        </Stack>
      </Modal>
    </Container>
  );
}
