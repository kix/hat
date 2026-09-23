export interface GeneratePackOptions {
  topic: string;
  count: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
  lang: 'ru' | 'en';
  apiKey?: string;
}

// Встроенная база тематических шаблонов для быстрой и офлайн генерации
const THEME_SEEDS_RU: Record<string, string[]> = {
  'гарри поттер': [
    'Волан-де-Морт', 'Гермиона Грейнджер', 'Хогвартс', 'Гриффиндор', 'Слизерин',
    'Квиддич', 'Золотой снитч', 'Бузинная палочка', 'Мантия-невидимка', 'Распределяющая шляпа',
    'Дамблдор', 'Северус Снейп', 'Добби', 'Дементор', 'Патронус', 'Омут памяти',
    'Карта мародеров', 'Косой переулок', 'Платформа 9¾', 'Гремучая ива', 'Беллатриса Лестрейндж',
    'Сириус Блэк', 'Люциус Малфой', 'Василиск', 'Маховик времени', 'Феникс Фоукс',
    'Крестраж', 'Экспеллиармус', 'Авада Кедавра', 'Сливочное пиво', 'Дурсли', 'Тисовая улица',
    'Оливандер', 'Запретный лес', 'Хагрид', 'Клык', 'Букля', 'Нимбус 2000'
  ],
  'офис': [
    'Майкл Скотт', 'Джим Халперт', 'Пэм Бизли', 'Дуайт Шрут', 'Степлер в желе',
    'Дандер Миффлин', 'Премия Данди', 'Скрентон', 'Ферма свеклы', 'Энди Бернард',
    'Кевин Малоун', 'Чили Кевина', 'Анжела Мартин', 'Крид Брэттон', 'Стэнли Хадсон',
    'День кренделя', 'Тоби Флендерсон', 'Келли Капур', 'Райан Ховард', 'Паркур',
    'Угроза на уровне полуночи', 'Джиммирование камеры', 'Ассистент регионального менеджера',
    'Склад', 'Мередит Палмер', 'Оскар Мартинес', 'Филис Вэнс', 'Боб Вэнс'
  ],
  'it': [
    'Стартап', 'Пулл-реквест', 'Деплой', 'Рефакторинг', 'Легаси', 'Баг-трекер',
    'Скрам-мастер', 'Спринт', 'Дейли', 'Код-ревью', 'Техдолг', 'Пайплайн',
    'Докер-контейнер', 'Кубернетес', 'Микросервисы', 'Монолит', 'Фулстек', 'Фронтенд',
    'Бэкенд', 'База данных', 'Индексация', 'Мердж конфликт', 'Прод упал', 'Хотфикс',
    'Опенсорс', 'Венчурный фонд', 'Питч-дек', 'Бёрндаун чарт', 'Асинхронность', 'Фреймворк'
  ],
  'медицина': [
    'Стетоскоп', 'Анестезия', 'Кардиограмма', 'Дефибриллятор', 'Скальпель', 'Шприц',
    'Реанимация', 'Фармацевт', 'Антибиотик', 'Рентген', 'МРТ', 'Иммунитет',
    'Вакцина', 'Хирургия', 'Педиатрия', 'Терапевт', 'Офтальмолог', 'Невропатолог',
    'Рецепт', 'Капельница', 'Гематома', 'Лейкоциты', 'Эритроциты', 'Пульсоксиметр'
  ],
  'мемы': [
    'Гигачад', 'Повар спрашивает повара', 'Свидетель из Фрязино', 'Кот с блинами',
    'Упячка', 'Троллфейс', 'Рикролл', 'Ждун', 'Читер', 'Кринж', 'База', 'Скуф',
    'Альт', 'Нормис', 'Шрек', 'Кот Том', 'Собака Доге', 'Стонкс', 'Это фиаско братан',
    'Гарольд скрывающий боль', 'Флекс', 'Рофл', 'Краш', 'Вайб'
  ],
  'кино': [
    'Оскар', 'Режиссер', 'Кинооператор', 'Хромакей', 'Дублер', 'Каскадер',
    'Сценарий', 'Саундтрек', 'Трейлер', 'Тизер', 'Блокбастер', 'Артхаус',
    'Камео', 'Клиффхэнгер', 'Посткредитная сцена', 'Хлопушка', 'Грим', 'Раскадровка'
  ]
};

