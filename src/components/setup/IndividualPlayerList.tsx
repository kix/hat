import { useState, useRef, useEffect } from 'react';
import {
  ActionIcon,
  Autocomplete,
  Button,
  Card,
  Group,
  Stack,
  Text,
  Modal,
  ThemeIcon,
  Tooltip,
  Alert,
} from '@mantine/core';
import {
  IconPlus,
  IconTrash,
  IconArrowsShuffle,
  IconWifi,
  IconBrandTelegram,
  IconCheck,
  IconAlertTriangle,
  IconInfoCircle,
} from '@tabler/icons-react';
import {
  MAX_INDIVIDUAL_PLAYERS,
  MIN_INDIVIDUAL_PLAYERS,
  type HatEvent,
  type Player,
} from '../../machine/hatMachine';
import { getStoredPlayerNames } from '../../utils/playerNamesStore';
import { useI18n } from '../../i18n/i18n';
import {
  requestTelegramPlayerVerification,
  subscribeToPlayerVerification,
} from '../../auth/useTelegramPlayerVerification';

interface IndividualPlayerListProps {
  players: Player[];
  send: (event: HatEvent) => void;
  connectedParticipants?: { userId: string; name: string }[];
}

const MIN_CHARS_FOR_SUGGESTIONS = 2;

