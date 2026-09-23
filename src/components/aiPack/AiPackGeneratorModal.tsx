import { useState } from 'react';
import {
  ActionIcon,
  Badge,
  Button,
  Group,
  Modal,
  PasswordInput,
  Pill,
  SegmentedControl,
  Select,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { IconSparkles, IconTrash, IconPlus, IconKey, IconChevronDown, IconChevronUp } from '@tabler/icons-react';
import { generateWordsWithAI } from './aiPackService';
import { useI18n } from '../../i18n/i18n';

interface AiPackGeneratorModalProps {
  opened: boolean;
  onClose: () => void;
  onApplyWords: (words: string[]) => void;
}

const QUICK_TOPICS_RU = [
  '⚡ Гарри Поттер',
  '📄 Сериал Офис',
  '💻 IT и стартапы',
  '🐸 Мемы',
  '🩺 Медицина',
  '🎬 Кинематограф',
  '🪐 Космос и Наука',
  '⚔️ Игры и Киберспорт',
];

const QUICK_TOPICS_EN = [
  '⚡ Harry Potter',
  '📄 The Office',
  '💻 IT & Tech',
  '🐸 Memes',
  '🩺 Medicine',
  '🎬 Cinema',
  '🪐 Space & Science',
  '⚔️ Gaming',
];

export function AiPackGeneratorModal({ opened, onClose, onApplyWords }: AiPackGeneratorModalProps) {
  const { t, lang } = useI18n();
  const [topic, setTopic] = useState('');
  const [count, setCount] = useState<number>(30);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | 'mixed'>('medium');
  const [loading, setLoading] = useState(false);
  const [generatedWords, setGeneratedWords] = useState<string[]>([]);
  const [newWordInput, setNewWordInput] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('claude_hat_gemini_key') || '');

  const quickTopics = lang === 'ru' ? QUICK_TOPICS_RU : QUICK_TOPICS_EN;

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    try {
      if (apiKey) {
        localStorage.setItem('claude_hat_gemini_key', apiKey.trim());
      }
      const words = await generateWordsWithAI({
        topic: topic.trim(),
        count,
        difficulty,
        lang: (lang as 'ru' | 'en') || 'ru',
        apiKey: apiKey.trim(),
      });
      setGeneratedWords(words);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveWord = (wordToRemove: string) => {
    setGeneratedWords((prev) => prev.filter((w) => w !== wordToRemove));
  };

  const handleAddWord = () => {
    const trimmed = newWordInput.trim();
    if (trimmed && !generatedWords.includes(trimmed)) {
      setGeneratedWords((prev) => [...prev, trimmed]);
      setNewWordInput('');
    }
  };

  const handleApply = () => {
    if (generatedWords.length > 0) {
      onApplyWords(generatedWords);
      onClose();
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <IconSparkles size={20} color="var(--mantine-color-grape-6)" />
          <Text fw={700}>{t('aiPack.modalTitle')}</Text>
        </Group>
      }
      size="lg"
    >
      <Stack gap="md">
        <TextInput
          label={t('aiPack.topicLabel')}
          placeholder={t('aiPack.topicPlaceholder')}
          value={topic}
          onChange={(e) => setTopic(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void handleGenerate();
          }}
          autoFocus
        />

        <div>
          <Text size="xs" c="dimmed" mb={6}>
            {t('aiPack.quickPrompts')}
          </Text>
          <Group gap={6}>
            {quickTopics.map((item) => (
              <Badge
                key={item}
                variant="light"
                color="gray"
                style={{ cursor: 'pointer' }}
                onClick={() => setTopic(item.replace(/^[^\s]+\s/, ''))}
              >
                {item}
              </Badge>
            ))}
          </Group>
        </div>

        <Group grow>
          <div>
            <Text size="sm" fw={500} mb={4}>
              {t('aiPack.countLabel')}
            </Text>
            <SegmentedControl
              fullWidth
              value={String(count)}
              onChange={(val) => setCount(Number(val))}
              data={[
                { label: '20', value: '20' },
                { label: '30', value: '30' },
                { label: '50', value: '50' },
              ]}
            />
          </div>

          <div>
            <Text size="sm" fw={500} mb={4}>
              {t('aiPack.difficultyLabel')}
            </Text>
            <Select
              value={difficulty}
              onChange={(val) => setDifficulty((val as 'easy' | 'medium' | 'hard' | 'mixed') || 'medium')}
              data={[
                { value: 'easy', label: t('aiPack.diffEasy') },
                { value: 'medium', label: t('aiPack.diffMedium') },
                { value: 'hard', label: t('aiPack.diffHard') },
                { value: 'mixed', label: t('aiPack.diffMixed') },
              ]}
              allowDeselect={false}
            />
          </div>
        </Group>

        <div>
          <Button
            variant="subtle"
            size="xs"
            color="gray"
            leftSection={<IconKey size={14} />}
            rightSection={showApiKey ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
            onClick={() => setShowApiKey((v) => !v)}
          >
            {t('aiPack.apiKeyLabel')}
          </Button>
          {showApiKey && (
            <PasswordInput
              mt="xs"
              size="xs"
              placeholder="AIzaSy..."
              value={apiKey}
              onChange={(e) => setApiKey(e.currentTarget.value)}
            />
          )}
        </div>

        <Button
          fullWidth
          size="md"
          color="grape"
          leftSection={<IconSparkles size={18} />}
          loading={loading}
          onClick={handleGenerate}
          disabled={!topic.trim()}
        >
          {loading ? t('aiPack.generating') : t('aiPack.generate')}
        </Button>

        {generatedWords.length > 0 && (
          <Stack gap="xs" mt="sm">
            <Group justify="space-between" align="center">
              <Text fw={600} size="sm">
                {t('aiPack.generatedTitle', { n: generatedWords.length })}
              </Text>
              <Button
                variant="subtle"
                color="red"
                size="xs"
                leftSection={<IconTrash size={14} />}
                onClick={() => setGeneratedWords([])}
              >
                {t('changelog.removed')}
              </Button>
            </Group>

            <div
              style={{
                maxHeight: 220,
                overflowY: 'auto',
                display: 'flex',
                flexWrap: 'wrap',
                gap: 6,
                padding: 8,
                border: '1px solid var(--mantine-color-default-border)',
                borderRadius: 'var(--mantine-radius-md)',
              }}
            >
              {generatedWords.map((word) => (
                <Pill
                  key={word}
                  withRemoveButton
                  onRemove={() => handleRemoveWord(word)}
                  size="md"
                >
                  {word}
                </Pill>
              ))}
            </div>

            <Group gap="xs">
              <TextInput
                placeholder={t('aiPack.addWord')}
                size="xs"
                style={{ flex: 1 }}
                value={newWordInput}
                onChange={(e) => setNewWordInput(e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddWord();
                }}
              />
              <ActionIcon size="sm" variant="light" color="blue" onClick={handleAddWord}>
                <IconPlus size={16} />
              </ActionIcon>
            </Group>

            <Button size="lg" color="green" fullWidth onClick={handleApply} mt="xs">
              {t('aiPack.apply')}
            </Button>
          </Stack>
        )}
      </Stack>
    </Modal>
  );
}
