import { useEffect, useRef, useState } from 'react';
import {
  Modal,
  Button,
  Group,
  Stack,
  SegmentedControl,
  Center,
  Loader,
  Text,
  Tooltip,
  Box,
} from '@mantine/core';
import {
  IconDownload,
  IconCopy,
  IconShare,
  IconCheck,
  IconPhoto,
} from '@tabler/icons-react';
import type { History, Settings, Team } from '../../machine/hatMachine';
import { useI18n } from '../../i18n/i18n';
import {
  generateResultCardBlob,
  renderResultCard,
  type RenderCardOptions,
} from '../../utils/cardGenerator/renderResultCard';

interface ExportCardModalProps {
  opened: boolean;
  onClose: () => void;
  teams: Team[];
  history: History;
  settings: Settings;
}

export function ExportCardModal({
  opened,
  onClose,
  teams,
  history,
  settings,
}: ExportCardModalProps) {
  const { t, lang } = useI18n();
  const [format, setFormat] = useState<'stories' | 'post'>('stories');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [shareSupported, setShareSupported] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const currentBlobRef = useRef<Blob | null>(null);
  const currentUrlRef = useRef<string | null>(null);

  useEffect(() => {
    setShareSupported(typeof navigator !== 'undefined' && !!navigator.share && !!navigator.canShare);
  }, []);

  useEffect(() => {
    if (currentUrlRef.current) {
      URL.revokeObjectURL(currentUrlRef.current);
      currentUrlRef.current = null;
    }

    if (!opened) {
      setImageUrl(null);
      return;
    }

    setIsGenerating(true);
    const canvas = document.createElement('canvas');
    canvasRef.current = canvas;

    const options: RenderCardOptions = {
      teams,
      history,
      settings,
      format,
      lang: lang as 'ru' | 'en',
    };

    renderResultCard(canvas, options);

    void generateResultCardBlob(options)
      .then((blob) => {
        currentBlobRef.current = blob;
        const url = URL.createObjectURL(blob);
        currentUrlRef.current = url;
        setImageUrl(url);
      })
      .catch((err) => {
        console.error('Failed to generate card blob:', err);
      })
      .finally(() => {
        setIsGenerating(false);
      });

    return () => {
      if (currentUrlRef.current) {
        URL.revokeObjectURL(currentUrlRef.current);
        currentUrlRef.current = null;
      }
    };
  }, [opened, format, teams, history, settings, lang]);

  const handleCopy = async () => {
    if (!currentBlobRef.current) return;
    try {
      if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': currentBlobRef.current }),
        ]);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch (err) {
      console.warn('Failed to copy image to clipboard:', err);
    }
  };

  const handleShare = async () => {
    if (!currentBlobRef.current) return;
    const file = new File([currentBlobRef.current], `hat-results-${format}.png`, {
      type: 'image/png',
    });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: t('share.text'),
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.warn('Share failed:', err);
        }
      }
    } else {
      // Fallback: download image
      handleDownload();
    }
  };

  const handleDownload = () => {
    if (!imageUrl) return;
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `hat-results-${format}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <IconPhoto size={22} />
          <Text fw={700} size="lg">
            {t('exportCard.modalTitle')}
          </Text>
        </Group>
      }
      size="md"
      centered
      radius="md"
    >
      <Stack gap="md">
        <SegmentedControl
          value={format}
          onChange={(val) => setFormat(val as 'stories' | 'post')}
          fullWidth
          data={[
            { label: t('exportCard.formatStories'), value: 'stories' },
            { label: t('exportCard.formatPost'), value: 'post' },
          ]}
        />

        {/* Card Preview Container */}
        <Box
          style={{
            background: '#090b10',
            borderRadius: 12,
            border: '1px solid rgba(255, 255, 255, 0.1)',
            overflow: 'hidden',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: format === 'stories' ? 380 : 300,
            maxHeight: 460,
            padding: 12,
          }}
        >
          {isGenerating || !imageUrl ? (
            <Center style={{ flexDirection: 'column', gap: 12, height: 260 }}>
              <Loader color="yellow" size="md" />
              <Text size="sm" c="dimmed">
                {t('exportCard.generating')}
              </Text>
            </Center>
          ) : (
            <img
              src={imageUrl}
              alt="Result Card"
              style={{
                maxWidth: '100%',
                maxHeight: 430,
                objectFit: 'contain',
                borderRadius: 8,
                boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
              }}
            />
          )}
        </Box>

        {/* Action Buttons */}
        <Group grow gap="xs">
          {shareSupported && (
            <Button
              variant="filled"
              color="indigo"
              leftSection={<IconShare size={18} />}
              onClick={handleShare}
              disabled={isGenerating || !imageUrl}
            >
              {t('exportCard.share')}
            </Button>
          )}

          <Tooltip label={copied ? t('exportCard.copied') : t('exportCard.copy')} withArrow>
            <Button
              variant="light"
              color={copied ? 'teal' : 'blue'}
              leftSection={copied ? <IconCheck size={18} /> : <IconCopy size={18} />}
              onClick={handleCopy}
              disabled={isGenerating || !imageUrl}
            >
              {copied ? t('share.copied') : t('exportCard.copy')}
            </Button>
          </Tooltip>

          <Button
            variant="default"
            leftSection={<IconDownload size={18} />}
            onClick={handleDownload}
            disabled={isGenerating || !imageUrl}
          >
            {t('exportCard.download')}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
