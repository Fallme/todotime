import assert from 'node:assert/strict';
import test from 'node:test';
import { getProfileId, isValidSyncCode, normalizeSyncCode, profileStorageKey } from '../src/utils/syncIdentity.ts';

test('different sync codes use different local storage namespaces', () => {
  const first = getProfileId('TT-PERSON-AAAAA');
  const second = getProfileId('TT-PERSON-BBBBB');
  assert.notEqual(profileStorageKey('todotime_todos', first), profileStorageKey('todotime_todos', second));
  assert.notEqual(profileStorageKey('todotime_history_cache', first), profileStorageKey('todotime_history_cache', second));
});

test('sync code input is normalized and validated before use', () => {
  assert.equal(normalizeSyncCode('  tt-abcde-23456  '), 'TT-ABCDE-23456');
  assert.equal(isValidSyncCode('TT-ABCDE-23456'), true);
  assert.equal(isValidSyncCode('short'), false);
  assert.equal(isValidSyncCode('TT-INVALID-中文'), false);
});
