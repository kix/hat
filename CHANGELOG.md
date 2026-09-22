# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.13.0] - 2026-09-22

### Added

- **👑 Режим Личный зачёт / «Каждый с каждым» (Individual Round-Robin Mode):**
  - Новый режим игры для компании от 3 до 12 человек, где каждый играет в паре с каждым по очереди.
  - Честная круговая система $N \times (N-1)$ раундов: каждый игрок успевает объяснить слова каждому напарнику и отгадать от каждого.
  - Индивидуальный подсчет очков: за каждое разгаданное слово оба участника пары получают по +1 очку (объясняющий и отгадывающий). За фолы/пропуски штрафуется только объясняющий (-1).
  - Удобное управление списком игроков: добавление, удаление, автозаполнение, рандомизация порядка рассадки, верификация через Telegram и NFC.
  - Динамический лидерборд на экране раунда и наглядная подсказка, кто ходит следующим.
  - **🏆 Итоговый экран личного зачёта:**
    - Победитель личного зачёта 🥇, призеры 🥈 🥉 и подробный разбор очков каждого игрока (угадал / объяснил / штрафы).
    - Новая номинация **«🔥 Лучший тандем»** — пара игроков, набравшая наибольшее количество совместных очков в партии.
  - Поддержка генерации графических карточек результатов для соцсетей (Stories/Post) в индивидуальном режиме.

## [1.12.0] - 2026-09-22

### Added

- **🏆 Система Достижений и Наград (Achievements System):**
  - Добавлено 12 разнообразных достижений с наградами опыта (XP):
    - ⚡ **«Молния»** — отгадать слово быстрее чем за 3 секунды (+100 XP).
    - ⏳ **«Железные нервы»** — отгадать слово на последних секундах раунда (+150 XP).
    - 🔥 **«Огненная серия»** — набрать серию из 4+ слов подряд без ошибок (+150 XP).
    - 🎯 **«Телепат»** — отгадать 5+ слов за один раунд (+200 XP).
    - 🧠 **«Эрудит»** — отгадать редкое или длинное сложное слово (+150 XP).
    - 🛡️ **«Чистая игра»** — победить в игре без единого нарушения правил (+150 XP).
    - 🏆 **«Чемпион»** — одержать 5 побед в играх (+250 XP).
    - 🎖️ **«Ветеран Шляпы»** — сыграть 10 или более партий (+250 XP).
    - 🤝 **«Идеальный дуэт»** — сыграть 5+ совместных игр с одним напарником (+150 XP).
    - 🔞 **«Душа вечеринки»** — сыграть партию с набором «18+ и Вечеринка» (+100 XP).
    - 🎨 **«Своя шляпа»** — сыграть партию с собственным набором слов (+100 XP).
    - 🌍 **«Путешественник»** — сыграть партию с тематическим словарем (+100 XP).
- **🎉 Праздничные уведомления на экране итогов:**
  - При получении новых достижений на экране результатов игры появляется праздничный баннер с анимацией конфетти и начислением бонусного опыта.
- **📱 Обновленный раздел достижений в профиле:**
  - Фильтры «Все», «Открытые», «В процессе», шкалы прогресса, бейджи XP и счетчик выполнения.

## [1.11.0] - 2026-09-22

### Added

- **Сбор слов в шляпу со смартфонов гостей (QR Word Submission):**
  - Подключенные к локальной игре через QR-код гости теперь могут бросать свои слова и фразы прямо со своих смартфонов.
  - Слова мгновенно попадают в общий банк ведущего с автоматической дедупликацией.
  - Отображение добавленных слов гостя и счетчика слов в шляпе в реальном времени.

- **🔞 Тематический набор «18+ и Вечеринка» (Party & Adult Pack):**
  - Новый тематический словарь для вечеринок на русском и английском языках (клубная жизнь, коктейли, флирт, пикантные темы и утренние последствия).
  - Доступен в селекторе наборов слов в настройках раунда.

## [1.10.0] - 2026-09-22

### Added

- **Тематические наборы слов (Thematic Word Packs):**
  - Добавлено 7 новых тематических словарей для игр на русском и английском языках:
    - 🎬 **Кино и сериалы** (фильмы, сериалы, персонажи, режиссеры и кинотермины).
    - 🍕 **Еда и напитки** (кухни мира, десерты, напитки и кулинария).
    - 🌍 **География и страны** (города, страны, горы, острова и достопримечательности).
    - 🎮 **Игры и гик-культура** (видеоигры, киберспорт, консоли, аниме и мемы).
    - 🦁 **Животный мир** (звери, птицы, морские обитатели и природа).
    - 🎭 **Знаменитости и персонажи** (исторические личности, актеры, музыканты и герои).
    - 💻 **IT и технологии** (гаджеты, алгоритмы, софт, нейросети и интернет).
  - Удобный сгруппированный селектор наборов слов в настройках раунда.

- **Индикатор «Горячая серия» (Hot Streak 🔥) и номинация MVP:**
  - В течение раунда отслеживается непрерывная серия правильных ответов без ошибок и пропусков.
  - При серии от 3+ угаданных слов на экране появляется анимированный огненный бейдж (`🔥 СЕРИЯ: 3`, `🔥 В ОГНЕ: 5!`).
  - На экране итогов игры добавлена новая номинация MVP **«🔥 Король серий»** за самую длинную непрерывную серию правильных отгадок.

