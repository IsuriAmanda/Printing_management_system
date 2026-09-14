import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';

export const authGuard: CanActivateFn = () => {

  const authService = inject(AuthService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  // Server-side rendering cannot read localStorage, so do not render protected
  // pages there; otherwise their API calls run without an auth token.
  if (isPlatformBrowser(platformId) && authService.isLoggedIn()) {
    return true;
  }

return router.createUrlTree(['/login'])
};
