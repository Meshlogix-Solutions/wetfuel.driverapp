import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

interface AuthTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
  user: { id: string; email: string; firstName?: string; lastName?: string; roleName: string };
}

const ACCESS_TOKEN_KEY = 'driver_access_token';
const REFRESH_TOKEN_KEY = 'driver_refresh_token';
const EXPIRES_AT_KEY = 'driver_token_expires_at';
const USER_ID_KEY = 'driver_user_id';

@Injectable({ providedIn: 'root' })
export class DriverAuthService {
  // Guards against firing a second /auth/refresh request while one is already in flight
  // (e.g. several API calls hitting 401 around the same time).
  private refreshInFlight: Promise<boolean> | null = null;

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router,
  ) {}

  async login(email: string, password: string): Promise<void> {
    const response = await firstValueFrom(
      this.http.post<{ data: AuthTokenResponse }>(`${environment.apiUrl}/auth/driver/login`, { email, password }),
    );
    this.storeTokens(response.data);
  }

  async hasValidSession(): Promise<boolean> {
    if (!localStorage.getItem(ACCESS_TOKEN_KEY)) return false;
    return this.isExpiringSoon() ? this.refreshToken() : true;
  }

  getCurrentUserId(): string | null {
    return localStorage.getItem(USER_ID_KEY);
  }

  refreshToken(): Promise<boolean> {
    if (!this.refreshInFlight) {
      this.refreshInFlight = this.doRefresh().finally(() => {
        this.refreshInFlight = null;
      });
    }
    return this.refreshInFlight;
  }

  async logout(): Promise<void> {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (refreshToken) {
      try {
        await firstValueFrom(this.http.post(`${environment.apiUrl}/auth/logout`, { refreshToken }));
      } catch {
        // Best-effort revoke - local session is cleared regardless.
      }
    }
    this.expireSession();
  }

  expireSession(): void {
    this.clearTokens();
    if (this.router.url.split('?')[0] !== '/login') {
      void this.router.navigateByUrl('/login', { replaceUrl: true });
    }
  }

  private async doRefresh(): Promise<boolean> {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refreshToken) return false;
    try {
      const response = await firstValueFrom(
        this.http.post<{ data: AuthTokenResponse }>(`${environment.apiUrl}/auth/refresh`, { refreshToken }),
      );
      this.storeTokens(response.data);
      return true;
    } catch {
      this.clearTokens();
      return false;
    }
  }

  private isExpiringSoon(): boolean {
    const expiresAt = Number(localStorage.getItem(EXPIRES_AT_KEY) ?? 0);
    return !expiresAt || Date.now() >= expiresAt - 30_000;
  }

  private storeTokens(data: AuthTokenResponse): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
    localStorage.setItem(EXPIRES_AT_KEY, String(Date.now() + data.expiresIn * 1000));
    localStorage.setItem(USER_ID_KEY, data.user.id);
  }

  private clearTokens(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(EXPIRES_AT_KEY);
    localStorage.removeItem(USER_ID_KEY);
  }
}