- **Всплывающее окно толкования слов (Word Definition Modal):**
  - На экране «Работа над ошибками» и в статистике конца игры добавлена кнопка просмотра значения слова (📖).
  - Отображает словарное толкование из базы данных или быстрый переход в Викисловарь.

## [1.9.2] - 2026-09-18

### Removed

- **Звуковой эффект крика при падении устройства:**
  - Полностью отключен и удален фоновый хук отслеживания акселерометра и воспроизведения крика при свободном падении/броске телефона.

## [1.9.1] - 2026-09-18

### Fixed

- **Отображение слов в топе сложных слов на мобильных устройствах:**
  - Исправлена верстка карточек на вкладке «Топ сложных слов» экрана «Статистика»: включен адаптивный перенос элементов и убрана избыточная обрезка текста, благодаря чему слова теперь полностью видны и читаемы на смартфонах.

## [1.9.0] - 2026-09-18

### Added

- **Экран «Статистика» и топ-10 самых сложных слов:**
  - «Таблица лидеров» переименована в «Статистику» во всем приложении с обновленной иконкой (📊).
  - Добавлен раздел **«Топ сложных слов»** с рейтингом слов, над отгадыванием которых игроки думали дольше всего.
  - Для каждого слова отображаются среднее время отгадывания, количество разгадок и словарные толкования.
  - Оптимизированная серверная RPC-функция `get_hardest_words` с агрегацией по всем сыгранным раундам.

- **Улучшения профиля и авторизации Telegram:**
  - Прямой доступ к профилю игрока из меню в правом верхнем углу для всех пользователей.
  - Исправлен вход через Telegram OIDC и подтверждение привязки аккаунта в Telegram-боте.
  - Убраны лишние метки «Авторизован в Telegram» из карточек команд.
  - Проведено объединение дублирующихся профилей игроков в базе данных.

## [1.8.0] - 2026-09-15

### Added

- **Авторизация участников локальной игры через Telegram @юзернеймы:**
  - Добавлена возможность вводить и подтверждать участников локальной игры на одном общем устройстве через ввод их Telegram @юзернейма.
  - Бот в Telegram отправляет игроку интерактивный запрос с кнопками выбора отображаемого имени: имя из профиля Telegram, @юзернейм или отклонение.
  - Поддержка персональной deep-link ссылки (`t.me/<bot>?start=join_<id>`) для игроков, ещё не запускавших бота.
  - Мгновенное обновление имени и статуса игрока в реальном времени с отображением бейджа «Авторизован в Telegram».
  - Все очки, статистика, победы и опыт (XP) за локальную игру сохраняются в профиль подтвержденного Telegram-игрока.

- **Еженедельный дайджест самых сложных слов и команда /hardest:**
  - Серверная процедура автоматической рассылки `send_weekly_hardest_words` топ-10 самых сложных слов недели (по времени угадывания) с их толкованиями и определениями по понедельникам в 10:00 МСК через `pg_cron`.
  - Таблица `public.word_definitions` с толкованиями сложных и редких слов.
  - Добавлена интерактивная команда бота `/hardest` для мгновенного запроса актуального топа сложных слов и определений в любой момент.

## [1.7.0] - 2026-09-15

### Added

- **Глобальная таблица лидеров (Лидерборд) и рейтинг игроков:**
  - Реализован экран таблицы лидеров (`LeaderboardScreen`) с подиумом топ-3 игроков (золото 🥇, серебро 🥈, бронза 🥉) и полным рейтингом до 50 лучших игроков.
  - Поддержка сортировки по трем категориям: **Опыт (XP)**, **Победы** и **Количество отгаданных слов**.
  - Персонализированное выделение текущего игрока с подсветкой строки и плавающим статус-баром его позиции в общем зачете.
  - Серверная SQL RPC-функция `get_leaderboard` для мгновенного агрегированного расчета статистики с автоматическим клиентским fallback-режимом.
  - Кнопки быстрого доступа к лидерборду на главном экране, в меню профиля (`AuthMenu`) и в окне профиля (`ProfileScreen`).

## [1.6.39] - 2026-09-15

### Added

- **Система уровней и очков опыта (XP) для авторизованных игроков:**
  - Реализована прокачка уровней (1–10+ ранги: от *«Новичок»* до *«Повелитель Шляпы»*) с расчетом опыта (XP) за сыгранные партии, победы, угаданные/объясненные слова, молниеносные ответы (<3с) и чистую игру без фолов.
  - Опыт также начисляется за все разблокированные достижения.
  - В профиле игрока (`ProfileScreen`) добавлен интерактивный блок прогресса уровня с прогресс-баром, деталями начисления опыта и разворачивающейся шкалой всех рангов игры.
  - На экране завершения партии (`GameOverScreen`) добавлен блок начисленного опыта с подробной разбивкой (участие, победа, слова, бонусы).
  - В меню профиля (`AuthMenu`) отображается текущий уровень и ранг игрока.

## [1.6.38] - 2026-09-15

### Added

