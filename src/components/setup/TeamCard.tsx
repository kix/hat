import { IconDice5, IconTrash, IconWifi, IconCheck, IconAlertTriangle, IconBrandTelegram, IconCopy, IconUserCheck } from '@tabler/icons-react';
import { ActionIcon, Autocomplete, Card, Group, Stack, Text, TextInput, Modal, Loader, ThemeIcon, Button, Tooltip, CopyButton } from '@mantine/core';
import type { HatEvent, Team } from '../../machine/hatMachine';
import { getStoredPlayerNames } from '../../utils/playerNamesStore';
import { getDuplicateNameReason } from '../../utils/setupValidity';
import { useI18n } from '../../i18n/i18n';
import { useState, useRef, useEffect } from 'react';
import { requestTelegramPlayerVerification, subscribeToPlayerVerification } from '../../auth/useTelegramPlayerVerification';
import { TELEGRAM_BOT_USERNAME } from '../../utils/telegramWebApp';

interface TeamCardProps {
  team: Team;
  teamNumber: number;
  canRemove: boolean;
  send: (event: HatEvent) => void;
  connectedParticipants?: { userId: string; name: string }[];
  gameMode?: 'teams' | 'pairs';
}

const MIN_CHARS_FOR_SUGGESTIONS = 2;