export function IndividualPlayerList({ players, send, connectedParticipants }: IndividualPlayerListProps) {
  const { t } = useI18n();
  const atMax = players.length >= MAX_INDIVIDUAL_PLAYERS;
  const atMin = players.length <= MIN_INDIVIDUAL_PLAYERS;

  // NFC Scan State
  const [nfcScanOpen, setNfcScanOpen] = useState(false);
  const [nfcScanStatus, setNfcScanStatus] = useState<'prompt' | 'success' | 'error'>('prompt');
  const [nfcScanError, setNfcScanError] = useState('');
  const [, setActivePlayerId] = useState<string | null>(null);

  const ndefControllerRef = useRef<any>(null);
  const isNfcSupported = typeof window !== 'undefined' && 'NDEFReader' in window;

  // Telegram Verification State
  const [tgModalOpen, setTgModalOpen] = useState(false);
  const [tgUsername, setTgUsername] = useState('');
  const [tgStatus, setTgStatus] = useState<'idle' | 'loading' | 'waiting' | 'confirmed' | 'rejected' | 'error'>('idle');
  const [, setTgTargetFound] = useState(true);
  const [, setTgVerificationId] = useState<string | null>(null);
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
            type: 'UPDATE_INDIVIDUAL_PLAYER_NAME',
            playerId,
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
      setNfcScanStatus('error');
      setNfcScanError(err?.message || 'NFC error');
    }
  };

  const handleOpenTgModal = (playerId: string, currentName: string) => {
    setTgActivePlayerId(playerId);
    const cleanUsername = currentName.startsWith('@') ? currentName : '';
    setTgUsername(cleanUsername);
    setTgStatus('idle');
    setTgError('');
    setTgModalOpen(true);
  };

  const closeTgModal = () => {
    setTgModalOpen(false);
    if (tgUnsubRef.current) {
      tgUnsubRef.current();
      tgUnsubRef.current = null;
    }
  };

  const handleStartTgVerification = async () => {
    if (!tgUsername.trim() || !tgActivePlayerId) return;

    setTgStatus('loading');
    setTgError('');

    const res = await requestTelegramPlayerVerification(tgUsername, t('setup.gameModeIndividual'));

    if (!res.ok || !res.verificationId) {
      setTgStatus('error');
      setTgError(res.error || 'Не удалось отправить запрос');
      return;
    }

    setTgVerificationId(res.verificationId);
    setTgTargetFound(!!res.targetFound);
    setTgStatus('waiting');

    tgUnsubRef.current = subscribeToPlayerVerification(res.verificationId, (data) => {
      if (data.status === 'confirmed') {
        const finalName = data.chosen_name || tgUsername.trim();
        setTgStatus('confirmed');
        setTgConfirmedName(finalName);
        setVerifiedPlayers((prev) => ({ ...prev, [tgActivePlayerId]: true }));

        send({
          type: 'UPDATE_INDIVIDUAL_PLAYER_NAME',
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

  // Find duplicate names among non-empty names
  const nameCounts = new Map<string, number>();
  players.forEach((p) => {
    const trimmed = p.name.trim().toLowerCase();
    if (trimmed.length > 0) {
      nameCounts.set(trimmed, (nameCounts.get(trimmed) || 0) + 1);
    }
  });

  return (
    <Stack gap="sm">
      <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light">
        <Text size="xs">{t('setup.individualHint')}</Text>
      </Alert>

      {players.map((player, index) => {
        const isDuplicate =
          player.name.trim().length > 0 && (nameCounts.get(player.name.trim().toLowerCase()) || 0) > 1;
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
            (player.name.trim() &&
              (connectedParticipants || []).some(
                (p) => p.name.trim().toLowerCase() === player.name.trim().toLowerCase() && !!p.userId
              ))
        );

        return (
          <Card key={player.id} withBorder padding="sm">
            <Group gap="xs" wrap="nowrap" align="center">
              <ThemeIcon variant="light" color="blue" size="md" radius="xl">
                <Text size="xs" fw={700}>
                  {index + 1}
                </Text>
              </ThemeIcon>

              <Autocomplete
                aria-label={t('default.playerN', { n: index + 1 })}
                placeholder={t('default.playerN', { n: index + 1 })}
                value={player.name}
                data={suggestions}
                error={isDuplicate ? t('validity.duplicatePlayerName', { name: player.name.trim() }) : undefined}
                rightSection={
                  isTgVerified ? (
                    <ThemeIcon size={20} radius="xl" color="blue" variant="light">
                      <IconCheck size={12} />
                    </ThemeIcon>
                  ) : undefined
                }
                onChange={(value) => {
                  const matched = (connectedParticipants || []).find(
                    (p) => p.name.trim().toLowerCase() === value.trim().toLowerCase()
                  );
                  send({
                    type: 'UPDATE_INDIVIDUAL_PLAYER_NAME',
                    playerId: player.id,
                    name: value,
                    newPlayerId: matched?.userId,
                  });
                }}
                style={{ flex: 1 }}
              />

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

              <ActionIcon
                aria-label={t('common.close')}
                variant="light"
                color="red"
                size="lg"
                disabled={atMin}
                onClick={() => send({ type: 'REMOVE_INDIVIDUAL_PLAYER', playerId: player.id })}
              >
                <IconTrash size={18} />
              </ActionIcon>
            </Group>
          </Card>
        );
      })}

      <Group gap="xs" grow>
        {!atMax ? (
          <Button
            variant="outline"
            leftSection={<IconPlus size={18} />}
            onClick={() => send({ type: 'ADD_INDIVIDUAL_PLAYER' })}
          >
            {t('setup.addPlayer')}
          </Button>
        ) : (
          <Text size="sm" c="dimmed" ta="center">
            {t('setup.maxPlayers', { n: MAX_INDIVIDUAL_PLAYERS })}
          </Text>
        )}

        <Button
          variant="default"
          leftSection={<IconArrowsShuffle size={18} />}
          onClick={() => send({ type: 'SHUFFLE_INDIVIDUAL_PLAYERS' })}
        >
          {t('setup.shufflePlayers')}
        </Button>
      </Group>

      {/* Telegram Verification Modal */}
      <Modal
        opened={tgModalOpen}
        onClose={closeTgModal}
        title={
          <Group gap="xs">
            <ThemeIcon color="blue" variant="light" size="md" radius="xl">
              <IconBrandTelegram size={16} />
            </ThemeIcon>
            <Text fw={600} size="sm">
              {t('tgAuth.modalTitle')}
            </Text>
          </Group>
        }
        centered
        size="sm"
      >
        <Stack gap="md">
          {tgStatus === 'idle' && (
            <>
              <Text size="xs" c="dimmed">
                {t('tgAuth.inputLabel')}
              </Text>
              <Group gap="xs">
                <Autocomplete
                  placeholder={t('tgAuth.inputPlaceholder')}
                  value={tgUsername}
                  onChange={setTgUsername}
                  data={[]}
                  style={{ flex: 1 }}
                />
                <Button onClick={handleStartTgVerification}>{t('tgAuth.sendRequest')}</Button>
              </Group>
            </>
          )}

          {tgStatus === 'waiting' && (
            <Stack align="center" gap="xs" py="md">
              <Text size="sm" ta="center">
                {t('tgAuth.waitingConfirm')}
              </Text>
            </Stack>
          )}

          {tgStatus === 'confirmed' && (
            <Stack align="center" gap="xs" py="md">
              <ThemeIcon size={40} radius="xl" color="green">
                <IconCheck size={24} />
              </ThemeIcon>
              <Text size="sm" fw={600} c="green">
                {t('tgAuth.confirmed', { name: tgConfirmedName || tgUsername })}
              </Text>
            </Stack>
          )}

          {tgStatus === 'rejected' && (
            <Stack align="center" gap="xs" py="md">
              <ThemeIcon size={40} radius="xl" color="red">
                <IconAlertTriangle size={24} />
              </ThemeIcon>
              <Text size="sm" fw={600} c="red">
                {t('tgAuth.rejected')}
              </Text>
            </Stack>
          )}

          {tgStatus === 'error' && (
            <Stack align="center" gap="xs" py="md">
              <Text size="sm" c="red">
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
        onClose={() => setNfcScanOpen(false)}
        title={t('nfc.scanTitle')}
        centered
        size="xs"
      >
        <Stack align="center" gap="md" py="lg" ta="center">
          {nfcScanStatus === 'prompt' && <Text size="sm">{t('nfc.scanPrompt')}</Text>}
          {nfcScanStatus === 'success' && (
            <>
              <ThemeIcon size={48} radius="xl" color="green">
                <IconCheck size={30} />
              </ThemeIcon>
              <Text size="sm" fw={600} c="green">
                {t('nfc.scanSuccess')}
              </Text>
            </>
          )}
          {nfcScanStatus === 'error' && (
            <>
              <ThemeIcon size={48} radius="xl" color="red">
                <IconAlertTriangle size={30} />
              </ThemeIcon>
              <Text size="sm" fw={600} c="red">
                {t('nfc.error', { error: nfcScanError })}
              </Text>
            </>
          )}
        </Stack>
      </Modal>
    </Stack>
  );
}
