import { Injectable } from '@angular/core';
import { User, UserManager } from 'oidc-client-ts';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class DriverAuthService {
  private readonly manager = new UserManager({
    authority: environment.authority,
    client_id: environment.clientId,
    redirect_uri: `${window.location.origin}/authenticate`,
    post_logout_redirect_uri: `${window.location.origin}/login`,
    scope: 'openid profile email offline_access',
    response_type: 'code',
    useRefreshToken: true,
    automaticSilentRenew: true,
  });

  constructor() {
    this.manager.events.addUserLoaded(user => this.storeToken(user));
    this.manager.events.addUserUnloaded(() => this.clearToken());
    this.manager.events.addAccessTokenExpired(() => this.clearToken());
  }

  async user(): Promise<User | null> {
    return this.manager.getUser();
  }

  async hasValidSession(): Promise<boolean> {
    const user = await this.manager.getUser();
    if (!user || user.expired) {
      this.clearToken();
      return false;
    }
    this.storeToken(user);
    return true;
  }

  login(): Promise<void> {
    return this.manager.signinRedirect();
  }

  async completeLogin(): Promise<User> {
    const user = await this.manager.signinRedirectCallback();
    this.storeToken(user);
    return user;
  }

  async logout(): Promise<void> {
    this.clearToken();
    await this.manager.signoutRedirect();
  }

  private storeToken(user: User): void {
    localStorage.setItem('driver_access_token', user.access_token);
  }

  private clearToken(): void {
    localStorage.removeItem('driver_access_token');
  }
}
