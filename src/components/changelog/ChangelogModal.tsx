import { useMemo, type ReactNode } from 'react';
import {
  Modal,
  Stack,
  Group,
  Title,
  Text,
  Badge,
  Divider,
  Anchor,
  Code,
  ScrollArea,
} from '@mantine/core';
import { IconSparkles, IconBrandGithub } from '@tabler/icons-react';
import changelogRaw from '../../../CHANGELOG.md?raw';
import { parseChangelog, type ChangelogRelease } from './parseChangelog';
import packageJson from '../../../package.json';
import { useI18n } from '../../i18n/i18n';

interface ChangelogModalProps {
  opened: boolean;
  onClose: () => void;
}

/**
 * Renders inline markdown tokens (**bold**, `code`, [link](url)) safely into React elements.
 */
function renderInlineMarkdown(text: string): ReactNode[] {
  if (!text) return [];

  // Match **bold**, `code`, or [text](url)
  const regex = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  const parts = text.split(regex);

  return parts.map((part, index) => {
    if (!part) return null;

    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      const inner = part.slice(2, -2);
      return <strong key={index}>{renderInlineMarkdown(inner)}</strong>;
    }

    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      const inner = part.slice(1, -1);
      return <Code key={index} style={{ fontSize: '0.85em' }}>{inner}</Code>;
    }

    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      return (
        <Anchor
          key={index}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          size="sm"
          underline="hover"
        >
          {linkMatch[1]}
        </Anchor>
      );
    }

    return part;
  });
}

export function ChangelogModal({ opened, onClose }: ChangelogModalProps) {
  const { t } = useI18n();

  const releases: ChangelogRelease[] = useMemo(() => {
    return parseChangelog(changelogRaw);
  }, []);

  const getCategoryConfig = (type: string) => {
    const lower = type.toLowerCase();
    switch (lower) {
      case 'added':
        return { color: 'teal', label: t('changelog.added') };
      case 'fixed':
        return { color: 'blue', label: t('changelog.fixed') };
      case 'changed':
        return { color: 'orange', label: t('changelog.changed') };
      case 'removed':
        return { color: 'red', label: t('changelog.removed') };
      case 'security':
        return { color: 'violet', label: t('changelog.security') };
      default:
        return { color: 'gray', label: type };
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="lg"
      radius="md"
      scrollAreaComponent={ScrollArea.Autosize}
      title={
        <Group gap="xs">
          <IconSparkles size={20} color="var(--mantine-color-blue-filled)" />
          <Title order={3} size="h3" fw={700}>
            {t('changelog.title')}
          </Title>
        </Group>
      }
      styles={{
        body: {
          maxHeight: '75vh',
        },
      }}
    >
      <Stack gap="xl" py="xs">
        {releases.map((release, releaseIdx) => {
          const isCurrentVersion = release.version === packageJson.version;

          return (
            <Stack key={release.version} gap="sm">
              <Group justify="space-between" align="center" wrap="wrap">
                <Group gap="xs" align="center">
                  <Badge
                    size="lg"
                    variant={isCurrentVersion ? 'filled' : 'light'}
                    color={isCurrentVersion ? 'blue' : 'gray'}
                  >
                    v{release.version}
                  </Badge>
                  {isCurrentVersion && (
                    <Badge size="sm" variant="dot" color="teal">
                      {t('changelog.latest')}
                    </Badge>
                  )}
                  {release.date && (
                    <Text size="xs" c="dimmed">
                      {release.date}
                    </Text>
                  )}
                </Group>

                {release.githubUrl && (
                  <Anchor
                    href={release.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    size="xs"
                    c="dimmed"
                    underline="hover"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                  >
                    <IconBrandGithub size={14} />
                    <span>{t('changelog.viewOnGithub')}</span>
                  </Anchor>
                )}
              </Group>

              <Stack gap="md" pl="xs">
                {release.sections.map((section, secIdx) => {
                  const cat = getCategoryConfig(section.type);

                  return (
                    <Stack key={secIdx} gap="xs">
                      <Group gap="xs">
                        <Badge size="sm" variant="light" color={cat.color}>
                          {cat.label}
                        </Badge>
                      </Group>

                      <Stack gap="xs" pl="xs">
                        {section.items.map((item, itemIdx) => (
                          <div key={itemIdx}>
                            <Text size="sm" style={{ lineHeight: 1.5 }}>
                              {item.title && (
                                <strong style={{ marginRight: 6 }}>
                                  {renderInlineMarkdown(item.title)}:
                                </strong>
                              )}
                              {renderInlineMarkdown(item.description)}
                            </Text>

                            {item.subItems && item.subItems.length > 0 && (
                              <Stack
                                gap={4}
                                mt={4}
                                pl="md"
                                style={{
                                  borderLeft: '2px solid var(--mantine-color-default-border)',
                                }}
                              >
                                {item.subItems.map((sub, subIdx) => (
                                  <Text key={subIdx} size="xs" c="dimmed" style={{ lineHeight: 1.4 }}>
                                    • {renderInlineMarkdown(sub)}
                                  </Text>
                                ))}
                              </Stack>
                            )}
                          </div>
                        ))}
                      </Stack>
                    </Stack>
                  );
                })}
              </Stack>

              {releaseIdx < releases.length - 1 && <Divider mt="xs" />}
            </Stack>
          );
        })}
      </Stack>
    </Modal>
  );
}
