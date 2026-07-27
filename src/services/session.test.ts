import { describe, expect, it } from 'vitest';
import { MemorySessionStore } from './session.js';
describe('MemorySessionStore', () => {
  it('creates, updates, expires and cleans sessions', () => {
    const store = new MemorySessionStore(5);
    const session = store.create({
      userId: 'user',
      channelId: 'channel',
      recommendedChampionIds: [],
    });
    expect(store.get(session.id)?.userId).toBe('user');
    expect(store.update(session.id, { selectedPosition: '미드' })?.selectedPosition).toBe('미드');
    expect(store.cleanup(session.expiresAt + 1)).toBe(1);
    expect(store.get(session.id)).toBeNull();
  });
});
