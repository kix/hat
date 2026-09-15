import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://kioqswvdyarkbqdgtldx.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_bRU1TfqrXFlKZMlGElGAZQ_935fSHrH';
const APP_BASE_URL = process.env.APP_BASE_URL || 'https://kix.github.io/hat/';

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function parseLatestReleaseFromChangelog() {
  const changelogPath = path.join(rootDir, 'CHANGELOG.md');
  const pkgPath = path.join(rootDir, 'package.json');
  
  const changelogContent = fs.readFileSync(changelogPath, 'utf8');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const pkgVersion = pkg.version;

  const lines = changelogContent.split(/\r?\n/);
  let currentVersion = null;
  let currentReleaseDate = null;
  const sections = [];
  let currentSection = null;

  const versionHeaderRegex = /^##\s+\[?([^\]\s]+)\]?(?:\s+-\s+(\d{4}-\d{2}-\d{2}))?/;
  const sectionHeaderRegex = /^###\s+(.+)$/;
  const itemBulletRegex = /^[-*+]\s+(.+)$/;
  const subBulletRegex = /^\s{2,4}[-*+]\s+(.+)$/;

  for (const line of lines) {
    const versionMatch = line.match(versionHeaderRegex);
    if (versionMatch) {
      if (currentVersion === null) {
        currentVersion = versionMatch[1];
        currentReleaseDate = versionMatch[2] || '';
        continue;
      } else {
        // Reached next release header, stop
        break;
      }
    }

    if (currentVersion === null) continue;

    const sectionMatch = line.match(sectionHeaderRegex);
    if (sectionMatch) {
      currentSection = {
        name: sectionMatch[1].trim(),
        items: [],
      };
      sections.push(currentSection);
      continue;
    }

    const subMatch = line.match(subBulletRegex);
    if (subMatch && currentSection && currentSection.items.length > 0) {
      const lastItem = currentSection.items[currentSection.items.length - 1];
      if (!lastItem.subItems) lastItem.subItems = [];
      lastItem.subItems.push(subMatch[1].trim());
      continue;
    }

    const itemMatch = line.match(itemBulletRegex);
    if (itemMatch && currentSection) {
      currentSection.items.push({
        text: itemMatch[1].trim(),
        subItems: [],
      });
      continue;
    }
  }

  return {
    version: currentVersion || pkgVersion,
    date: currentReleaseDate,
    sections,
  };
}

function formatTelegramReleaseMessage(release) {
  let msg = `🎩 <b>Обновление «Шляпы» v${release.version}!</b> 🚀\n\n`;

  for (const section of release.sections) {
    for (const item of section.items) {
      // Check if item has **Title:** body
      const boldMatch = item.text.match(/^\*\*([^*]+)\*\*[:.]?\s*(.*)$/);
      if (boldMatch) {
        const title = boldMatch[1].replace(/[:.]+$/, '').trim();
        const desc = boldMatch[2]?.trim();
        msg += `✨ <b>${escapeHtml(title)}</b>\n`;
        if (desc) {
          msg += `• ${escapeHtml(desc)}\n`;
        }
      } else {
        msg += `• ${escapeHtml(item.text)}\n`;
      }

      if (item.subItems && item.subItems.length > 0) {
        for (const sub of item.subItems) {
          msg += `  ▫️ ${escapeHtml(sub)}\n`;
        }
      }
      msg += '\n';
    }
  }

  msg += `👉 <b>Собрать друзей и играть:</b> ${APP_BASE_URL}`;
  return msg;
}

async function main() {
  console.log('📦 Parsing latest release from CHANGELOG.md...');
  const release = parseLatestReleaseFromChangelog();
  console.log(`Found release: v${release.version} (${release.sections.length} sections)`);

  const formattedMessage = formatTelegramReleaseMessage(release);
  console.log('-----------------------------------------');
  console.log(formattedMessage);
  console.log('-----------------------------------------');
  console.log(`Message length: ${formattedMessage.length} characters`);

  console.log('🚀 Broadcasting release notes to Telegram subscribers via Supabase...');
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/broadcast_release_news`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ p_text: formattedMessage }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error('❌ Error broadcasting release news:', res.status, errorText);
    process.exit(1);
  }

  const data = await res.json();
  console.log('✅ Broadcast result:', data);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
