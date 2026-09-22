import type { History, Settings, Team } from '../../machine/hatMachine';
import { getFastestGuess, getSlowestGuess, getStolenWords, sortTeamsByScore, getIndividualLeaderboard } from '../stats';
import { getTeamScore } from '../scoring';

export interface RenderCardOptions {
  teams: Team[];
  history: History;
  settings: Settings;
  format: 'stories' | 'post'; // stories = 1080x1920, post = 1080x1350
  lang?: 'ru' | 'en';
  date?: string;
}

const FONT_FAMILY = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number | number[],
  fill?: string | CanvasGradient,
  stroke?: string,
  lineWidth = 1,
) {
  ctx.save();
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, radius);
  } else {
    // Fallback for environments where roundRect is not defined
    const r = typeof radius === 'number' ? radius : radius[0] || 0;
    ctx.rect(x, y, w, h);
    if (r > 0) {
      // standard rect
    }
  }
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
  ctx.restore();
}

function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  initialFontSize: number,
  minFontSize: number = 14,
  fontWeight: string = 'bold',
): number {
  let size = initialFontSize;
  ctx.font = `${fontWeight} ${size}px ${FONT_FAMILY}`;
  while (ctx.measureText(text).width > maxWidth && size > minFontSize) {
    size -= 1;
    ctx.font = `${fontWeight} ${size}px ${FONT_FAMILY}`;
  }
  return size;
}

