import { describe, it, expect } from 'vitest';
import { parseChangelog } from './parseChangelog';
import changelogContent from '../../../CHANGELOG.md?raw';

describe('parseChangelog', () => {
  it('parses sample keep-a-changelog markdown', () => {
    const sample = `
# Changelog

All notable changes.

## [1.2.0] - 2026-08-01

### Added

- **New feature:** Added cool stuff.
  - Sub detail 1
  - Sub detail 2
- Simple feature without title.

### Fixed

- **Bug fix:** Fixed annoying crash.

## [1.1.0] - 2026-07-20

### Changed

- Updated dependencies.

[1.2.0]: https://github.com/kix/hat/releases/tag/v1.2.0
[1.1.0]: https://github.com/kix/hat/releases/tag/v1.1.0
`;

    const releases = parseChangelog(sample);

    expect(releases).toHaveLength(2);

    expect(releases[0].version).toBe('1.2.0');
    expect(releases[0].date).toBe('2026-08-01');
    expect(releases[0].githubUrl).toBe('https://github.com/kix/hat/releases/tag/v1.2.0');
    expect(releases[0].sections).toHaveLength(2);

    const added = releases[0].sections[0];
    expect(added.type).toBe('Added');
    expect(added.items).toHaveLength(2);
    expect(added.items[0].title).toBe('New feature');
    expect(added.items[0].description).toBe('Added cool stuff.');
    expect(added.items[0].subItems).toEqual(['Sub detail 1', 'Sub detail 2']);

    expect(added.items[1].title).toBeUndefined();
    expect(added.items[1].description).toBe('Simple feature without title.');

    const fixed = releases[0].sections[1];
    expect(fixed.type).toBe('Fixed');
    expect(fixed.items[0].title).toBe('Bug fix');
    expect(fixed.items[0].description).toBe('Fixed annoying crash.');

    expect(releases[1].version).toBe('1.1.0');
    expect(releases[1].date).toBe('2026-07-20');
    expect(releases[1].githubUrl).toBe('https://github.com/kix/hat/releases/tag/v1.1.0');
    expect(releases[1].sections[0].type).toBe('Changed');
  });

  it('parses the actual CHANGELOG.md file correctly', () => {
    const releases = parseChangelog(changelogContent);

    expect(releases.length).toBeGreaterThan(10);
    expect(releases[0].version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(releases[0].date).toBe('2026-09-10');
    expect(releases[0].sections.length).toBeGreaterThanOrEqual(1);
  });
});
