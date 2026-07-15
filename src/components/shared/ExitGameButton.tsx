import { ActionIcon, Button, Group, Modal, Text } from '@mantine/core';
import { IconX } from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';
import type { HatEvent } from '../../machine/hatMachine';

interface ExitGameButtonProps {
  send: (event: HatEvent) => void;
}

export function ExitGameButton({ send }: ExitGameButtonProps) {
  const [opened, { open, close }] = useDisclosure(false);

  return (
    <>
      <ActionIcon
        aria-label="Выйти из игры"
        variant="light"
        color="gray"
        size="lg"
        style={{ position: 'fixed', top: 'var(--mantine-spacing-md)', right: 'var(--mantine-spacing-md)', zIndex: 100 }}
        onClick={open}
      >
        <IconX size={20} />
      </ActionIcon>

      <Modal opened={opened} onClose={close} title="Выйти из игры?" centered>
        <Text size="sm" mb="md">
          Текущая партия прервётся, и вы вернётесь на экран настройки команд.
        </Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={close}>
            Отмена
          </Button>
          <Button
            color="red"
            onClick={() => {
              close();
              send({ type: 'EXIT_GAME' });
            }}
          >
            Выйти
          </Button>
        </Group>
      </Modal>
    </>
  );
}