export function renderResultCard(canvas: HTMLCanvasElement, options: RenderCardOptions): void {
  const { teams, history, settings, format, lang = 'ru' } = options;
  const isStories = format === 'stories';
  const width = 1080;
  const height = isStories ? 1920 : 1350;

  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const isEn = lang === 'en';
  const isPairs = settings.gameMode === 'pairs';
  const sortedTeams = sortTeamsByScore(teams, history);
  const totalGuessed = history.filter((r) => r.result === 'guessed').length;
  const fastestGuess = getFastestGuess(teams, history);
  const slowestGuess = getSlowestGuess(teams, history);
  const stolenWords = getStolenWords(teams, history);

  // Find best guesser/MVP
  const playerGuessedCounts = new Map<string, { name: string; count: number; teamName: string }>();
  teams.forEach((t) => {
    t.players.forEach((p) => {
      const count = history.filter((r) => r.result === 'guessed' && r.guesserId === p.id).length;
      playerGuessedCounts.set(p.id, { name: p.name, count, teamName: t.name });
    });
  });
  const bestGuesser = Array.from(playerGuessedCounts.values()).sort((a, b) => b.count - a.count)[0];

  // 1. Background (Dark space gradient)
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#0b0d17');
  bgGrad.addColorStop(0.5, '#121629');
  bgGrad.addColorStop(1, '#080a10');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Ambient glow orbs
  const drawGlow = (x: number, y: number, r: number, color: string) => {
    const glow = ctx.createRadialGradient(x, y, 0, x, y, r);
    glow.addColorStop(0, color);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  };

  drawGlow(200, 250, 450, 'rgba(99, 102, 241, 0.18)'); // Violet orb top-left
  drawGlow(880, 400, 400, 'rgba(236, 72, 153, 0.14)'); // Pink orb top-right
  drawGlow(540, 1000, 550, 'rgba(245, 158, 11, 0.10)'); // Amber center glow

  // Top glowing gradient accent bar
  const topBarGrad = ctx.createLinearGradient(0, 0, width, 0);
  topBarGrad.addColorStop(0, '#ec4899');
  topBarGrad.addColorStop(0.5, '#8b5cf6');
  topBarGrad.addColorStop(1, '#f59e0b');
  ctx.fillStyle = topBarGrad;
  ctx.fillRect(0, 0, width, 8);

  // 2. Header Section
  const topY = isStories ? 120 : 65;

  // App Logo / Brand
  ctx.textAlign = 'center';
  ctx.font = `900 38px ${FONT_FAMILY}`;
  ctx.fillStyle = '#f8fafc';
  ctx.fillText('🎩  Ш Л Я П А', width / 2, topY);

  // Subtitle Pill
  const pillY = topY + 45;
  roundRect(ctx, width / 2 - 140, pillY, 280, 42, 21, 'rgba(245, 158, 11, 0.15)', '#f59e0b', 1.5);
  ctx.font = `800 20px ${FONT_FAMILY}`;
  ctx.fillStyle = '#fbbf24';
  ctx.fillText(isEn ? '🏆  GAME RESULTS' : '🏆  ИТОГИ ИГРЫ', width / 2, pillY + 28);

  // Metadata line (Date & Game Mode & Words)
  const isIndividual = settings.gameMode === 'individual';
  const metaY = pillY + 75;
  const dateStr = options.date || new Date().toLocaleDateString(isEn ? 'en-US' : 'ru-RU', { day: 'numeric', month: 'long' });
  const modeStr = isPairs
    ? (isEn ? 'Pairs' : 'Пары')
    : isIndividual
    ? (isEn ? 'Individual' : 'Личный зачёт')
    : (isEn ? 'Teams' : 'Команды');
  const wordsStr = isEn ? `${totalGuessed} words` : `${totalGuessed} слов`;
  
  ctx.font = `600 20px ${FONT_FAMILY}`;
  ctx.fillStyle = '#94a3b8';
  ctx.fillText(`${dateStr}  •  ${modeStr}  •  ${wordsStr}`, width / 2, metaY);

  // 3. Podium Section
  const podiumTopY = isStories ? 400 : 280;
  const podiumHeight = isStories ? 600 : 440;
  const podiumBaseY = podiumTopY + podiumHeight;

  // Stand parameters
  const standWidth = 280;
  const marginX = 40;

  const individualLeaderboard = isIndividual
    ? getIndividualLeaderboard(
        Array.from(new Map(teams.flatMap((t) => t.players).map((p) => [p.id, p])).values()),
        history,
      )
    : [];

  const team1 = isIndividual ? undefined : sortedTeams[0];
  const team2 = isIndividual ? undefined : sortedTeams[1];
  const team3 = isIndividual ? undefined : sortedTeams[2];

  const name1 = isIndividual ? individualLeaderboard[0]?.player.name : team1?.name;
  const name2 = isIndividual ? individualLeaderboard[1]?.player.name : team2?.name;
  const name3 = isIndividual ? individualLeaderboard[2]?.player.name : team3?.name;

  const sub1 = isIndividual
    ? (isEn
        ? `${individualLeaderboard[0]?.guessed ?? 0}g · ${individualLeaderboard[0]?.explained ?? 0}e`
        : `уг: ${individualLeaderboard[0]?.guessed ?? 0} · об: ${individualLeaderboard[0]?.explained ?? 0}`)
    : team1?.players.map((p) => p.name).join(' & ');

  const sub2 = isIndividual
    ? (isEn
        ? `${individualLeaderboard[1]?.guessed ?? 0}g · ${individualLeaderboard[1]?.explained ?? 0}e`
        : `уг: ${individualLeaderboard[1]?.guessed ?? 0} · об: ${individualLeaderboard[1]?.explained ?? 0}`)
    : team2?.players.map((p) => p.name).join(' & ');

  const sub3 = isIndividual
    ? (isEn
        ? `${individualLeaderboard[2]?.guessed ?? 0}g · ${individualLeaderboard[2]?.explained ?? 0}e`
        : `уг: ${individualLeaderboard[2]?.guessed ?? 0} · об: ${individualLeaderboard[2]?.explained ?? 0}`)
    : team3?.players.map((p) => p.name).join(' & ');

  const score1 = isIndividual
    ? individualLeaderboard[0]?.score ?? 0
    : team1
    ? getTeamScore(history, team1.id)
    : 0;
  const score2 = isIndividual
    ? individualLeaderboard[1]?.score ?? 0
    : team2
    ? getTeamScore(history, team2.id)
    : 0;
  const score3 = isIndividual
    ? individualLeaderboard[2]?.score ?? 0
    : team3
    ? getTeamScore(history, team3.id)
    : 0;

  const h1 = isStories ? 320 : 230;
  const h2 = isStories ? 230 : 160;
  const h3 = isStories ? 160 : 110;

  const xCenter = width / 2;
  const xLeft = xCenter - standWidth - marginX;
  const xRight = xCenter + standWidth + marginX;

  const drawPodiumStand = (
    rank: 1 | 2 | 3,
    title: string | undefined,
    subtitle: string | undefined,
    score: number,
    x: number,
    h: number,
  ) => {
    if (!title) return;

    const y = podiumBaseY - h;
    const cardY = y - (isStories ? 165 : 135);

    // Pillar colors
    let pGrad: CanvasGradient;
    let borderColor = 'rgba(255,255,255,0.2)';
    let medalEmoji = '🥇';
    let numberColor = 'rgba(255,255,255,0.3)';

    if (rank === 1) {
      pGrad = ctx.createLinearGradient(x, y, x, podiumBaseY);
      pGrad.addColorStop(0, 'rgba(245, 158, 11, 0.35)');
      pGrad.addColorStop(1, 'rgba(217, 119, 6, 0.15)');
      borderColor = '#f59e0b';
      medalEmoji = '🥇';
      numberColor = '#fbbf24';
    } else if (rank === 2) {
      pGrad = ctx.createLinearGradient(x, y, x, podiumBaseY);
      pGrad.addColorStop(0, 'rgba(148, 163, 184, 0.30)');
      pGrad.addColorStop(1, 'rgba(71, 85, 105, 0.12)');
      borderColor = '#94a3b8';
      medalEmoji = '🥈';
      numberColor = '#cbd5e1';
    } else {
      pGrad = ctx.createLinearGradient(x, y, x, podiumBaseY);
      pGrad.addColorStop(0, 'rgba(217, 119, 6, 0.25)');
      pGrad.addColorStop(1, 'rgba(120, 53, 15, 0.10)');
      borderColor = '#d97706';
      medalEmoji = '🥉';
      numberColor = '#f97316';
    }

    // Pedestal pillar
    roundRect(
      ctx,
      x - standWidth / 2,
      y,
      standWidth,
      h,
      [16, 16, 0, 0],
      pGrad,
      borderColor,
      2,
    );

    // Large rank number inside pedestal
    ctx.textAlign = 'center';
    ctx.font = `900 ${isStories ? 72 : 54}px ${FONT_FAMILY}`;
    ctx.fillStyle = numberColor;
    ctx.fillText(`${rank}`, x, y + (isStories ? 85 : 65));

    // Floating Team/Player Card above pedestal
    const cardH = isStories ? 150 : 125;
    roundRect(
      ctx,
      x - standWidth / 2,
      cardY,
      standWidth,
      cardH,
      16,
      'rgba(30, 41, 59, 0.85)',
      rank === 1 ? '#f59e0b' : 'rgba(255, 255, 255, 0.15)',
      rank === 1 ? 2 : 1,
    );

    // Crown for #1
    if (rank === 1) {
      ctx.font = `40px ${FONT_FAMILY}`;
      ctx.fillText('👑', x, cardY - 12);
    }

    // Medal Icon badge
    ctx.font = `28px ${FONT_FAMILY}`;
    ctx.fillText(medalEmoji, x, cardY + 34);

    // Main name
    const nameFontSize = fitText(ctx, title, standWidth - 30, isStories ? 22 : 19, 14, 'bold');
    ctx.font = `bold ${nameFontSize}px ${FONT_FAMILY}`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(title, x, cardY + (isStories ? 68 : 62));

    // Subtitle
    if (subtitle) {
      const playerFontSize = fitText(ctx, subtitle, standWidth - 30, isStories ? 16 : 14, 11, 'normal');
      ctx.font = `normal ${playerFontSize}px ${FONT_FAMILY}`;
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(subtitle, x, cardY + (isStories ? 94 : 86));
    }

    // Score Pill
    const ptsLabel = isEn ? 'pts' : 'очков';
    const scorePillW = 120;
    const scorePillH = 30;
    const scorePillY = cardY + (isStories ? 108 : 98);
    roundRect(
      ctx,
      x - scorePillW / 2,
      scorePillY,
      scorePillW,
      scorePillH,
      15,
      rank === 1 ? 'rgba(245, 158, 11, 0.25)' : 'rgba(255, 255, 255, 0.10)',
      rank === 1 ? '#f59e0b' : 'rgba(255, 255, 255, 0.2)',
      1,
    );
    ctx.font = `800 16px ${FONT_FAMILY}`;
    ctx.fillStyle = rank === 1 ? '#fbbf24' : '#f8fafc';
    ctx.fillText(`${score} ${ptsLabel}`, x, scorePillY + 20);
  };

  // Render Podium in visual order: 2nd, 1st, 3rd
  const totalEntries = isIndividual ? individualLeaderboard.length : teams.length;
  if (totalEntries >= 3) {
    drawPodiumStand(2, name2, sub2, score2, xLeft, h2);
    drawPodiumStand(1, name1, sub1, score1, xCenter, h1);
    drawPodiumStand(3, name3, sub3, score3, xRight, h3);
  } else if (totalEntries === 2) {
    const spacing = 180;
    drawPodiumStand(1, name1, sub1, score1, xCenter - spacing, h1);
    drawPodiumStand(2, name2, sub2, score2, xCenter + spacing, h2);
  } else if (totalEntries === 1) {
    drawPodiumStand(1, name1, sub1, score1, xCenter, h1);
  }

  // 4. Remaining Teams/Players List (if 4+ entries)
  let nominationsTopY = podiumBaseY + (isStories ? 40 : 25);
  if (totalEntries > 3) {
    const restRowW = 860;
    const restRowH = 46;
    const restStartX = (width - restRowW) / 2;

    if (isIndividual) {
      const restIndiv = individualLeaderboard.slice(3, 5);
      restIndiv.forEach((item, idx) => {
        const rank = idx + 4;
        const rowY = podiumBaseY + 15 + idx * 52;
        roundRect(
          ctx,
          restStartX,
          rowY,
          restRowW,
          restRowH,
          12,
          'rgba(255, 255, 255, 0.04)',
          'rgba(255, 255, 255, 0.08)',
          1,
        );

        ctx.textAlign = 'left';
        ctx.font = `bold 18px ${FONT_FAMILY}`;
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(`${rank}.`, restStartX + 20, rowY + 29);

        ctx.fillStyle = '#e2e8f0';
        ctx.fillText(item.player.name, restStartX + 55, rowY + 29);

        const subInfo = isEn ? `${item.guessed}g · ${item.explained}e` : `уг: ${item.guessed} · об: ${item.explained}`;
        ctx.font = `normal 15px ${FONT_FAMILY}`;
        ctx.fillStyle = '#64748b';
        ctx.fillText(`(${subInfo})`, restStartX + 220, rowY + 29);

        ctx.textAlign = 'right';
        ctx.font = `bold 17px ${FONT_FAMILY}`;
        ctx.fillStyle = '#cbd5e1';
        ctx.fillText(`${item.score} ${isEn ? 'pts' : 'очков'}`, restStartX + restRowW - 20, rowY + 29);
      });
      nominationsTopY = podiumBaseY + 20 + restIndiv.length * 52 + (isStories ? 35 : 20);
    } else {
      const restTeams = sortedTeams.slice(3, 5); // display 4th and 5th
      restTeams.forEach((t, idx) => {
        const rank = idx + 4;
        const tScore = getTeamScore(history, t.id);
        const rowY = podiumBaseY + 15 + idx * 52;
        roundRect(
          ctx,
          restStartX,
          rowY,
          restRowW,
          restRowH,
          12,
          'rgba(255, 255, 255, 0.04)',
          'rgba(255, 255, 255, 0.08)',
          1,
        );

        ctx.textAlign = 'left';
        ctx.font = `bold 18px ${FONT_FAMILY}`;
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(`${rank}.`, restStartX + 20, rowY + 29);

        ctx.fillStyle = '#e2e8f0';
        ctx.fillText(t.name, restStartX + 55, rowY + 29);

        const pNames = t.players.map((p) => p.name).join(', ');
        ctx.font = `normal 15px ${FONT_FAMILY}`;
        ctx.fillStyle = '#64748b';
        ctx.fillText(`(${pNames})`, restStartX + 220, rowY + 29);

        ctx.textAlign = 'right';
        ctx.font = `bold 17px ${FONT_FAMILY}`;
        ctx.fillStyle = '#cbd5e1';
        ctx.fillText(`${tScore} ${isEn ? 'pts' : 'очков'}`, restStartX + restRowW - 20, rowY + 29);
      });
      nominationsTopY = podiumBaseY + 20 + restTeams.length * 52 + (isStories ? 35 : 20);
    }
  }

  // 5. MVP Nominations & Highlights Section
  const nomBoxW = 920;
  const nomBoxX = (width - nomBoxW) / 2;
  const nominationsHeight = isStories ? 380 : 260;

  roundRect(
    ctx,
    nomBoxX,
    nominationsTopY,
    nomBoxW,
    nominationsHeight,
    20,
    'rgba(15, 23, 42, 0.70)',
    'rgba(99, 102, 241, 0.35)',
    1.5,
  );

  // Section header
  ctx.textAlign = 'center';
  ctx.font = `800 20px ${FONT_FAMILY}`;
  ctx.fillStyle = '#a5b4fc';
  ctx.fillText(
    isEn ? '🌟  MVP NOMINATIONS & HIGHLIGHTS' : '🌟  НОМИНАЦИИ & РЕКОРДЫ МАТЧА',
    width / 2,
    nominationsTopY + 38,
  );

  // Nomination Cards
  const cardsStartY = nominationsTopY + 58;
  const cardGap = 20;
  const numCards = 3;
  const singleCardW = (nomBoxW - 40 - (numCards - 1) * cardGap) / numCards;
  const singleCardH = isStories ? 280 : 180;

  const nominationsList = [
    {
      icon: '⚡',
      title: isEn ? 'Lightning' : 'Молния',
      subtitle: isEn ? 'Fastest Guess' : 'Быстрый ответ',
      player: fastestGuess ? fastestGuess.playerName : '—',
      detail: fastestGuess ? `«${fastestGuess.word}» • ${(fastestGuess.timeMs / 1000).toFixed(1)} ${isEn ? 's' : 'сек'}` : '—',
      accent: '#38bdf8',
    },
    {
      icon: '🧠',
      title: isEn ? 'Erudite' : 'Эрудит',
      subtitle: isEn ? 'Top Guesser' : 'Главный эрудит',
      player: bestGuesser ? bestGuesser.name : '—',
      detail: bestGuesser ? `${bestGuesser.count} ${isEn ? 'words' : 'слов'}` : '—',
      accent: '#fbbf24',
    },
    stolenWords.length > 0
      ? {
          icon: '🦹',
          title: isEn ? 'Robber' : 'Грабитель',
          subtitle: isEn ? 'Stolen Words' : 'Перехват слов',
          player: stolenWords[0].thiefPlayerName,
          detail: `«${stolenWords[0].word}»`,
          accent: '#ec4899',
        }
      : {
          icon: '🐢',
          title: isEn ? 'Steeled Nerves' : 'Железные нервы',
          subtitle: isEn ? 'Last-second Guess' : 'Ответ на флажке',
          player: slowestGuess ? slowestGuess.playerName : '—',
          detail: slowestGuess ? `«${slowestGuess.word}» • ${(slowestGuess.timeMs / 1000).toFixed(1)} ${isEn ? 's' : 'сек'}` : '—',
          accent: '#a78bfa',
        },
  ];

  nominationsList.forEach((nom, i) => {
    const cX = nomBoxX + 20 + i * (singleCardW + cardGap);
    const cY = cardsStartY;

    roundRect(
      ctx,
      cX,
      cY,
      singleCardW,
      singleCardH,
      14,
      'rgba(30, 41, 59, 0.60)',
      'rgba(255, 255, 255, 0.10)',
      1,
    );

    // Accent line at top of card
    roundRect(ctx, cX + 15, cY + 1, singleCardW - 30, 3, 2, nom.accent);

    ctx.textAlign = 'center';
    const cardCenterX = cX + singleCardW / 2;

    // Icon
    ctx.font = `${isStories ? 38 : 30}px ${FONT_FAMILY}`;
    ctx.fillText(nom.icon, cardCenterX, cY + (isStories ? 48 : 38));

    // Title
    ctx.font = `800 ${isStories ? 19 : 16}px ${FONT_FAMILY}`;
    ctx.fillStyle = nom.accent;
    ctx.fillText(nom.title, cardCenterX, cY + (isStories ? 82 : 64));

    // Subtitle
    ctx.font = `500 ${isStories ? 14 : 12}px ${FONT_FAMILY}`;
    ctx.fillStyle = '#64748b';
    ctx.fillText(nom.subtitle, cardCenterX, cY + (isStories ? 104 : 82));

    // Player Name
    const pSize = fitText(ctx, nom.player, singleCardW - 20, isStories ? 20 : 17, 12, 'bold');
    ctx.font = `bold ${pSize}px ${FONT_FAMILY}`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(nom.player, cardCenterX, cY + (isStories ? 160 : 120));

    // Detail (word & time / count)
    const dSize = fitText(ctx, nom.detail, singleCardW - 20, isStories ? 16 : 13, 11, 'normal');
    ctx.font = `normal ${dSize}px ${FONT_FAMILY}`;
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(nom.detail, cardCenterX, cY + (isStories ? 192 : 144));
  });

  // 6. Footer Section
  const footerY = height - (isStories ? 70 : 40);
  ctx.textAlign = 'center';
  ctx.font = `600 19px ${FONT_FAMILY}`;
  ctx.fillStyle = '#64748b';
  ctx.fillText(
    isEn ? 'Played in The Hat 🎩  •  thehat.app' : 'Сыграно в игре Шляпа 🎩  •  thehat.app',
    width / 2,
    footerY,
  );
}

/**
 * Renders the result card and converts it to a PNG Blob.
 */
export async function generateResultCardBlob(options: RenderCardOptions): Promise<Blob> {
  const canvas = document.createElement('canvas');
  renderResultCard(canvas, options);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Failed to create canvas blob'));
      }
    }, 'image/png');
  });
}

/**
 * Triggers a download of the result card image.
 */
export async function downloadResultCard(options: RenderCardOptions, filename = 'the-hat-results.png'): Promise<void> {
  const blob = await generateResultCardBlob(options);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
