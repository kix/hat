import { useState } from 'react';
import {
  ActionIcon,
  Button,
  Card,
  Container,
  Divider,
  Group,
  SegmentedControl,
  Stack,
  Text,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import { IconArrowLeft, IconRotateClockwise, IconTrophy } from '@tabler/icons-react';
import {
  type TournamentMatch,
  type TournamentState,
  type TournamentTeam,
  createTournament,
  loadTournament,
  clearTournament,
} from './tournamentStore';
import { TournamentBracketTree } from './TournamentBracketTree';
import { TournamentPodium } from './TournamentPodium';
import { generateId } from '../../utils/id';
import { generateTeamName } from '../../utils/teamName';
import type { DictionaryEntry } from '../../data/dictionary';
import { useI18n } from '../../i18n/i18n';

interface TournamentScreenProps {
  onBack: () => void;
  onStartMatchGame: (teamA: TournamentTeam, teamB: TournamentTeam, matchId: string) => void;
  dictionary: DictionaryEntry[] | null;
}

export function TournamentScreen({ onBack, onStartMatchGame, dictionary }: TournamentScreenProps) {
  const { t } = useI18n();
  const [tournament, setTournament] = useState<TournamentState | null>(() => loadTournament());
  const [teamsCount, setTeamsCount] = useState<4 | 8>(4);
  const [customTeams, setCustomTeams] = useState<TournamentTeam[]>(() => [
    { id: generateId(), name: generateTeamName(dictionary), players: ['Игрок 1', 'Игрок 2'] },
    { id: generateId(), name: generateTeamName(dictionary), players: ['Игрок 3', 'Игрок 4'] },
    { id: generateId(), name: generateTeamName(dictionary), players: ['Игрок 5', 'Игрок 6'] },
    { id: generateId(), name: generateTeamName(dictionary), players: ['Игрок 7', 'Игрок 8'] },
  ]);

  const handleTeamsCountChange = (val: string) => {
    const count = Number(val) as 4 | 8;
    setTeamsCount(count);
    if (count === 8 && customTeams.length < 8) {
      const extra: TournamentTeam[] = [];
      for (let i = customTeams.length; i < 8; i++) {
        extra.push({
          id: generateId(),
          name: generateTeamName(dictionary),
          players: [`Игрок ${i * 2 + 1}`, `Игрок ${i * 2 + 2}`],
        });
      }
      setCustomTeams([...customTeams, ...extra]);
    }
  };

  const handleUpdateTeamName = (id: string, name: string) => {
    setCustomTeams((prev) => prev.map((tm) => (tm.id === id ? { ...tm, name } : tm)));
  };

  const handleStartTournament = () => {
    const newTournament = createTournament(customTeams.slice(0, teamsCount));
    setTournament(newTournament);
  };

  const handleResetTournament = () => {
    if (window.confirm(t('tournament.resetConfirm'))) {
      clearTournament();
      setTournament(null);
    }
  };

  const handlePlayMatch = (match: TournamentMatch) => {
    if (match.teamA && match.teamB) {
      onStartMatchGame(match.teamA, match.teamB, match.id);
    }
  };

  return (
    <Container size="md" py="lg">
      <Group justify="space-between" mb="lg">
        <Button variant="subtle" color="gray" leftSection={<IconArrowLeft size={18} />} onClick={onBack}>
          {t('common.back')}
        </Button>
        {tournament && (
          <Button variant="light" color="red" size="xs" leftSection={<IconRotateClockwise size={16} />} onClick={handleResetTournament}>
            {t('tournament.newTournament')}
          </Button>
        )}
      </Group>

      {!tournament ? (
        // Экран настройки турнира
        <Stack gap="lg">
          <Group justify="center" gap="sm">
            <IconTrophy size={36} color="var(--mantine-color-yellow-6)" />
            <Title order={2}>{t('tournament.setupTitle')}</Title>
          </Group>

          <Card withBorder p="md" radius="md">
            <Stack gap="md">
              <div>
                <Text size="sm" fw={600} mb={6}>
                  {t('tournament.teamsCount')}
                </Text>
                <SegmentedControl
                  fullWidth
                  value={String(teamsCount)}
                  onChange={handleTeamsCountChange}
                  data={[
                    { label: '4 команды (Полуфиналы → Финал)', value: '4' },
                    { label: '8 команд (1/4 → 1/2 → Финал)', value: '8' },
                  ]}
                />
              </div>

              <Divider label={t('setup.teams')} labelPosition="center" />

              <Stack gap="xs">
                {customTeams.slice(0, teamsCount).map((team, idx) => (
                  <Group key={team.id} wrap="nowrap">
                    <Text size="sm" fw={700} style={{ minWidth: 24 }}>
                      {idx + 1}.
                    </Text>
                    <TextInput
                      style={{ flex: 1 }}
                      size="sm"
                      value={team.name}
                      onChange={(e) => handleUpdateTeamName(team.id, e.currentTarget.value)}
                    />
                    <Tooltip label={t('teamCard.regenerate')}>
                      <ActionIcon
                        variant="light"
                        color="gray"
                        onClick={() => handleUpdateTeamName(team.id, generateTeamName(dictionary))}
                      >
                        <IconRotateClockwise size={16} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                ))}
              </Stack>

              <Button size="xl" color="yellow" fullWidth onClick={handleStartTournament} mt="md">
                {t('tournament.startTournament')}
              </Button>
            </Stack>
          </Card>
        </Stack>
      ) : (
        // Экран активного турнира с сеткой
        <Stack gap="xl">
          {tournament.status === 'completed' && <TournamentPodium tournament={tournament} />}
          <TournamentBracketTree tournament={tournament} onPlayMatch={handlePlayMatch} />
        </Stack>
      )}
    </Container>
  );
}
