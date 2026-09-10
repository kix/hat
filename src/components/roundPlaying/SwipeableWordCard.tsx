import { useState, useRef, useEffect } from 'react';
import { Card, Text, Stack, Box, Badge } from '@mantine/core';
import { hyphenateWord } from '../../utils/hyphenate';
import { useI18n } from '../../i18n/i18n';

interface SwipeableWordCardProps {
  word: string;
  hidden?: boolean;
  allowSkip?: boolean;
  onSwipeRight: () => void;
  onSwipeLeft: () => void;
  onSwipeUp?: () => void;
}

export function SwipeableWordCard({
  word,
  hidden = false,
  allowSkip = false,
  onSwipeRight,
  onSwipeLeft,
  onSwipeUp,
}: SwipeableWordCardProps) {
  const { t } = useI18n();
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);

  // Сброс оффсета при смене слова
  useEffect(() => {
    setDragOffset({ x: 0, y: 0 });
    setIsDragging(false);
  }, [word]);

  const handleStart = (clientX: number, clientY: number) => {
    if (hidden) return; // Запрещаем свайпы, если слово скрыто
    startXRef.current = clientX;
    startYRef.current = clientY;
    setIsDragging(true);
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (!isDragging) return;
    const deltaX = clientX - startXRef.current;
    const deltaY = clientY - startYRef.current;
    setDragOffset({ x: deltaX, y: deltaY });
  };

  const handleEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    const thresholdX = 120; // Порог для горизонтального свайпа
    const thresholdY = 90;  // Порог для вертикального свайпа

    const isHorizontal = Math.abs(dragOffset.x) > Math.abs(dragOffset.y);

    if (isHorizontal) {
      if (dragOffset.x > thresholdX) {
        onSwipeRight();
      } else if (dragOffset.x < -thresholdX && allowSkip) {
        onSwipeLeft();
      } else {
        setDragOffset({ x: 0, y: 0 });
      }
    } else {
      if (dragOffset.y < -thresholdY && onSwipeUp) {
        onSwipeUp();
      } else {
        setDragOffset({ x: 0, y: 0 });
      }
    }
  };

  // Вычисление углов и стилей трансформации
  const rotate = dragOffset.x * 0.08; // Угол поворота при перетаскивании
  const transform = `translate3d(${dragOffset.x}px, ${dragOffset.y}px, 0) rotate(${rotate}deg)`;

  const isUpDominant = Math.abs(dragOffset.y) > Math.abs(dragOffset.x) && dragOffset.y < -30;
  
  // Рассчитываем силу оттенка в зависимости от расстояния
  const rightOpacity = Math.min(Math.max(dragOffset.x / 150, 0), 0.15);
  const leftOpacity = Math.min(Math.max(-dragOffset.x / 150, 0), 0.15);
  const upOpacity = Math.min(Math.max(-dragOffset.y / 120, 0), 0.18);

  let overlayColor = 'transparent';
  if (isUpDominant && onSwipeUp) {
    overlayColor = `rgba(250, 82, 82, ${upOpacity})`; // Красный для Нарушение
  } else if (rightOpacity > 0) {
    overlayColor = `rgba(64, 192, 87, ${rightOpacity})`; // Зеленый для Угадано
  } else if (leftOpacity > 0 && allowSkip) {
    overlayColor = `rgba(134, 142, 150, ${leftOpacity})`; // Серый для Пропуск
  }

  // Определение цвета рамки при свайпе
  let borderColor = 'var(--mantine-color-default-border)';
  if (isUpDominant && onSwipeUp) {
    borderColor = 'var(--mantine-color-red-filled)';
  } else if (dragOffset.x > 30) {
    borderColor = 'var(--mantine-color-green-filled)';
  } else if (dragOffset.x < -30 && allowSkip) {
    borderColor = 'var(--mantine-color-gray-filled)';
  }

  return (
    <Box
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--mantine-spacing-lg)',
      }}
      onMouseMove={(e) => {
        if (isDragging) handleMove(e.clientX, e.clientY);
      }}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      onTouchMove={(e) => {
        if (!isDragging) return;
        const touch = e.touches[0];
        if (touch) handleMove(touch.clientX, touch.clientY);
      }}
      onTouchEnd={handleEnd}
    >
      <Card
        withBorder
        shadow="lg"
        radius="lg"
        padding="xl"
        onMouseDown={(e) => handleStart(e.clientX, e.clientY)}
        onTouchStart={(e) => {
          const touch = e.touches[0];
          if (touch) handleStart(touch.clientX, touch.clientY);
        }}
        style={{
          width: '100%',
          maxWidth: 340,
          height: 240,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          cursor: hidden ? 'default' : isDragging ? 'grabbing' : 'grab',
          transform,
          borderColor,
          backgroundColor: 'var(--mantine-color-body)',
          transition: isDragging ? 'none' : 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), border-color 0.3s ease',
          boxShadow: isDragging ? '0 15px 30px rgba(0,0,0,0.15)' : 'var(--mantine-shadow-md)',
          zIndex: 10,
          touchAction: 'none',
          userSelect: 'none',
        }}
      >
        {/* Индикаторный слой (Overlay) для цветового фидбека при свайпе */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: overlayColor,
            borderRadius: 'inherit',
            pointerEvents: 'none',
            transition: isDragging ? 'none' : 'background-color 0.3s ease',
            zIndex: 1,
          }}
        />

        {/* Бейдж нарушения при свайпе вверх */}
        {isUpDominant && onSwipeUp && dragOffset.y < -40 && (
          <Badge
            color="red"
            variant="filled"
            size="lg"
            style={{
              position: 'absolute',
              top: 20,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 2,
            }}
          >
            {t('review.foul')}
          </Badge>
        )}

        {/* Бейджи-подсказки при горизонтальных свайпах */}
        {!isUpDominant && dragOffset.x > 50 && (
          <Badge
            color="green"
            variant="filled"
            size="lg"
            style={{
              position: 'absolute',
              top: 20,
              left: 20,
              transform: 'rotate(-10deg)',
              zIndex: 2,
            }}
          >
            {t('review.guessed')}
          </Badge>
        )}

        {!isUpDominant && dragOffset.x < -50 && allowSkip && (
          <Badge
            color="gray"
            variant="filled"
            size="lg"
            style={{
              position: 'absolute',
              top: 20,
              right: 20,
              transform: 'rotate(10deg)',
              zIndex: 2,
            }}
          >
            {t('review.skipped')}
          </Badge>
        )}

        <Stack align="center" gap="xs" style={{ zIndex: 2, pointerEvents: 'none' }}>
          <Text
            style={{
              fontSize: 'clamp(2.2rem, 8vw, 3.8rem)',
              fontWeight: 800,
              lineHeight: 1.1,
              textAlign: 'center',
              color: hidden ? 'var(--mantine-color-dimmed)' : 'var(--mantine-color-text)',
              wordBreak: 'break-word',
              hyphens: 'manual',
            }}
          >
            {hidden ? t('wordDisplay.hidden') : hyphenateWord(word)}
          </Text>
          
          {!hidden && !isDragging && (
            <Text size="xs" c="dimmed" style={{ position: 'absolute', bottom: 15 }}>
              {allowSkip ? t('rp.swipeHint') : t('rp.swipeHintNoSkip')}
            </Text>
          )}
        </Stack>
      </Card>
    </Box>
  );
}
