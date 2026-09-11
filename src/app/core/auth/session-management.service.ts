import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ActiveSessionDevice {
  deviceId: string | null;
  name: string | null;
  platform: string;
  model: string | null;
  appVersion: string | null;
}

export interface ActiveSession {
  id: string;
  current: boolean;
  device: ActiveSessionDevice;
  ipAddress: string | null;
  country: string | null;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
}

export interface ActiveSessionsResponse {
  sessions: ActiveSession[];
}

export interface RevokeSessionResponse {
  success: boolean;
  sessionId: string;
  currentSession: boolean;
}

export interface RevokeOtherSessionsResponse {
  success: boolean;
  revokedCount: number;
}

@Service()
export class SessionManagementService {
  private readonly http = inject(HttpClient);
  private readonly sessionsUrl = `${environment.apiBaseUrl}/api/auth/sessions`;

  listActiveSessions(): Observable<ActiveSessionsResponse> {
    return this.http.get<ActiveSessionsResponse>(this.sessionsUrl);
  }

  revokeSession(sessionId: string): Observable<RevokeSessionResponse> {
    return this.http.delete<RevokeSessionResponse>(`${this.sessionsUrl}/${encodeURIComponent(sessionId)}`);
  }

  revokeOtherSessions(): Observable<RevokeOtherSessionsResponse> {
    return this.http.post<RevokeOtherSessionsResponse>(`${this.sessionsUrl}/logout-others`, null);
  }

  logoutCurrentSession(): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${environment.apiBaseUrl}/api/auth/logout`, null);
  }
}
