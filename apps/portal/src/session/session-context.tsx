import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { PortalLoginRequest, PortalUserInfo, StudentSummary } from "@portal-types";
import { portalClient } from "@/api/portal-client";

const storageKey = "sma-portal-session";

export interface PortalSession {
  accessToken: string;
  refreshToken: string;
  user: PortalUserInfo;
}

interface StoredRefreshSession {
  refreshToken: string;
}

interface SessionContextValue {
  session: PortalSession | null;
  selectedStudent: StudentSummary | undefined;
  isRestoring: boolean;
  login: (credentials: PortalLoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  selectStudent: (studentId: string) => void;
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

function save(session: PortalSession | null) {
  // The current portal endpoint exchanges a body refresh_token. Keep only that
  // short-lived browser-session compatibility value; access tokens stay in memory.
  if (session)
    sessionStorage.setItem(
      storageKey,
      JSON.stringify({ refreshToken: session.refreshToken } satisfies StoredRefreshSession)
    );
  else sessionStorage.removeItem(storageKey);
}

function read(): StoredRefreshSession | null {
  try {
    const text = sessionStorage.getItem(storageKey);
    return text ? (JSON.parse(text) as StoredRefreshSession) : null;
  } catch {
    return null;
  }
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<PortalSession | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string>();
  const [isRestoring, setIsRestoring] = useState(Boolean(read()?.refreshToken));

  const setCurrentSession = useCallback((next: PortalSession | null) => {
    setSession(next);
    save(next);
    setSelectedStudentId(
      (current) => current ?? next?.user.studentId ?? next?.user.linkedStudents?.[0]?.id
    );
  }, []);

  useEffect(() => {
    const stored = read();
    if (!stored?.refreshToken) {
      setIsRestoring(false);
      return;
    }
    portalClient
      .refresh(stored.refreshToken)
      .then((response) =>
        setCurrentSession({
          accessToken: response.accessToken,
          refreshToken: response.refreshToken,
          user: response.user,
        })
      )
      .catch(() => setCurrentSession(null))
      .finally(() => setIsRestoring(false));
  }, [setCurrentSession]);

  const login = useCallback(
    async (credentials: PortalLoginRequest) => {
      const response = await portalClient.login(credentials);
      setCurrentSession({
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        user: response.user,
      });
    },
    [setCurrentSession]
  );

  const logout = useCallback(async () => {
    const previous = session;
    setCurrentSession(null);
    if (previous)
      await portalClient.logout(previous.refreshToken, previous.accessToken).catch(() => undefined);
  }, [session, setCurrentSession]);

  const selectedStudent = useMemo(
    () => session?.user.linkedStudents?.find((student) => student.id === selectedStudentId),
    [selectedStudentId, session]
  );

  return (
    <SessionContext.Provider
      value={{
        session,
        selectedStudent,
        isRestoring,
        login,
        logout,
        selectStudent: setSelectedStudentId,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error("useSession must be used within SessionProvider");
  return context;
}
