import { ActionIcon, Button, Group, Modal, Text } from '@mantine/core';
import { IconX } from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';
import type { HatEvent } from '../../machine/hatMachine';
import { useI18n } from '../../i18n/i18n';

interface ExitGameButtonProps {
  send: (event: HatEvent) => void;
}

export function ExitGameButton({ send }: ExitGameButtonProps) {
  const { t } = useI18n();
  const [opened, { open, close }] = useDisclosure(false);

  return (
    <>
      <ActionIcon
        aria-label={t('exit.aria')}
        variant="light"
        color="gray"
        size="lg"
        style={{ position: 'fixed', top: 'var(--mantine-spacing-md)', right: 'var(--mantine-spacing-md)', zIndex: 100 }}
        onClick={open}
      >
        <IconX size={20} />
      </ActionIcon>

      <Modal opened={opened} onClose={close} title={t('exit.title')} centered>
        <Text size="sm" mb="md">
          {t('exit.body')}
        </Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={close}>
            {t('exit.cancel')}
          </Button>
          <Button
            color="red"
            onClick={() => {
              close();
              send({ type: 'EXIT_GAME' });
            }}
          >
            {t('exit.confirm')}
          </Button>
        </Group>
      </Modal>
    </>
  );
}