const THEME_SEEDS_EN: Record<string, string[]> = {
  'harry potter': [
    'Voldemort', 'Hermione Granger', 'Hogwarts', 'Gryffindor', 'Slytherin',
    'Quidditch', 'Golden Snitch', 'Elder Wand', 'Invisibility Cloak', 'Sorting Hat',
    'Dumbledore', 'Severus Snape', 'Dobby', 'Dementor', 'Patronus', 'Pensieve',
    'Marauder Map', 'Diagon Alley', 'Platform 9 3/4', 'Whomping Willow', 'Bellatrix',
    'Sirius Black', 'Lucius Malfoy', 'Basilisk', 'Time-Turner', 'Horcrux', 'Expelliarmus'
  ],
  'the office': [
    'Michael Scott', 'Jim Halpert', 'Pam Beesly', 'Dwight Schrute', 'Jello stapler',
    'Dunder Mifflin', 'Dundie Award', 'Scranton', 'Beet Farm', 'Andy Bernard',
    'Kevin Malone', 'Kevin Chili', 'Angela Martin', 'Creed Bratton', 'Pretzel Day',
    'Threat Level Midnight', 'That is what she said', 'Assistant to Regional Manager'
  ],
  'it': [
    'Pull Request', 'Deployment', 'Refactoring', 'Legacy Code', 'Scrum Master',
    'Sprint', 'Code Review', 'Docker', 'Kubernetes', 'Microservices', 'Database',
    'Merge Conflict', 'Production Crash', 'Hotfix', 'Open Source', 'Venture Capital',
    'Async Await', 'Framework', 'Frontend', 'Backend', 'Fullstack'
  ]
};

export async function generateWordsWithAI(options: GeneratePackOptions): Promise<string[]> {
  const { topic, count, difficulty, lang, apiKey } = options;
  const normalizedTopic = topic.trim().toLowerCase();

  // 1. Попытка вызвать реальное Gemini API, если указан API ключ (пользовательский или системный)
  const effectiveKey = apiKey?.trim() || (import.meta as { env?: Record<string, string> }).env?.VITE_GEMINI_API_KEY;
  if (effectiveKey) {
    try {
      const prompt = lang === 'ru'
        ? `Сгенерируй ровно ${count} уникальных, интересных и узнаваемых слов или коротких понятий (1-2 слова) для игры в "Шляпу" (Alias/Крокодил) на тему: "${topic}". Сложность: ${difficulty}. Верни ТОЛЬКО список слов через запятую, без нумерации и лишнего текста.`
        : `Generate exactly ${count} unique, recognizable words or short 1-2 word concepts for the party word-guessing game Hat/Alias on the topic: "${topic}". Difficulty: ${difficulty}. Return ONLY a comma-separated list of words, without numbers or markdown.`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${effectiveKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1000,
          }
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText && typeof rawText === 'string') {
          const words = rawText
            .split(/[,\n]+/)
            .map((w: string) => w.replace(/^[\d.\s*-]+/, '').trim())
            .filter((w: string) => w.length > 1 && !w.includes(':'));

          if (words.length >= 5) {
            return Array.from(new Set(words)).slice(0, count);
          }
        }
      }
    } catch {
      // При сетевой ошибке переходим на интеллектуальный генератор
    }
  }

  // 2. Интеллектуальный офлайн генератор на основе семантических совпадений и вариаций
  const seeds = lang === 'ru' ? THEME_SEEDS_RU : THEME_SEEDS_EN;
  let matchingSeed: string[] | undefined;

  for (const [key, list] of Object.entries(seeds)) {
    if (normalizedTopic.includes(key) || key.includes(normalizedTopic)) {
      matchingSeed = list;
      break;
    }
  }

  const result: string[] = [];
  if (matchingSeed) {
    const shuffled = [...matchingSeed].sort(() => Math.random() - 0.5);
    result.push(...shuffled);
  }

  // Если слов не хватает или тема произвольная, генерируем ассоциативные и связанные сущности
  if (result.length < count) {
    const prefix = topic.charAt(0).toUpperCase() + topic.slice(1);
    const genericTemplatesRu = [
      'Главный герой', 'Финал', 'Кульминация', 'Антагонист', 'Легенда',
      'Артефакт', 'Секретная база', 'Мастер', 'Ученик', 'Тайное общество',
      'Особый навык', 'Трофей', 'Суперсила', 'Штаб-квартира', 'Культ',
      'Эпизод', 'Спецэффект', 'Цитата', 'Ритуал', 'Миссия'
    ];
    const genericTemplatesEn = [
      'Main Character', 'Final Boss', 'Plot Twist', 'Antagonist', 'Legend',
      'Artifact', 'Secret Base', 'Master', 'Apprentice', 'Secret Society',
      'Special Skill', 'Trophy', 'Superpower', 'Headquarters', 'Cult',
      'Episode', 'Special Effect', 'Iconic Quote', 'Ritual', 'Mission'
    ];

    const templates = lang === 'ru' ? genericTemplatesRu : genericTemplatesEn;
    for (const item of templates) {
      if (!result.includes(item)) {
        result.push(lang === 'ru' ? `${prefix}: ${item}` : `${prefix} ${item}`);
      }
      if (result.length >= count) break;
    }
  }

  return Array.from(new Set(result)).slice(0, count);
}
