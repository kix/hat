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
}

export function SwipeableWordCard({
  word,
  hidden = false,
  allowSkip = false,
  onSwipeRight,
  onSwipeLeft,
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

    const threshold = 120; // Порог для свайпа в пикселях
    if (dragOffset.x > threshold) {
      onSwipeRight();
    } else if (dragOffset.x < -threshold && allowSkip) {
      onSwipeLeft();
    } else {
      // Возвращаем в центр, если порог не пройден
      setDragOffset({ x: 0, y: 0 });
    }
  };

  // Вычисление углов и стилей трансформации
  const rotate = dragOffset.x * 0.08; // Угол поворота при перетаскивании
  const transform = `translate3d(${dragOffset.x}px, ${dragOffset.y}px, 0) rotate(${rotate}deg)`;
  
  // Рассчитываем силу оттенка в зависимости от расстояния
  const rightOpacity = Math.min(Math.max(dragOffset.x / 150, 0), 0.15);
  const leftOpacity = Math.min(Math.max(-dragOffset.x / 150, 0), 0.15);

  let overlayColor = 'transparent';
  if (rightOpacity > 0) {
    overlayColor = `rgba(64, 192, 87, ${rightOpacity})`; // Зеленый для Угадано
  } else if (leftOpacity > 0 && allowSkip) {
    overlayColor = `rgba(134, 142, 150, ${leftOpacity})`; // Серый для Пропуск
  }

  // Определение цвета рамки при свайпе
  let borderColor = 'var(--mantine-color-default-border)';
  if (dragOffset.x > 30) {
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
        touchAction: 'none', // Отключаем стандартный скролл при перетаскивании
        userSelect: 'none',
        overflow: 'hidden',
      }}
      onMouseMove={(e) => handleMove(e.clientX, e.clientY)}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      onTouchMove={(e) => {
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

        {/* Бейджи-подсказки при свайпах */}
        {dragOffset.x > 50 && (
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

        {dragOffset.x < -50 && allowSkip && (
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