export function TeamCard({ team, teamNumber, canRemove, send, connectedParticipants, gameMode }: TeamCardProps) {
  const { t } = useI18n();
  const duplicateNameReason = getDuplicateNameReason(team);

  // NFC Scan State
  const [nfcScanOpen, setNfcScanOpen] = useState(false);
  const [nfcScanStatus, setNfcScanStatus] = useState<'prompt' | 'success' | 'error'>('prompt');
  const [nfcScanError, setNfcScanError] = useState('');
  const [activePlayerId, setActivePlayerId] = useState<string | null>(null);
  
  const ndefControllerRef = useRef<any>(null);
  const isNfcSupported = 'NDEFReader' in window;

  // Telegram Verification State
  const [tgModalOpen, setTgModalOpen] = useState(false);
  const [tgUsername, setTgUsername] = useState('');
  const [tgStatus, setTgStatus] = useState<'idle' | 'loading' | 'waiting' | 'confirmed' | 'rejected' | 'error'>('idle');
  const [tgTargetFound, setTgTargetFound] = useState(true);
  const [tgVerificationId, setTgVerificationId] = useState<string | null>(null);
  const [tgConfirmedName, setTgConfirmedName] = useState<string | null>(null);
  const [tgError, setTgError] = useState('');
  const [tgActivePlayerId, setTgActivePlayerId] = useState<string | null>(null);
  const [verifiedPlayers, setVerifiedPlayers] = useState<Record<string, boolean>>({});
  
  const tgUnsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      if (tgUnsubRef.current) {
        tgUnsubRef.current();
        tgUnsubRef.current = null;
      }
    };
  }, []);

  const handleScanNfc = async (playerId: string) => {
    setActivePlayerId(playerId);
    setNfcScanStatus('prompt');
    setNfcScanError('');
    setNfcScanOpen(true);

    try {
      const NDEFReaderClass = (window as any).NDEFReader;
      if (!NDEFReaderClass) throw new Error(t('nfc.notSupported'));
      
      const ndef = new NDEFReaderClass();
      ndefControllerRef.current = ndef;
      await ndef.scan();
      
      ndef.onreading = (event: any) => {
        const decoder = new TextDecoder();
        let nameRead = '';
        for (const record of event.message.records) {
          if (record.recordType === 'text') {
            nameRead = decoder.decode(record.data);
            break;
          }
        }
        
        if (nameRead.trim()) {
          send({
            type: 'UPDATE_PLAYER_NAME',
            teamId: team.id,
            playerId: playerId,
            name: nameRead.trim(),
          });
          setNfcScanStatus('success');
          setTimeout(() => {
            setNfcScanOpen(false);
          }, 1500);
        } else {
          setNfcScanStatus('error');
          setNfcScanError('No text records found');
        }
      };
      
      ndef.onreadingerror = () => {
        setNfcScanStatus('error');
        setNfcScanError('Reading error');
      };
    } catch (err: any) {
      console.error(err);
      setNfcScanStatus('error');
      setNfcScanError(err.message || String(err));
    }
  };

  const closeNfcScan = () => {
    setNfcScanOpen(false);
    ndefControllerRef.current = null;
  };

  // Open Telegram verification modal for a specific player
  const handleOpenTgModal = (playerId: string, currentName: string) => {
    if (tgUnsubRef.current) {
      tgUnsubRef.current();
      tgUnsubRef.current = null;
    }

    setTgActivePlayerId(playerId);
    const initialUser = currentName.trim().startsWith('@')
      ? currentName.trim()
      : currentName.trim()
      ? `@${currentName.trim()}`
      : '';
    setTgUsername(initialUser);
    setTgStatus('idle');
    setTgVerificationId(null);
    setTgConfirmedName(null);
    setTgError('');
    setTgTargetFound(true);
    setTgModalOpen(true);
  };

  const closeTgModal = () => {
    if (tgUnsubRef.current) {
      tgUnsubRef.current();
      tgUnsubRef.current = null;
    }
    setTgModalOpen(false);
  };

  const handleSendTgVerification = async () => {
    if (!tgUsername.trim() || !tgActivePlayerId) return;

    setTgStatus('loading');
    setTgError('');

    const res = await requestTelegramPlayerVerification(tgUsername, team.name || t('default.teamN', { n: teamNumber }));

    if (!res.ok || !res.verificationId) {
      setTgStatus('error');
      setTgError(res.error || 'Не удалось отправить запрос');
      return;
    }

    setTgVerificationId(res.verificationId);
    setTgTargetFound(!!res.targetFound);
    setTgStatus('waiting');

    // Subscribe to status updates
    tgUnsubRef.current = subscribeToPlayerVerification(res.verificationId, (data) => {
      if (data.status === 'confirmed') {
        const finalName = data.chosen_name || tgUsername.trim();
        setTgStatus('confirmed');
        setTgConfirmedName(finalName);
        setVerifiedPlayers((prev) => ({ ...prev, [tgActivePlayerId]: true }));

        send({
          type: 'UPDATE_PLAYER_NAME',
          teamId: team.id,
          playerId: tgActivePlayerId,
          name: finalName,
          newPlayerId: data.target_user_id || undefined,
        });

        setTimeout(() => {
          closeTgModal();
        }, 1600);
      } else if (data.status === 'rejected') {
        setTgStatus('rejected');
      }
    });
  };

  return (
    <Card withBorder padding="md">
      <Stack gap="sm">
        {gameMode === 'pairs' ? (
          <Text size="sm" fw={600} c="dimmed">
            {t('setup.players')}
          </Text>
        ) : (
          <>
            <Text size="xs" c="dimmed">
              {t('teamCard.team', { n: teamNumber })}
            </Text>
            <Group gap="xs" wrap="nowrap">
              <TextInput
                aria-label={t('teamCard.teamName')}
                placeholder={t('teamCard.teamName')}
                value={team.name}
                onChange={(event) => send({ type: 'UPDATE_TEAM_NAME', teamId: team.id, name: event.currentTarget.value })}
                style={{ flex: 1 }}
              />
              <ActionIcon
                aria-label={t('teamCard.regenerate')}
                variant="light"
                size="lg"
                onClick={() => send({ type: 'REGENERATE_TEAM_NAME', teamId: team.id })}
              >
                <IconDice5 size={20} />
              </ActionIcon>
              <ActionIcon
                aria-label={t('teamCard.removeTeam')}
                variant="light"
                color="red"
                size="lg"
                disabled={!canRemove}
                onClick={() => send({ type: 'REMOVE_TEAM', teamId: team.id })}
              >
                <IconTrash size={20} />
              </ActionIcon>
            </Group>
          </>
        )}
        <Group gap="xs" grow>
          {team.players.map((player, index) => {
            const participantNames = (connectedParticipants || []).map((p) => p.name);
            const suggestions = Array.from(
              new Set([
                ...participantNames,
                ...(player.name.trim().length >= MIN_CHARS_FOR_SUGGESTIONS ? getStoredPlayerNames() : []),
              ])
            );

            const isTgVerified = Boolean(
              verifiedPlayers[player.id] ||
              (player.id && player.id.includes('-') && player.id.length > 30) ||
              (player.name.trim() && (connectedParticipants || []).some((p) => p.name.trim().toLowerCase() === player.name.trim().toLowerCase() && !!p.userId))
            );

            return (
              <Group gap="xs" wrap="nowrap" key={player.id} align="flex-start" style={{ flex: 1 }}>
                <Autocomplete
                  aria-label={gameMode === 'pairs' ? (index === 0 ? t('setup.player1') : t('setup.player2')) : t('default.playerN', { n: index + 1 })}
                  placeholder={gameMode === 'pairs' ? (index === 0 ? t('setup.player1') : t('setup.player2')) : t('default.playerN', { n: index + 1 })}
                  description={
                    isTgVerified ? (
                      <Group gap={4} wrap="nowrap" c="blue">
                        <IconBrandTelegram size={12} />
                        <Text size="xs" c="blue" fw={500}>{t('tgAuth.verifiedBadge')}</Text>
                      </Group>
                    ) : (
                      player.name.trim().length === 0 ? t('teamCard.anon') : (duplicateNameReason ?? undefined)
                    )
                  }
                  value={player.name}
                  data={suggestions}
                  rightSection={
                    isTgVerified ? (
                      <Tooltip label={t('tgAuth.verifiedBadge')} withArrow>
                        <ThemeIcon size={20} radius="xl" color="blue" variant="light">
                          <IconCheck size={12} />
                        </ThemeIcon>
                      </Tooltip>
                    ) : undefined
                  }
                  onChange={(value) => {
                    const matched = (connectedParticipants || []).find(
                      (p) => p.name.trim().toLowerCase() === value.trim().toLowerCase()
                    );
                    send({
                      type: 'UPDATE_PLAYER_NAME',
                      teamId: team.id,
                      playerId: player.id,
                      name: value,
                      newPlayerId: matched?.userId,
                    });
                  }}
                  style={{ flex: 1 }}
                />

                {/* Telegram Verification Button */}
                <Tooltip label={t('tgAuth.btnAria')} withArrow>
                  <ActionIcon
                    variant={isTgVerified ? 'filled' : 'light'}
                    color="blue"
                    size="lg"
                    onClick={() => handleOpenTgModal(player.id, player.name)}
                    aria-label={t('tgAuth.btnAria')}
                  >
                    <IconBrandTelegram size={18} />
                  </ActionIcon>
                </Tooltip>

                {isNfcSupported && (
                  <ActionIcon
                    variant="light"
                    color="indigo"
                    size="lg"
                    onClick={() => handleScanNfc(player.id)}
                    aria-label={t('nfc.scanBtnAria')}
                  >
                    <IconWifi size={16} />
                  </ActionIcon>
                )}
              </Group>
            );
          })}
        </Group>
      </Stack>

      {/* Telegram Verification Modal */}
      <Modal
        opened={tgModalOpen}
        onClose={closeTgModal}
        title={
          <Group gap="xs">
            <ThemeIcon color="blue" variant="light" size="md" radius="xl">
              <IconBrandTelegram size={16} />
            </ThemeIcon>
            <Text fw={600} size="sm">{t('tgAuth.modalTitle')}</Text>
          </Group>
        }
        centered
        size="sm"
      >
        <Stack gap="md" py="xs">
          {tgStatus === 'idle' && (
            <>
              <TextInput
                label={t('tgAuth.inputLabel')}
                placeholder={t('tgAuth.inputPlaceholder')}
                value={tgUsername}
                onChange={(e) => setTgUsername(e.currentTarget.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleSendTgVerification();
                }}
              />
              <Button
                color="blue"
                leftSection={<IconBrandTelegram size={16} />}
                onClick={handleSendTgVerification}
                disabled={!tgUsername.trim()}
              >
                {t('tgAuth.sendRequest')}
              </Button>
            </>
          )}

          {tgStatus === 'loading' && (
            <Stack align="center" gap="md" py="md">
              <Loader color="blue" size="md" />
              <Text size="sm" c="dimmed">Отправляем запрос...</Text>
            </Stack>
          )}

          {tgStatus === 'waiting' && (
            <Stack align="center" gap="md" py="sm" ta="center">
              <Loader color="blue" size="lg" />
              {tgTargetFound ? (
                <Text size="sm" fw={500}>
                  {t('tgAuth.waitingConfirm')}
                </Text>
              ) : (
                <>
                  <Text size="sm" c="dimmed">
                    {t('tgAuth.notInBot')}
                  </Text>
                  {tgVerificationId && (
                    <CopyButton
                      value={`https://t.me/${TELEGRAM_BOT_USERNAME}?start=join_${tgVerificationId}`}
                    >
                      {({ copied, copy }) => (
                        <Button
                          color={copied ? 'teal' : 'blue'}
                          variant="light"
                          leftSection={copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                          onClick={copy}
                        >
                          {copied ? t('tgAuth.copied') : t('tgAuth.copyLink')}
                        </Button>
                      )}
                    </CopyButton>
                  )}
                </>
              )}
            </Stack>
          )}

          {tgStatus === 'confirmed' && (
            <Stack align="center" gap="sm" py="md" ta="center">
              <ThemeIcon size={52} radius="xl" color="green">
                <IconUserCheck size={32} />
              </ThemeIcon>
              <Text size="sm" fw={700} c="green">
                {t('tgAuth.confirmed', { name: tgConfirmedName || tgUsername })}
              </Text>
            </Stack>
          )}

          {tgStatus === 'rejected' && (
            <Stack align="center" gap="sm" py="md" ta="center">
              <ThemeIcon size={48} radius="xl" color="red">
                <IconAlertTriangle size={28} />
              </ThemeIcon>
              <Text size="sm" fw={600} c="red">
                {t('tgAuth.rejected')}
              </Text>
              <Button size="xs" variant="default" onClick={() => setTgStatus('idle')}>
                {t('common.tryAgain')}
              </Button>
            </Stack>
          )}

          {tgStatus === 'error' && (
            <Stack align="center" gap="sm" py="md" ta="center">
              <ThemeIcon size={48} radius="xl" color="red">
                <IconAlertTriangle size={28} />
              </ThemeIcon>
              <Text size="sm" fw={600} c="red">
                {t('tgAuth.error', { error: tgError })}
              </Text>
              <Button size="xs" variant="default" onClick={() => setTgStatus('idle')}>
                {t('common.tryAgain')}
              </Button>
            </Stack>
          )}
        </Stack>
      </Modal>

      {/* NFC Scan Modal */}
      <Modal
        opened={nfcScanOpen}
        onClose={closeNfcScan}
        title={t('nfc.collectTitle')}
        centered
        size="xs"
      >
        <Stack align="center" gap="md" py="lg" ta="center">
          {nfcScanStatus === 'prompt' && (
            <>
              <Loader size="lg" color="indigo" />
              <Text size="sm">{t('nfc.collectPrompt')}</Text>
            </>
          )}

          {nfcScanStatus === 'success' && (
            <>
              <ThemeIcon size={48} radius="xl" color="green">
                <IconCheck size={30} />
              </ThemeIcon>
              <Text size="sm" fw={600} c="green">{t('nfc.scanSuccess')}</Text>
            </>
          )}

          {nfcScanStatus === 'error' && (
            <>
              <ThemeIcon size={48} radius="xl" color="red">
                <IconAlertTriangle size={30} />
              </ThemeIcon>
              <Text size="sm" fw={600} c="red">{t('nfc.error', { error: nfcScanError })}</Text>
              <Button size="xs" variant="default" onClick={() => activePlayerId && handleScanNfc(activePlayerId)}>
                {t('common.tryAgain')}
              </Button>
            </>
          )}
        </Stack>
      </Modal>
    </Card>
  );
}
