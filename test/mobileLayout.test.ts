import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('narrow task cards separate headings metadata and actions into stable rows', async () => {
  const styles = await readFile(new URL('../src/index.css', import.meta.url), 'utf8');
  const item = await readFile(new URL('../src/components/TodoList/TodoItem.tsx', import.meta.url), 'utf8');
  const list = await readFile(new URL('../src/components/TodoList/TodoList.tsx', import.meta.url), 'utf8');

  assert.match(item, /className="todo-card-heading"/);
  assert.match(item, /className="todo-card-tags"/);
  assert.match(list, /className="todo-list-title"/);
  assert.match(styles, /@media \(max-width: 480px\)[\s\S]*grid-template-areas:\s*"status body"\s*"status meta"\s*"\. actions"/);
  assert.match(styles, /\.todo-card-meta\s*\{[\s\S]*flex-wrap: wrap/);
  assert.match(styles, /\.todo-card-actions\s*\{[\s\S]*justify-content: flex-end/);
  assert.match(styles, /@media \(max-width: 350px\)[\s\S]*"category category category"\s*"input repeat add"/);
  assert.match(styles, /@media \(hover: none\)[\s\S]*\.sub-play, \.sub-del\s*\{ opacity: 1; \}/);
});
