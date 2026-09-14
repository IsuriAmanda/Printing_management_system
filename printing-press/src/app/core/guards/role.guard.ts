import { inject, PLATFORM_ID } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { AuthService } from '../services/auth.service';

export const roleGuard = (allowedRoles: string[]): CanActivateFn => {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);
    const platformId = inject(PLATFORM_ID);

    // Server-side rendering has no access to localStorage, so avoid rendering
    // protected role pages before the browser can attach the token.
    if (!isPlatformBrowser(platformId)) {
      return router.createUrlTree(['/login']);
    }

    if (authService.hasRole(...allowedRoles)) {
      return true;
    }

    // Logged in, just wrong role — send to dashboard, not login
    return router.createUrlTree(['/']);
  };
};
