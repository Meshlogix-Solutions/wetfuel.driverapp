import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { User, UserManager, WebStorageStateStore } from 'oidc-client-ts';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { environment } from '../../environments/environment';

const IS_NATIVE = Capacitor.isNativePlatform();
// On native, https://localhost/authenticate never actually completes - it's a real network
// request (ERR_CONNECTION_REFUSED) whenever the flow leaves Capacitor's own intercepted
// WebView context. com.wetfuel.driver://authenticate is a custom URL scheme instead - Android
// routes it back to this app as a deep link, no network involved. In a plain browser (web/dev
// testing) a custom scheme has nowhere to go, so that path keeps using the page-based redirect.
const REDIRECT_URI = IS_NATIVE ? 'com.wetfuel.driver://authenticate' : `${window.location.origin}/authenticate`;
const POST_LOGOUT_REDIRECT_URI = IS_NATIVE ? 'com.wetfuel.driver://login' : `${window.location.origin}/login`;

@Injectable({ providedIn: 'root' })
export class DriverAuthService {
  private readonly manager = new UserManager({
    authority: environment.authority,
    client_id: environment.clientId,
    redirect_uri: REDIRECT_URI,
    post_logout_redirect_uri: POST_LOGOUT_REDIRECT_URI,
    scope: 'openid profile email offline_access',
    response_type: 'code',
    automaticSilentRenew: true,
    // oidc-client-ts defaults to sessionStorage, which is wiped every time this PWA is closed
    // and reopened - on mobile that's essentially every launch, so drivers who never logged
    // out were still bounced to /login on every app restart. localStorage survives that.
    userStore: new WebStorageStateStore({ store: window.localStorage }),
  });

  constructor(private readonly router: Router) {
    this.manager.events.addUserLoaded(user => this.storeToken(user));
    this.manager.events.addUserUnloaded(() => this.clearToken());
    this.manager.events.addAccessTokenExpired(() => this.expireSession());

    if (IS_NATIVE) {
      // The redirect never lands on the /authenticate route on native (there's no page
      // navigation, just a deep-link intent), so it's completed here instead of relying on
      // AuthenticatePage's ngOnInit.
      void App.addListener('appUrlOpen', ({ url }) => {
        if (!url.startsWith('com.wetfuel.driver://authenticate')) return;
        void this.completeLogin(url).then(
          () => this.router.navigateByUrl('/dashboard'),
          (err: unknown) => {
            const failure = err as { message?: string; error_description?: string };
            const message = failure.error_description ?? failure.message ?? String(err);
            void this.router.navigate(['/authenticate'], { queryParams: { error: message } });
          },
        );
      });
    }
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

  login(loginHint?: string): Promise<void> {
    return this.manager.signinRedirect({
      prompt: 'login',
      login_hint: loginHint?.trim() || undefined,
    });
  }

  async completeLogin(url?: string): Promise<User> {
    const user = await this.manager.signinRedirectCallback(url);
    this.storeToken(user);
    return user;
  }

  async logout(): Promise<void> {
    this.clearToken();
    await this.manager.signoutRedirect();
  }

  expireSession(): void {
    this.clearToken();
    void this.manager.removeUser();
    if (!['/login', '/authenticate'].includes(this.router.url.split('?')[0])) {
      void this.router.navigateByUrl('/login', { replaceUrl: true });
    }
  }

  private storeToken(user: User): void {
    localStorage.setItem('driver_access_token', user.access_token);
  }

  private clearToken(): void {
    localStorage.removeItem('driver_access_token');
  }
}
