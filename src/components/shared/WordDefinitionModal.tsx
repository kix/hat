import { useEffect, useState } from 'react';
import { Modal, Stack, Title, Text, Button, Group, Loader, Anchor } from '@mantine/core';
import { IconBook, IconExternalLink } from '@tabler/icons-react';
import { supabase } from '../../auth/supabaseClient';
import { useI18n } from '../../i18n/i18n';

interface WordDefinitionModalProps {
  word: string | null;
  opened: boolean;
  onClose: () => void;
}

export function WordDefinitionModal({ word, opened, onClose }: WordDefinitionModalProps) {
  const { t, lang } = useI18n();
  const [definition, setDefinition] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!word || !opened) {
      setDefinition(null);
      return;
    }

    let isMounted = true;
    setLoading(true);

    const fetchDefinition = async () => {
      try {
        const cleanWord = word.trim().toLowerCase();
        const { data, error } = await supabase
          .from('word_definitions')
          .select('definition')
          .eq('word', cleanWord)
          .maybeSingle();

        if (isMounted) {
          if (!error && data?.definition) {
            setDefinition(data.definition);
          } else {
            setDefinition(null);
          }
        }
      } catch (err) {
        console.warn('Could not fetch word definition:', err);
        if (isMounted) setDefinition(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void fetchDefinition();

    return () => {
      isMounted = false;
    };
  }, [word, opened]);

  if (!word) return null;

  const searchUrl =
    lang === 'ru'
      ? `https://ru.wiktionary.org/wiki/${encodeURIComponent(word.toLowerCase())}`
      : `https://en.wiktionary.org/wiki/${encodeURIComponent(word.toLowerCase())}`;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <IconBook size={20} color="var(--mantine-color-blue-filled)" />
          <Text fw={700} size="md">
            {t('defModal.title')}
          </Text>
        </Group>
      }
      centered
      radius="md"
      padding="lg"
    >
      <Stack gap="md">
        <Title order={3} ta="center" style={{ textTransform: 'capitalize' }}>
          {word}
        </Title>

        {loading ? (
          <Group justify="center" py="lg">
            <Loader size="sm" />
            <Text size="sm" c="dimmed">
              {t('defModal.loading')}
            </Text>
          </Group>
        ) : definition ? (
          <Text size="sm" style={{ lineHeight: 1.6 }}>
            {definition}
          </Text>
        ) : (
          <Text size="sm" c="dimmed" ta="center">
            {t('defModal.notFound')}
          </Text>
        )}

        <Group justify="space-between" mt="sm">
          <Anchor
            href={searchUrl}
            target="_blank"
            rel="noopener noreferrer"
            size="xs"
            c="blue"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
          >
            {t('defModal.openWiktionary')}
            <IconExternalLink size={14} />
          </Anchor>

          <Button size="xs" variant="light" onClick={onClose}>
            {t('common.close')}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