- **Интеграция запуска игры в Telegram-боте при /start:**
  - Добавлен автоматический ответ бота при вызове `/start` с кнопкой быстрого запуска Telegram Mini App («🎮 Играть в «Шляпу»») и ссылкой на веб-версию.
  - Добавлена функция и скрипт `setup:bot` для настройки нативной кнопки меню (Chat Menu Button) и списка команд бота (`/start`, `/help`).
  - Создана Supabase Edge Function `telegram-bot` и SQL-миграция `handle_telegram_webhook` для обработки вебхуков Telegram Bot API.

## [1.6.37] - 2026-09-11

### Performance

- **Оптимизация скорости загрузки (Lighthouse Core Web Vitals):**
  - Устранена блокировка рендеринга шрифтов Google Fonts (переход на асинхронную загрузку с предзагрузкой стилей и системным стеком шрифтов).
  - Скрипт `telegram-web-app.js` переведён в режим `defer`, чтобы не блокировать начальный парсинг HTML.
  - Оптимизирована фоновая предзагрузка тяжёлых словарей (4 МБ): отключена фоновая загрузка на посадочной странице, чтобы не перегружать пропускную способность мобильного интернета при первом визите.
  - Добавлена обработка ошибок и плавный fallback для аватаров пользователей, предотвращающий консольные ошибки сети 404.

## [1.6.36] - 2026-09-11

### Added

- **Ссылки на Telegram Mini App из веб-версии:**
  - Добавлен промо-баннер на стартовом экране веб-версии для быстрого перехода в Telegram Mini App (`t.me/hat_gae_bot?startapp=hat`).
  - Добавлена ссылка «Играть в Telegram» в футер главной страницы и опция «Открыть в Telegram Mini App» в выпадающее меню авторизации.
  - Ссылки и баннеры автоматически скрываются при запуске внутри Telegram.

## [1.6.35] - 2026-09-11

### Security

- **Обновление зависимостей безопасности:**
  - Обновлен пакет `fast-uri` с версии 3.1.4 до 3.1.7 для устранения уязвимостей безопасности (GHSA-qw65-cvwx-89v3, GHSA-58mr-gqgx-xq4g, GHSA-5jgf-p345-68v8, GHSA-fph4-wmhf-6fwf, GHSA-f65p-4m7j-42xc, GHSA-7p8r-x3mc-p8w7).

## [1.6.34] - 2026-09-11

### Added

- **Генерация карточек результатов для Telegram Stories и чатов:**
  - Реализован высококачественный Canvas 2D рендерер и экспорт изображений в форматах **Stories (9:16, 1080×1920)** и **Пост в чат (4:5, 1080×1350)**.
  - Отрисовка подиума победителей с пьедесталом (🥇 1, 🥈 2, 🥉 3 места), очками, именами участников и короной.
  - Блок номинаций MVP и рекордов: *«Молния»* (самый быстрый ответ), *«Эрудит»* (лидер по отгаданным словам), *«Главный грабитель»* (перехват слов) и *«Железные нервы»* (ответ на последних секундах).
  - Модальное окно предпросмотра с быстрыми действиями: шеринг через Web Share API, копирование картинки в буфер обмена (`ClipboardItem`) и скачивание файла PNG.

## [1.6.33] - 2026-09-11

### Added

- **Поддержка Telegram Mini App (TMA):**
  - Подключен официальный Telegram WebApp SDK с автоматическим разворачиванием окна (`expand`), жизненным циклом и подтверждением закрытия.
  - Реализована бесшовная авто-авторизация (`useTelegramAutoAuth`): пользователи, запускающие игру внутри Telegram, мгновенно входят в систему со своим именем, Telegram ID и аватаром без лишних кликов.
  - Нативная кнопка «Назад» в шапке Telegram (`useTelegramBackButton`) привязана к экрану профиля и навигации.
  - Нативный тактильный отклик через `Telegram.WebApp.HapticFeedback` (`impactOccurred` / `notificationOccurred`) для четкой вибрации на смартфонах с фоллбеком на `navigator.vibrate`.
- **Мета-игра, профили и достижения 2.0:**
  - Добавлена расширенная система достижений с прогресс-барами (8 ачивок: *«Молния»*, *«Эрудит»*, *«Железные нервы»*, *«Чемпион»*, *«Телепат»*, *«Ветеран Шляпы»*, *«Идеальный дуэт»*, *«Чистая игра»*).
  - Секция синергии с напарниками с расчетом количества совместных игр и процента побед.
  - Карточки личных рекордов слов (самое быстрое и самое сложное разгаданное слово).

### Changed

- **Оптимизация бандла (Manual Chunks):**
  - Настроено ручное разделение чанков для библиотек Mantine UI, Supabase, XState и Tabler Icons, уменьшив размер входного бандла `index.js` с 667 КБ до 264 КБ (~82 КБ в gzip).

## [1.6.32] - 2026-09-10

### Added

