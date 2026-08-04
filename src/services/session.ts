import { randomUUID } from 'node:crypto';
import type { RecommendationSession } from '../domain.js';
export interface SessionStore {
  create(
    data: Omit<RecommendationSession, 'id' | 'createdAt' | 'expiresAt'>,
  ): RecommendationSession;
  get(id: string): RecommendationSession | null;
  update(id: string, patch: Partial<RecommendationSession>): RecommendationSession | null;
  delete(id: string): boolean;
  cleanup(now?: number): number;
}
export class MemorySessionStore implements SessionStore {
  private readonly sessions = new Map<string, RecommendationSession>();
  constructor(private readonly ttlMs: number) {}
  create(
    data: Omit<RecommendationSession, 'id' | 'createdAt' | 'expiresAt'>,
  ): RecommendationSession {
    const now = Date.now();
    const session = { ...data, id: randomUUID(), createdAt: now, expiresAt: now + this.ttlMs };
    this.sessions.set(session.id, session);
    return session;
  }
  get(id: string): RecommendationSession | null {
    const session = this.sessions.get(id);
    if (!session) return null;
    if (session.expiresAt > Date.now()) return session;
    this.sessions.delete(id);
    return null;
  }
  update(id: string, patch: Partial<RecommendationSession>): RecommendationSession | null {
    const session = this.get(id);
    if (!session) return null;
    const updated = { ...session, ...patch };
    this.sessions.set(id, updated);
    return updated;
  }
  delete(id: string): boolean {
    return this.sessions.delete(id);
  }
  cleanup(now = Date.now()): number {
    let count = 0;
    for (const [id, session] of this.sessions)
      if (session.expiresAt <= now) {
        this.sessions.delete(id);
        count++;
      }
    return count;
  }
}
