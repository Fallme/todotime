import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('narrow task cards separate headings metadata and actions into stable rows', async () => {
  const styles = await readFile(new URL('../src/index.css', import.meta.url), 'utf8');
  const item = await readFile(new URL('../src/components/TodoList/TodoItem.tsx', import.meta.url), 'utf8');
  const list = await readFile(new URL('../src/components/TodoList/TodoList.tsx', import.meta.url), 'utf8');

  assert.match(item, /className=\{`todo-card-heading\$\{recurrence !== 'none' \? ' has-recurrence' : ''\}`\}/);
  assert.match(item, /className="todo-card-tags"/);
  const headingStart = item.indexOf('<div className={`todo-card-heading');
  const headingEnd = item.indexOf('</div>', headingStart);
  const recurrenceStart = item.indexOf('<span className="todo-recurrence-tag"');
  const abandonedTagsStart = item.indexOf('<div className="todo-card-tags">');
  const abandonedTagsEnd = item.indexOf('</div>', abandonedTagsStart);
  assert.ok(headingStart >= 0 && headingEnd > headingStart);
  assert.ok(recurrenceStart > headingStart && recurrenceStart < headingEnd);
  assert.doesNotMatch(item.slice(abandonedTagsStart, abandonedTagsEnd), /todo-recurrence-tag/);
  assert.match(item, /const focusText = formatFocusDuration\(totalFocus\)/);
  assert.doesNotMatch(item, /msg\('累计', 'Total'\)/);
  assert.match(list, /className="todo-list-title"/);
  assert.match(styles, /\.todo-card-heading\s*\{[\s\S]*grid-template-columns: auto minmax\(0, 1fr\) auto/);
  assert.match(styles, /\.todo-recurrence-tag\s*\{[\s\S]*justify-self: end/);
  assert.match(styles, /\.todo-recurrence-tag\s*\{[\s\S]*white-space: nowrap/);
  assert.match(styles, /@media \(max-width: 480px\)[\s\S]*grid-template-areas:\s*"status body"\s*"status meta"\s*"\. actions"/);
  assert.match(styles, /@media \(max-width: 480px\)[\s\S]*grid-template-columns: fit-content\(28%\) minmax\(0, 1fr\) fit-content\(36%\)/);
  assert.match(styles, /@media \(max-width: 480px\)[\s\S]*\.todo-card-focus\s*\{ display: none; \}/);
  assert.match(styles, /\.todo-card-meta\s*\{[\s\S]*flex-wrap: wrap/);
  assert.match(styles, /\.todo-card-actions\s*\{[\s\S]*justify-content: flex-end/);
  assert.match(styles, /@media \(max-width: 350px\)[\s\S]*"category category category"\s*"input repeat add"/);
  assert.match(styles, /@media \(max-width: 350px\)[\s\S]*\.todo-card-heading\.has-recurrence\s*\{[\s\S]*"category category"\s*"title recurrence"/);
  assert.match(styles, /@media \(hover: none\)[\s\S]*\.sub-play, \.sub-del\s*\{ opacity: 1; \}/);
});
