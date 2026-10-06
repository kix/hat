export interface PartyModifier {
  id: string;
  emoji: string;
  titleRu: string;
  titleEn: string;
  descRu: string;
  descEn: string;
}

export const PARTY_MODIFIERS: PartyModifier[] = [
  {
    id: 'robot',
    emoji: '🤖',
    titleRu: 'Робот',
    titleEn: 'Robot',
    descRu: 'Говори монотонным механическим голосом без эмоций, пауз и жестов.',
    descEn: 'Speak in a flat, monotone robotic voice with zero emotion or hand gestures.',
  },
  {
    id: 'whisper',
    emoji: '🤫',
    titleRu: 'Драматичный шёпот',
    titleEn: 'Dramatic Whisper',
    descRu: 'Объясняй исключительно тихим и таинственным шёпотом.',
    descEn: 'Explain exclusively in a quiet, mysterious and dramatic whisper.',
  },
  {
    id: 'dancer',
    emoji: '🕺',
    titleRu: 'Танцор диско',
    titleEn: 'Disco Dancer',
    descRu: 'Непрерывно пританцовывай и двигайся всем телом во время каждого объяснения.',
    descEn: 'Constantly dance and move your whole body while giving your clues.',
  },
  {
    id: 'cowboy',
    emoji: '🤠',
    titleRu: 'Дикий Запад',
    titleEn: 'Wild West',
    descRu: 'Вставляй в речь ковбойские выкрики («Йи-ха!», «Партнёр!», «Святые кактусы!»).',
    descEn: 'Use cowboy slang in every phrase ("Yee-haw!", "Partner!", "Holy cacti!").',
  },
  {
    id: 'philosopher',
    emoji: '🧐',
    titleRu: 'Профессор философии',
    titleEn: 'Philosophy Professor',
    descRu: 'Объясняй высокопарным академическим слогом, будто читаешь лекцию в Сорбонне.',
    descEn: 'Explain in overly pretentious academic speech as if lecturing at Sorbonne.',
  },
  {
    id: 'panic',
    emoji: '😱',
    titleRu: 'Паника и ужас',
    titleEn: 'Panic Mode',
    descRu: 'Объясняй в дикой спешке и ужасе, будто через 30 секунд взорвётся вулкан!',
    descEn: 'Explain in frantic panic and rush, as if a volcano is about to erupt in 30 seconds!',
  },
  {
    id: 'alien',
    emoji: '👽',
    titleRu: 'Инопланетянин',
    titleEn: 'Alien Explorer',
    descRu: 'Описывай земные вещи с искренним недоумением пришельца, впервые увидевшего людей.',
    descEn: 'Describe everyday Earth objects with confusion like an extraterrestrial observer.',
  },
  {
    id: 'toddler',
    emoji: '👶',
    titleRu: 'Детский сад',
    titleEn: '5-Year-Old',
    descRu: 'Объясняй простыми детскими словами и интонациями («Ну это такая штуковина...»).',
    descEn: 'Explain using childlike words and sweet 5-year-old excitement.',
  },
  {
    id: 'guru',
    emoji: '🧘',
    titleRu: 'Дзен-мастер',
    titleEn: 'Zen Guru',
    descRu: 'Абсолютное спокойствие, медленная речь с глубоким вдохом и фразой «Постигни истину...».',
    descEn: 'Absolute calm, slow meditative speech, deep breaths and saying "Enlighten yourself...".',
  },
  {
    id: 'spy',
    emoji: '🕵️',
    titleRu: 'Спецагент',
    titleEn: 'Secret Agent',
    descRu: 'Говори конспиративно, озирайся и делай вид, что вас подслушивает разведка.',
    descEn: 'Speak in code and whispers, looking around as if enemy agents are eavesdropping.',
  },
  {
    id: 'opera',
    emoji: '🎤',
    titleRu: 'Мюзикл / Опера',
    titleEn: 'Musical / Opera',
    descRu: 'Напевай свои подсказки и декламируй их мелодично, как на бродвейской сцене.',
    descEn: 'Sing your clues melodically as if performing in a grand Broadway musical.',
  },
  {
    id: 'pirate',
    emoji: '🏴‍☠️',
    titleRu: 'Морской волк',
    titleEn: 'Pirate Captain',
    descRu: 'Вставляй пиратский сленг («Разрази меня гром!», «Карамба!», «Свистать всех наверх!»).',
    descEn: 'Talk like a salty pirate ("Ahoy!", "Shiver me timbers!", "Blimey!").',
  },
  {
    id: 't_rex',
    emoji: '🦖',
    titleRu: 'Тираннозавр',
    titleEn: 'T-Rex Hands',
    descRu: 'Прижми локти к рёбрам, согни пальцы-лапки и объясняй не разгибая рук.',
    descEn: 'Tuck your elbows to your ribs with tiny dinosaur claws and do not extend your arms.',
  },
  {
    id: 'frozen',
    emoji: '🧊',
    titleRu: 'Застывшая статуя',
    titleEn: 'Statue',
    descRu: 'Не шевели ни руками, ни головой, говори исключительно губами.',
    descEn: 'Do not move your head or hands at all — only move your lips.',
  },
  {
    id: 'questions',
    emoji: '❓',
    titleRu: 'Только вопросы',
    titleEn: 'Questions Only',
    descRu: 'Любая твоя подсказка обязательно должна звучать как вопросительное предложение!',
    descEn: 'Every single clue you say must be framed as a question!',
  },
  {
    id: 'fast_furious',
    emoji: '🏎️',
    titleRu: 'Форсаж',
    titleEn: 'Fast & Furious',
    descRu: 'Говори скороговоркой на максимальной скорости спортивного комментатора.',
    descEn: 'Speak at breakneck speed like an excited Formula 1 race commentator.',
  },
  {
    id: 'wizard',
    emoji: '🧙',
    titleRu: 'Древний маг',
    titleEn: 'Ancient Wizard',
    descRu: 'Говори загадочными древними пророчествами («В древних свитках сказано о предмете...»).',
    descEn: 'Deliver your clues as cryptic prophecies ("Ancient scrolls speak of an artifact...").',
  },
  {
    id: 'chef',
    emoji: '🍳',
    titleRu: 'Грозный шеф-повар',
    titleEn: 'Angry Chef',
    descRu: 'Объясняй с экспрессией и пылом грозного шеф-повара ресторанного телешоу!',
    descEn: 'Explain with the fiery passion and drama of a Michelin-star TV celebrity chef!',
  },
];

export function getRandomModifierId(excludeId?: string | null): string {
  const available = excludeId
    ? PARTY_MODIFIERS.filter((m) => m.id !== excludeId)
    : PARTY_MODIFIERS;
  const list = available.length > 0 ? available : PARTY_MODIFIERS;
  const randomIndex = Math.floor(Math.random() * list.length);
  return list[randomIndex].id;
}

export function getModifierById(id?: string | null): PartyModifier | undefined {
  if (!id) return undefined;
  return PARTY_MODIFIERS.find((m) => m.id === id);
}