- **Отображение истории изменений (Changelog) на фронтенде:**
  - Номер версии приложения в футере стартового экрана (`v1.6.32`) стал кликабельной ссылкой, открывающей модальное окно со структурированной историей изменений.
  - Автоматический парсинг `CHANGELOG.md` с визуальным выделением категорий (`Added`, `Fixed`, `Changed`, `Removed`, `Security`), поддержкой markdown-форматирования (жирный шрифт, инлайн-код, списки, ссылки на GitHub Releases) и бейджем текущей версии.
  - Ленивая загрузка модуля модального окна и данных чейнджлога (`React.lazy` + `Suspense`) для сохранения скорости первой загрузки страницы.
  - Поддержка прямого перехода по URL-параметру `?changelog` и трекинг событий аналитики (`changelog_click`).
  - Полная локализация интерфейса чейнджлога на русский и английский языки.

## [1.6.31] - 2026-09-10

### Fixed

- **Исправление вертикальной прокрутки страниц на мобильных и десктопных браузерах:**
  - Удалены глобальные блокирующие свойства `overflow-x: hidden`, `overscroll-behavior-y: none` и `user-select: none` с `html` и `body`.
  - Заменено `overflow-x: hidden` на современный `overflow-x: clip` для безопасного отсечения горизонтального переполнения без создания вложенных контейнеров скролла и без блокировки вертикальной прокрутки окна.
  - В компоненте `SwipeableWordCard` свойство `touch-action: none` ограничено самой карточкой слова вместо всего экрана, что вернуло естественную прокрутку и свайпы при задевании окружающего пространства.

## [1.6.30] - 2026-09-08

### Added

- **Свайп вверх для фиксации нарушения (Foul gesture):**
  - Добавлен вертикальный свайп вверх на карточке слова с индикатором `НАРУШЕНИЕ` и красной подсветкой.
  - Обновлены подсказки жестов на русском и английском языках (`← пропустить | нарушение ↑ | угадано →`).
- **Динамический звук таймера и сирена окончания времени:**
  - На последних 5 секундах раунда тиканье ускоряется и нарастает по тональности (от 880Гц до 1320Гц).
  - При истечении времени (0 сек) звучит двухтональная сирена окончания раунда с виброоткликом.
- **Визуальная подсветка действий (Action Glow Feedback):**
  - При отгадывании (🟢 зеленый), пропуске (⚪ нейтральный) и нарушении (🔴 красный) экран на мгновение подсвечивается цветным контурным свечением, давая чёткий тактильно-визуальный отклик на смартфонах и ПК.
- **Подиум с медалями и бейдж MVP:**
  - На экране итогов игры топ-3 команд и игроков награждаются медалями (🥇, 🥈, 🥉).
  - Лучший игрок раунда выделен кубком и бейджем MVP.

## [1.6.29] - 2026-09-08

### Added

- **Предзагрузка словарей (Dictionary Prefetching):** 
  - Реализован модуль `dictionaryLoader` с кэшированием в памяти загруженных словарей и префетчингом.
  - В фоне через `requestIdleCallback` автоматически предзагружаются стандартный русский словарь и английский словарь, пока пользователь находится на начальном экране.
  - Добавлены упреждающие триггеры предзагрузки при наведении и тапах на переключатели языка (`LanguageToggle`) и словарей (`wordPack`).

## [1.6.28] - 2026-09-08

### Fixed

- **Горизонтальный скролл на мобильных устройствах (Pixel 8a):**
  - Заменили абсолютные метки слайдеров (`marks`) на стандартный flex-блок (`Group justify="space-between"`), исключив выход надписей «Сложнее» / «100» за пределы трека слайдера.
  - Сократили названия вкладок в `SegmentedControl` («Частотный», «Парный»), исключив переполнение кнопок на узких экранах.
  - Добавили `overflow-x: hidden` для `html`, `body` и `#root`, а также перенос строк `wrap="wrap"` для футера стартового экрана.

## [1.6.27] - 2026-08-31

### Fixed

- **Вход через Telegram падал с ошибкой `record "new" has no field "updated_at"`:** На проде у таблицы `public.user_states` отсутствовала колонка `updated_at`, хотя на неё навешан триггер `trigger_update_user_states_time`, который её выставляет при любом `UPDATE`. RPC-функция `link_telegram_user` как раз обновляет `user_states` при переносе анонимного профиля на Telegram-аккаунт — из-за этого падал весь вход. Добавлена миграция `20260831120000_fix_user_states_updated_at.sql`, приводящая схему в соответствие с `supabase_setup.md`, и применена на боевой базе.

## [1.6.26] - 2026-08-31

### Added

- **Свайп-жесты для карточек слов:** Добавлен новый интерактивный свайп-интерфейс `SwipeableWordCard` для экрана объясняющего. Игроки могут свайпать карточку со словом вправо (отметить как угаданное) или влево (пропустить слово, если разрешено). Поддерживает сглаженную анимацию отклонения и цветовой оверлей-фидбек во время перетаскивания.
- **Поддержка тач- и мышь-событий:** Жесты работают на мобильных устройствах (сенсорный ввод с блокировкой системного скролла страницы) и на компьютерах (перетаскивание мышью).

## [1.6.25] - 2026-08-18

### Added

- **Тумблер отключения проверки слов:** Добавлена настройка «Работа над ошибками» (переключатель Switch на экране настроек). Если опция выключена, раунд будет переходить сразу к следующей команде (или к экрану конца игры), минуя экран пересмотра ответов раунда.

