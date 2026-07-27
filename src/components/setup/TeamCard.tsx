import { IconDice5, IconTrash, IconWifi, IconCheck, IconAlertTriangle } from '@tabler/icons-react';
import { ActionIcon, Autocomplete, Card, Group, Stack, Text, TextInput, Modal, Loader, ThemeIcon, Button } from '@mantine/core';
import type { HatEvent, Team } from '../../machine/hatMachine';
import { getStoredPlayerNames } from '../../utils/playerNamesStore';
import { getDuplicateNameReason } from '../../utils/setupValidity';
import { useI18n } from '../../i18n/i18n';
import { useState, useRef } from 'react';

interface TeamCardProps {
  team: Team;
  teamNumber: number;
  canRemove: boolean;
  send: (event: HatEvent) => void;
  connectedParticipants?: { userId: string; name: string }[];
}

const MIN_CHARS_FOR_SUGGESTIONS = 2;

export function TeamCard({ team, teamNumber, canRemove, send, connectedParticipants }: TeamCardProps) {
  const { t } = useI18n();
  const duplicateNameReason = getDuplicateNameReason(team);

  const [nfcScanOpen, setNfcScanOpen] = useState(false);
  const [nfcScanStatus, setNfcScanStatus] = useState<'prompt' | 'success' | 'error'>('prompt');
  const [nfcScanError, setNfcScanError] = useState('');
  const [activePlayerId, setActivePlayerId] = useState<string | null>(null);
  
  const ndefControllerRef = useRef<any>(null);
  const isNfcSupported = 'NDEFReader' in window;

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

  return (
    <Card withBorder padding="md">
      <Stack gap="sm">
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
        <Group gap="xs" grow>
          {team.players.map((player, index) => {
            const participantNames = (connectedParticipants || []).map((p) => p.name);
            const suggestions = Array.from(
              new Set([
                ...participantNames,
                ...(player.name.trim().length >= MIN_CHARS_FOR_SUGGESTIONS ? getStoredPlayerNames() : []),
              ])
            );

            return (
              <Group gap="xs" wrap="nowrap" key={player.id} align="flex-start" style={{ flex: 1 }}>
                <Autocomplete
                  aria-label={t('default.playerN', { n: index + 1 })}
                  placeholder={t('default.playerN', { n: index + 1 })}
                  description={
                    player.name.trim().length === 0 ? t('teamCard.anon') : (duplicateNameReason ?? undefined)
                  }
                  value={player.name}
                  data={suggestions}
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
