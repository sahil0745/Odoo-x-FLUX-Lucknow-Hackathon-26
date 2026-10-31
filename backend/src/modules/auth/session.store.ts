import { prisma } from '../../config/database';
import { logger } from '../../utils/logger';

export interface SessionRecord {
  id: string;
  userId: string;
  tokenHash: string;
  familyId: string;
  jti: string;
  expiresAt: Date;
  isRevoked: boolean;
  revokedAt?: Date | null;
  replacedByTokenHash?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSessionParams {
  userId: string;
  tokenHash: string;
  familyId: string;
  jti: string;
  expiresAt: Date;
  ipAddress?: string;
  userAgent?: string;
}

export interface ISessionStore {
  createSession(params: CreateSessionParams): Promise<SessionRecord>;
  findSessionByTokenHash(tokenHash: string): Promise<SessionRecord | null>;
  findSessionByJti(jti: string): Promise<SessionRecord | null>;
  revokeSession(sessionId: string, replacedByTokenHash?: string): Promise<void>;
  revokeFamily(familyId: string): Promise<number>;
  revokeAllUserSessions(userId: string): Promise<number>;
  clearAllSessions?(): Promise<void>;
}

/**
 * Production-ready persistent session store backed by Prisma & PostgreSQL.
 */
export class PrismaSessionStore implements ISessionStore {
  async createSession(params: CreateSessionParams): Promise<SessionRecord> {
    const session = await prisma.refreshTokenSession.create({
      data: {
        userId: params.userId,
        tokenHash: params.tokenHash,
        familyId: params.familyId,
        jti: params.jti,
        expiresAt: params.expiresAt,
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null,
      },
    });

    return session;
  }

  async findSessionByTokenHash(tokenHash: string): Promise<SessionRecord | null> {
    return prisma.refreshTokenSession.findUnique({
      where: { tokenHash },
    });
  }

  async findSessionByJti(jti: string): Promise<SessionRecord | null> {
    return prisma.refreshTokenSession.findUnique({
      where: { jti },
    });
  }

  async revokeSession(sessionId: string, replacedByTokenHash?: string): Promise<void> {
    await prisma.refreshTokenSession.update({
      where: { id: sessionId },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
        replacedByTokenHash: replacedByTokenHash || null,
      },
    });
  }

  async revokeFamily(familyId: string): Promise<number> {
    const result = await prisma.refreshTokenSession.updateMany({
      where: {
        familyId,
        isRevoked: false,
      },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
      },
    });

    logger.warn(`[SessionStore] Security Alert: Revoked entire token family ${familyId} (${result.count} active sessions terminated)`);
    return result.count;
  }

  async revokeAllUserSessions(userId: string): Promise<number> {
    const result = await prisma.refreshTokenSession.updateMany({
      where: {
        userId,
        isRevoked: false,
      },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
      },
    });

    logger.info(`[SessionStore] Revoked all sessions for user ${userId} (${result.count} sessions invalidated)`);
    return result.count;
  }
}

/**
 * In-memory session store used exclusively for isolated unit testing
 * and offline simulation without PostgreSQL.
 */
export class InMemorySessionStore implements ISessionStore {
  private sessions = new Map<string, SessionRecord>();

  async createSession(params: CreateSessionParams): Promise<SessionRecord> {
    const id = `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const now = new Date();
    const session: SessionRecord = {
      id,
      userId: params.userId,
      tokenHash: params.tokenHash,
      familyId: params.familyId,
      jti: params.jti,
      expiresAt: params.expiresAt,
      isRevoked: false,
      revokedAt: null,
      replacedByTokenHash: null,
      ipAddress: params.ipAddress || null,
      userAgent: params.userAgent || null,
      createdAt: now,
      updatedAt: now,
    };

    this.sessions.set(session.id, session);
    return session;
  }

  async findSessionByTokenHash(tokenHash: string): Promise<SessionRecord | null> {
    for (const s of this.sessions.values()) {
      if (s.tokenHash === tokenHash) return { ...s };
    }
    return null;
  }

  async findSessionByJti(jti: string): Promise<SessionRecord | null> {
    for (const s of this.sessions.values()) {
      if (s.jti === jti) return { ...s };
    }
    return null;
  }

  async revokeSession(sessionId: string, replacedByTokenHash?: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.isRevoked = true;
      session.revokedAt = new Date();
      if (replacedByTokenHash) {
        session.replacedByTokenHash = replacedByTokenHash;
      }
      session.updatedAt = new Date();
    }
  }

  async revokeFamily(familyId: string): Promise<number> {
    let count = 0;
    const now = new Date();
    for (const s of this.sessions.values()) {
      if (s.familyId === familyId && !s.isRevoked) {
        s.isRevoked = true;
        s.revokedAt = now;
        s.updatedAt = now;
        count++;
      }
    }
    return count;
  }

  async revokeAllUserSessions(userId: string): Promise<number> {
    let count = 0;
    const now = new Date();
    for (const s of this.sessions.values()) {
      if (s.userId === userId && !s.isRevoked) {
        s.isRevoked = true;
        s.revokedAt = now;
        s.updatedAt = now;
        count++;
      }
    }
    return count;
  }

  async clearAllSessions(): Promise<void> {
    this.sessions.clear();
  }

  dumpSessions(): SessionRecord[] {
    return Array.from(this.sessions.values());
  }

  restoreSessions(records: SessionRecord[]): void {
    this.sessions.clear();
    for (const r of records) {
      this.sessions.set(r.id, { ...r });
    }
  }
}

// Default session store configuration
let currentStore: ISessionStore = new PrismaSessionStore();

export function getSessionStore(): ISessionStore {
  return currentStore;
}

export function setSessionStore(store: ISessionStore): void {
  currentStore = store;
}