## [1.6.24] - 2026-08-18

### Changed

- **Оптимизация скорости загрузки (Code Splitting):** Внедрили разделение кода и ленивую загрузку (`React.lazy` + `Suspense`) для 9 экранов игры (лобби, игровой процесс, проверка результатов, профили и т.д.). Объем первого загружаемого скрипта уменьшен на 30% (~270 КБ несжатого JS / ~95 КБ в gzip). Основной экран настроек оставлен статическим для мгновенного старта.

## [1.6.23] - 2026-08-18

### Fixed

- **Горизонтальный скролл на домашнем экране:** Сдвинули подписи делений (`marks`) на слайдерах количества слов и сложности игры с помощью translateX смещений. Это предотвращает выход текста «Сложнее» за правый край экрана и устраняет нежелательный горизонтальный скролл на мобильных устройствах.

## [1.6.22] - 2026-08-18

### Changed

- **Автоматическое обжалование результатов:** Экран проверки слов («Работа над ошибками») теперь открывается автоматически сразу по окончании раунда после перехода хода к новой команде (вместо ручного открытия по кнопке). Ручные кнопки запуска обжалования удалены для упрощения интерфейса.

## [1.6.21] - 2026-08-18

### Fixed

- **Горизонтальный скролл на мобильных устройствах:** Заменили горизонтальный `SegmentedControl` на адаптивную сетку кнопок 2x2 на экране «Работы над ошибками». Это предотвращает растягивание карточек и появление горизонтального скролла на узких экранах смартфонов.

## [1.6.20] - 2026-08-18

### Added

- **Экран проверки слов («Работа над ошибками»):** Добавлен новый экран обжалования раунда по кнопке «Обжаловать результат» на экранах вступления следующего раунда и окончания игры. Позволяет изменять результаты слов (угадано, пропуск, нарушение, не успели). При изменении таймаута слова автоматически возвращаются в шляпу или удаляются из неё.
- **Дробление русского словаря (Dictionary Splitting):** Разделили массивный словарь (5.3 МБ) на две части: `dictionaryRuFrequent.ts` (~6.9k популярных слов, ~620 КБ) и `dictionaryRuStandard.ts` (~44k сложных/редких слов, ~4 МБ). По умолчанию загружается только чанк частых слов, что сократило размер начальной загрузки на 90%. Сложный словарь подгружается лениво по требованию при выборе режима «Все слова».
- **Инструменты курирования слов:** Обновили dev-middleware в `vite.config.ts` для поддержки поиска и редактирования слов в любом из новых файлов словарей при разметке или удалении прямо из UI игры.

## [1.6.17] - 2026-07-29

### Added

- **Google Play & PWA Publishing Assets.** Added a bilingual Privacy Policy page (`public/privacy.html`) and an Android Digital Asset Links verification template (`public/.well-known/assetlinks.json`) required for publishing the application on Google Play via Trusted Web Activity (TWA) or PWABuilder.
- **Enabled Jekyll-free deployment.** Added a `.nojekyll` configuration file to ensure the `.well-known` subdirectory is served correctly by GitHub Pages.

## [1.6.16] - 2026-07-29

### Added

- **Google Analytics Event Tracking.** Integrated safe, ad-blocker-proof event tracking for key application flows: game starts (`game_start`), game ends (`game_end`), multiplayer room creations (`create_room`), room joins (`join_room`), OIDC login clicks (`auth_click`), support donations link clicks (`support_click`), and telegram notifications preferences toggling/bot-starts (`telegram_notifications_toggle` and `bot_start_click`).
- **Fail-Safe Adblocker Protection.** Wrapped Google Analytics calls to guarantee that browser extensions blocking analytics scripts or tracking services cannot throw exceptions or disrupt the runtime functionality of the game.

## [1.6.15] - 2026-07-28

### Fixed

- **Supabase OIDC Password Pepper Issue.** Redesigned the Telegram login architecture to use standard client-side anonymous login (`signInAnonymously`) combined with a database-level `link_telegram_user` session merging function. This completely bypasses GoTrue's password logins (which were failing with `AuthRetryableFetchError` (HTTP 500) due to password pepper schema validation and SMTP rate limiting), while fully preserving stable game statistics, notifications, and profile recovery.

## [1.6.14] - 2026-07-28

### Fixed

- **Robust Error Messaging in OIDC catch block.** Handled JavaScript native `Error` instances correctly in the auth exception handler to prevent empty JSON string outputs (`{}`) and instead log and show clear name/message pairs.

## [1.6.13] - 2026-07-28

### Fixed

- **Telegram ID Database Conflicts.** Updated the `register_telegram_user` DB function to lookup users by their `telegram_id` metadata (rather than strict email matches), and programmatically cleans up any duplicate legacy notification profile rows. This prevents `duplicate key value violates unique constraint "unique_telegram_id"` errors when migrating users from old domain schemes.

## [1.6.12] - 2026-07-28

### Fixed

- **Supabase Generated Column Error.** Omitted the `confirmed_at` column from the manual INSERT statement in the `register_telegram_user` DB function. In newer versions of Supabase GoTrue, `confirmed_at` is a generated column, so trying to insert values into it triggers database validation errors.

