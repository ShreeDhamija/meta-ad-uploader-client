import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sortLinks, sortTemplates, validTemplateLinkPairs, templateForLink } from './templateLinkUtils.js';

test('alphabetical template ordering is case-insensitive and includes the default in A–Z order', () => {
  const templates = { Zebra: {}, 'alpha 10': {}, 'Alpha 2': {}, Beta: {} };
  assert.deepEqual(sortTemplates(templates, 'alphabetical', 'Zebra').map(([name]) => name), ['Alpha 2', 'alpha 10', 'Beta', 'Zebra']);
  assert.deepEqual(Object.keys(templates), ['Zebra', 'alpha 10', 'Alpha 2', 'Beta']);
});

test('creation and usage template sorts are identical for both consumers', () => {
  const templates = { New: { usageCount: 2 }, Default: {}, Old: { usageCount: 8 } };
  assert.deepEqual(sortTemplates(templates, 'default', 'Default').map(([name]) => name), ['Default', 'New', 'Old']);
  assert.deepEqual(sortTemplates(templates, 'oldest', 'Default').map(([name]) => name), ['Default', 'Old', 'New']);
  assert.deepEqual(sortTemplates(templates, 'most_used', 'Default').map(([name]) => name), ['Default', 'Old', 'New']);
});

test('link sorting uses title, falls back to URL, and preserves legacy creation order', () => {
  const links = [{ url: 'https://z.example', title: 'Alpha' }, { url: 'https://b.example', title: '   ' }, { url: 'https://a.example' }];
  assert.deepEqual(sortLinks(links, 'alphabetical').map(link => link.url), ['https://z.example', 'https://a.example', 'https://b.example']);
  assert.deepEqual(sortLinks(links), links);
  assert.deepEqual(sortLinks(links, 'newest'), [...links].reverse());
  assert.equal(links[0].title, 'Alpha');
});

test('stale and duplicate pairings are ignored; shared links remain valid', () => {
  const templates = { Alpha: {}, Beta: {} };
  const links = [{ url: 'https://one.example' }, { url: 'https://two.example' }];
  const pairs = validTemplateLinkPairs({ enabled: true, pairs: [
    { templateName: 'Deleted', url: links[0].url },
    { templateName: 'Alpha', url: 'https://deleted.example' },
    { templateName: 'Alpha', url: links[0].url },
    { templateName: 'Alpha', url: links[1].url },
    { templateName: 'Beta', url: links[0].url },
    { templateName: 'toString', url: links[0].url },
  ] }, templates, links);
  assert.deepEqual(pairs, [{ templateName: 'Alpha', url: links[0].url }, { templateName: 'Beta', url: links[0].url }]);
  assert.deepEqual(validTemplateLinkPairs(undefined, templates, links), []);
});

test('shared links preserve the matching current template or choose A–Z deterministically', () => {
  const pairs = [{ templateName: 'Zebra', url: 'shared' }, { templateName: 'Alpha', url: 'shared' }, { templateName: 'Other', url: 'other' }];
  assert.equal(templateForLink(pairs, 'shared', 'Zebra'), 'Zebra');
  assert.equal(templateForLink(pairs, 'shared', 'Other'), 'Alpha');
  assert.equal(templateForLink([...pairs].reverse(), 'shared', undefined), 'Alpha');
  assert.equal(templateForLink(pairs, 'custom URL', 'Other'), undefined);
  assert.equal(templateForLink([], 'shared', 'Other'), undefined);
});

test('dated links sort by creation time, with undated legacy links retaining their original order', () => {
  const links = [{ url: 'legacy one' }, { url: 'new', createdAt: '2026-09-21T00:00:00Z' }, { url: 'legacy two' }, { url: 'older', createdAt: '2026-08-01T00:00:00Z' }];
  assert.deepEqual(sortLinks(links, 'created').map(link => link.url), ['legacy one', 'legacy two', 'older', 'new']);
  assert.deepEqual(sortLinks(links, 'newest').map(link => link.url), ['new', 'older', 'legacy two', 'legacy one']);
});
