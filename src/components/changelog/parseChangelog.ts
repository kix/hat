export interface ChangelogItem {
  title?: string;
  description: string;
  subItems?: string[];
}

export interface ChangelogSection {
  type: string;
  items: ChangelogItem[];
}

export interface ChangelogRelease {
  version: string;
  date?: string;
  githubUrl?: string;
  sections: ChangelogSection[];
}

/**
 * Parses Keep-a-Changelog formatted Markdown into structured Release objects.
 */
export function parseChangelog(markdown: string): ChangelogRelease[] {
  const releases: ChangelogRelease[] = [];
  const lines = markdown.split(/\r?\n/);

  // 1. Collect reference URLs: [1.6.29]: https://...
  const linkRefs: Record<string, string> = {};
  const linkRefRegex = /^\s*\[([^\]]+)\]:\s*(https?:\/\/\S+)/;

  for (const line of lines) {
    const match = line.match(linkRefRegex);
    if (match) {
      linkRefs[match[1]] = match[2];
    }
  }

  let currentRelease: ChangelogRelease | null = null;
  let currentSection: ChangelogSection | null = null;
  let currentItem: ChangelogItem | null = null;

  const versionHeaderRegex = /^##\s+\[?([^\]\s]+)\]?(?:\s+-\s+(\d{4}-\d{2}-\d{2}))?/;
  const sectionHeaderRegex = /^###\s+(.+)$/;
  const topBulletRegex = /^[-*+]\s+(.+)$/;
  const subBulletRegex = /^\s{2,4}[-*+]\s+(.+)$/;

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip release link definitions at the bottom
    if (linkRefRegex.test(line)) {
      continue;
    }

    // Release header: ## [1.6.31] - 2026-09-10
    const versionMatch = line.match(versionHeaderRegex);
    if (versionMatch) {
      const version = versionMatch[1];
      const date = versionMatch[2];
      const githubUrl = linkRefs[version] || linkRefs[`v${version}`];

      currentRelease = {
        version,
        date,
        githubUrl,
        sections: [],
      };
      releases.push(currentRelease);
      currentSection = null;
      currentItem = null;
      continue;
    }

    if (!currentRelease) {
      continue;
    }

    // Section header: ### Added
    const sectionMatch = line.match(sectionHeaderRegex);
    if (sectionMatch) {
      const type = sectionMatch[1].trim();
      currentSection = {
        type,
        items: [],
      };
      currentRelease.sections.push(currentSection);
      currentItem = null;
      continue;
    }

    if (!currentSection) {
      continue;
    }

    // Sub-bullet:   - Sub-item text
    const subMatch = line.match(subBulletRegex);
    if (subMatch) {
      const subText = subMatch[1].trim();
      if (currentItem) {
        if (!currentItem.subItems) {
          currentItem.subItems = [];
        }
        currentItem.subItems.push(subText);
      } else {
        // Standalone sub-bullet treated as a regular item
        currentItem = { description: subText };
        currentSection.items.push(currentItem);
      }
      continue;
    }

    // Top-level bullet: - Item text
    const topMatch = line.match(topBulletRegex);
    if (topMatch) {
      const itemRaw = topMatch[1].trim();
      currentItem = parseItemText(itemRaw);
      currentSection.items.push(currentItem);
      continue;
    }

    // Continuation line
    if (trimmed && currentItem) {
      if (currentItem.subItems && currentItem.subItems.length > 0) {
        const lastIdx = currentItem.subItems.length - 1;
        currentItem.subItems[lastIdx] += ` ${trimmed}`;
      } else {
        currentItem.description += (currentItem.description ? ` ${trimmed}` : trimmed);
      }
    }
  }

  return releases;
}

/**
 * Extracts optional bold title if the item starts with `**Title:** Description` or `**Title.** Description`
 */
function parseItemText(raw: string): ChangelogItem {
  const boldPrefixMatch = raw.match(/^\*\*([^*]+)\*\*[:.]?\s*(.*)$/);
  if (boldPrefixMatch) {
    const title = boldPrefixMatch[1].replace(/[:.]+$/, '').trim();
    const description = boldPrefixMatch[2]?.trim() || '';
    return {
      title,
      description,
    };
  }
  return {
    description: raw,
  };
}