## [1.6.11] - 2026-07-28

### Fixed

- **Bypassed Email Signup Rate Limits.** Created and integrated a `register_telegram_user` security definer database function that registers or updates Telegram users directly in the `auth.users` table with confirmed status (`email_confirmed_at` and `confirmed_at` set to `now()`). This bypasses GoTrue's SMTP signup confirmation emails, completely preventing "email rate limit exceeded" errors for OIDC users.

## [1.6.10] - 2026-07-28

### Fixed

- **Mock Email Domain Validation.** Changed the generated mock email domain from `telegram.hat` (using an invalid `.hat` TLD which is rejected by Supabase Auth / GoTrue's format validation library) to the universally valid `telegram.com` domain.

## [1.6.9] - 2026-07-28

### Fixed

- **Game Participant Mapping in History.** Mapped local player IDs (like generic string IDs generated during setup) to their actual Supabase user UUIDs inside the `history_data` JSONB structure (`describerId` and `guesserId`) before saving the game results. This ensures daily summaries and user statistics are compiled correctly for both local and online players.
- **Auto-Mapping Current User in Setup.** Added the currently logged-in user to the connected participants pool during team configuration, allowing autocomplete/type matching to automatically link the local player slot to their Supabase user account ID in the frontend context.

## [1.6.8] - 2026-07-28

### Added

- **Improved Telegram Linking UX.** Made the instruction text warning to open the Telegram Bot and press "Start" always visible (under a dashed divider), and dynamically displays the bot handle (e.g. `@bot_username`) so the bot is easy to find.

## [1.6.7] - 2026-07-28

### Fixed

- **Telegram OIDC Account Duplication.** Replaced the anonymous login with a stable, deterministic credential login flow linked to the user's real Telegram ID. This ensures users sign in to their existing account instead of creating duplicate anonymous profiles upon clearing browser sessions.
- **Telegram ID Extraction.** Added fallback checks (`decoded.id` / `decoded.telegram_id`) to retrieve the raw numeric Telegram user ID from the OIDC claims token, falling back to the JWT `sub` pairwise identifier only when necessary.

## [1.6.5] - 2026-07-28

### Added

- **Report Bug Link in Footer.** Added a bug reporting link pointing directly to the GitHub Issues creation page. Fully localized into Russian and English.

## [1.6.4] - 2026-07-28

### Added

- **Version Footer and Support Link.** Display the current package version in the app footer along with a support (Tribute) donation link. Fully localized into Russian and English.

## [1.6.3] - 2026-07-28

### Added

- **Google Analytics.** Injected Google tag (gtag.js) script into the index.html head for page tracking and telemetry.

## [1.6.2] - 2026-07-28

### Added

- **Landing page how-to-play description.** Added a dedicated card explaining the rules and setup instructions of the game. Fully localized into Russian and English.

## [1.6.1] - 2026-07-28

### Removed

- **Google Login integration.** Disabled Google Sign-In options from both the main landing page and the auth popover dropdown.

## [1.6.0] - 2026-07-28

### Added

- **Web NFC Name Collecting & Lobby Sharing.** Integrated Web NFC (`NDEFReader` API) to support sharing and joining local game sessions.
  - **Lobby sharing**: Write the active room join URL directly to any blank NFC card/sticker. Guests tap their phone to the card to instantly join the room.
  - **Player name scanning**: Tapping the NFC button next to a player slot prompts the host to scan a player's card/badge, automatically populating their name into the slot.
  - Fully translated NFC dialog states and error handling for Russian and English.
- **Cinematic Theme Switch Animation.** Added a premium circular ripple reveal animation when switching light/dark color modes, utilizing the modern `View Transitions API` (`document.startViewTransition`) with performance-optimized CSS clip-path masks.

## [1.5.1] - 2026-07-28

### Fixed

- **Session loading race condition.** Fixed a bug where `saveGameResult` would run before the Supabase auth session resolved, causing games to be saved with `currentUserId` as `undefined` and missing participant connections.

## [1.5.0] - 2026-07-28

### Added

- **QR-code lobby joining for local games.** Hosts of local (Pass & Play) games can now open a dynamic lobby displaying a QR code. Other players scan the QR code to connect their device, enter their name, and join the local lobby on the host's screen.
  - Automatically fetches client-side UUIDs of connected guests so their game results and achievements save directly to their profiles.
  - Added **Autocomplete integration** on team player cards, letting the host easily pick from connected guests.
  - Added **Auto-distribute button** that assigns all connected players to team slots sequentially.
  - Created a dedicated **Guest Waiting Screen** for players who join a local lobby, keeping them synced in real-time.

## [1.4.1] - 2026-07-28

### Fixed

- **Localization and pluralization support** for the new Game Over statistics screen in both Russian and English. Plurals for fouls are correctly handled (e.g., "1 foul" / "2 fouls" in English, "1 нарушение" / "2 нарушения" / "5 нарушений" in Russian).

## [1.4.0] - 2026-07-28

### Added

- **Word Packs and Custom Lists.** Players can now choose between:
  - "All words" (complete 50,000+ nouns dictionary).
  - "Frequent (top)" (lightweight top-3000 most common nouns, perfect for quick/easy games).
  - "Custom list" (import custom words via comma or newline separator directly in the lobby settings, with automatic count clamping).
- **Detailed Game Over Nominations & Statistics.** Added dedicated cards for:
  - ⚡️ Fastest Guess (fastest single correct guess).
  - ⏳ Slowest Guess (slowest single correct guess).
  - 🕵️‍♂️ Theft of the Century (Кражи века) — list of words stolen by another team after the active team failed (due to timeout, skip, or foul).
  - 🚨 Rule Breakers (Фолы) — list of players who violated word-explanation rules.
- **Dramatic End-of-Round Confetti.** Replaced simple confetti with a 3-second multi-stage cross-confetti cascade.

### Fixed

- Resolved Supabase `400 (Bad Request)` on `user_states` upsert by removing the redundant `onConflict` parameter.
- Resolved Supabase `23503 (Foreign Key Constraint)` on `game_participants` by ensuring random client-side UUIDs from local players are not treated as authenticated user IDs.
- Database setup script robustness: made all policies and triggers safe for repeat runs with pre-creation `DROP POLICY/TRIGGER IF EXISTS` cleanups.

## [1.3.0] - 2026-07-27

### Added

- **English version.** The whole app can now run in English, switchable via a
  RU/EN toggle in the header (persisted, defaults to the browser language).
  - Full UI internationalization: a lightweight in-house `i18n` layer
    (`useI18n`/`t()` for components, `tr()` for the state machine and utils)
    with a complete RU + EN message catalog. Every user-facing string was
    migrated — screens, buttons, placeholders, aria-labels, alerts, and
    multiplayer/validation messages.
  - A generated **English word dictionary** (`src/data/dictionaryEn.ts`,
    ~11.4k common nouns from WordNet scored by Zipf frequency via
    rspeer/wordfreq, difficulty-tiered and family-friendly filtered), loaded
    in place of the Russian list when the language is English. Generator
    script: `scripts/generate_english_dictionary.py`.
  - Language-aware team-name generation (English adjectives + the English
    dictionary), default player names, and date formatting.
- Word cards now use the theme text color instead of hardcoded black, so they
  render correctly in dark mode.

## [1.2.0] - 2026-07-27

### Added

- **Share a finished game to Telegram.** The game-over screen now has a
  "Поделиться в Telegram" button (plus copy-link) that links to a shareable,
  read-only `?game=<uuid>` page rendering that single game — reusing the same
  view as the game-over screen and highlighting a logged-in viewer's own rows.
  The Telegram button opens Telegram's native share composer, so the user
  picks the chat and sends it themselves (no bot delivery involved). Backed by
  a new `get_game(uuid)` `SECURITY DEFINER` RPC (migration
  `20260727203815_share_single_game.sql`) so the link resolves for any viewer,
  logged in or not; `saveGameResult` now returns the new game id to enable it.
- **Night mode.** A light/dark theme toggle in the landing header, defaulting
  to the OS preference (`auto`) and persisted across sessions. A pre-mount
  script applies the saved scheme before React renders, so there's no
  theme flash on load.

## [1.1.1] - 2026-07-27

### Fixed

- Shared summary links now render for **logged-out** viewers. `get_game_summary`
  now returns the games and participants directly as JSON (it is `SECURITY
  DEFINER`, so it bypasses table grants) instead of leaving the client to
  re-read `public.games` — which `anon` has no SELECT grant on, so a
  not-logged-in visitor previously got a `42501 permission denied` after the
  digest loaded. Adds forward migration
  `20260727202125_summary_rpc_returns_games.sql` (drops and recreates the
  function, since the return type changed from `table` to `jsonb`); the
  frontend now consumes the single RPC payload.

## [1.1.0] - 2026-07-27

### Added

- **Daily Telegram game summaries.** Players who log in via Telegram can opt
  in (from their profile) to a once-daily direct message digesting the games
  they played the day before, with a link to a shareable summary page.
  - New shareable, read-only summary page addressed by `?summary=<uuid>`,
    where any participant can open the link and — if logged in via Telegram —
    see their own rows highlighted.
  - Backend is a Supabase migration (`supabase db push`) that adds a
    `pg_cron` job calling `build_and_send_daily_summaries()`, which groups
    each opted-in user's prior-day games into a `game_summaries` row and DMs
    the link via the Telegram Bot API through the `http` extension. The bot
    token is read from Supabase Vault and never ships to the client.
  - Games now persist a `teams_data` roster snapshot so the summary page
    renders faithfully; the game-over screen was refactored to share its
    rendering with the new page (no behavior change).
  - New `VITE_TELEGRAM_BOT_USERNAME` env var powers the "press Start" deep
    link required by Telegram's rule that bots cannot cold-message users.
  - Project is now Supabase-CLI-managed (`supabase/config.toml`); the schema
    change ships as a timestamped migration. See `supabase_setup.md` §8 for
    the one-time deploy steps (enable `pg_cron`/`http`, store the bot token in
    Vault, set `app_base_url`, schedule the cron).

## [1.0.1] - 2026-07-27

### Security

- Resolved a high-severity `brace-expansion` advisory
  ([GHSA-mh99-v99m-4gvg](https://github.com/advisories/GHSA-mh99-v99m-4gvg),
  DoS via unbounded expansion) pulled in transitively through the
  `vite-plugin-pwa` build chain. Pinned `brace-expansion` to `5.0.8` via an
  npm `overrides` entry and refreshed `postcss` and `fast-uri` to their
  patched releases. `npm audit` now reports 0 vulnerabilities. All fixes are
  build-time dev dependencies; `vite-plugin-pwa` was kept at 1.3.0 rather than
  taking the `npm audit fix --force` downgrade, and the production build is
  unchanged.

## [1.0.0] - 2026-07-27

### Changed

- Rebalanced the word-picking difficulty in `src/utils/shuffle.ts` so the
  difficulty slider behaves consistently and applies non-linearly:
  - The slider is now read as a **percentile** into the hardness-ranked
    dictionary rather than compared against a raw hardness score. Word hardness
    is heavily clustered (the dictionary has almost no genuinely easy words and
    a long hard tail), so the old linear comparison left roughly the bottom 40%
    of the slider doing nothing; equal slider moves now shift difficulty by
    roughly equal amounts across the whole range.
  - Word **length** now contributes on a logarithmic curve, so 4 → 8 letters
    matters far more than 12 → 16, instead of every extra character counting
    equally.
  - The sampling weight now falls off **exponentially** (log-linear) around the
    target difficulty, replacing the spiky `1/distance` reciprocal, with a
    single `DIFFICULTY_BANDWIDTH` knob controlling the spread.

[1.6.36]: https://github.com/kix/hat/releases/tag/v1.6.36
[1.6.35]: https://github.com/kix/hat/releases/tag/v1.6.35
[1.6.34]: https://github.com/kix/hat/releases/tag/v1.6.34
[1.6.33]: https://github.com/kix/hat/releases/tag/v1.6.33
[1.6.32]: https://github.com/kix/hat/releases/tag/v1.6.32
[1.6.31]: https://github.com/kix/hat/releases/tag/v1.6.31
[1.6.30]: https://github.com/kix/hat/releases/tag/v1.6.30
[1.6.29]: https://github.com/kix/hat/releases/tag/v1.6.29
[1.6.28]: https://github.com/kix/hat/releases/tag/v1.6.28
[1.6.27]: https://github.com/kix/hat/releases/tag/v1.6.27
[1.6.26]: https://github.com/kix/hat/releases/tag/v1.6.26
[1.6.25]: https://github.com/kix/hat/releases/tag/v1.6.25
[1.6.24]: https://github.com/kix/hat/releases/tag/v1.6.24
[1.6.23]: https://github.com/kix/hat/releases/tag/v1.6.23
[1.6.22]: https://github.com/kix/hat/releases/tag/v1.6.22
[1.6.21]: https://github.com/kix/hat/releases/tag/v1.6.21
[1.6.20]: https://github.com/kix/hat/releases/tag/v1.6.20
[1.6.17]: https://github.com/kix/hat/releases/tag/v1.6.17
[1.6.16]: https://github.com/kix/hat/releases/tag/v1.6.16
[1.6.15]: https://github.com/kix/hat/releases/tag/v1.6.15
[1.6.14]: https://github.com/kix/hat/releases/tag/v1.6.14
[1.6.13]: https://github.com/kix/hat/releases/tag/v1.6.13
[1.6.12]: https://github.com/kix/hat/releases/tag/v1.6.12
[1.6.11]: https://github.com/kix/hat/releases/tag/v1.6.11
[1.6.10]: https://github.com/kix/hat/releases/tag/v1.6.10
[1.6.9]: https://github.com/kix/hat/releases/tag/v1.6.9
[1.6.8]: https://github.com/kix/hat/releases/tag/v1.6.8
[1.6.7]: https://github.com/kix/hat/releases/tag/v1.6.7
[1.6.5]: https://github.com/kix/hat/releases/tag/v1.6.5
[1.6.4]: https://github.com/kix/hat/releases/tag/v1.6.4
[1.6.3]: https://github.com/kix/hat/releases/tag/v1.6.3
[1.6.2]: https://github.com/kix/hat/releases/tag/v1.6.2
[1.6.1]: https://github.com/kix/hat/releases/tag/v1.6.1
[1.6.0]: https://github.com/kix/hat/releases/tag/v1.6.0
[1.5.1]: https://github.com/kix/hat/releases/tag/v1.5.1
[1.5.0]: https://github.com/kix/hat/releases/tag/v1.5.0
[1.4.1]: https://github.com/kix/hat/releases/tag/v1.4.1
[1.4.0]: https://github.com/kix/hat/releases/tag/v1.4.0
[1.3.0]: https://github.com/kix/hat/releases/tag/v1.3.0
[1.2.0]: https://github.com/kix/hat/releases/tag/v1.2.0
[1.1.1]: https://github.com/kix/hat/releases/tag/v1.1.1
[1.1.0]: https://github.com/kix/hat/releases/tag/v1.1.0
[1.0.1]: https://github.com/kix/hat/releases/tag/v1.0.1
[1.0.0]: https://github.com/kix/hat/releases/tag/v1.0.0
