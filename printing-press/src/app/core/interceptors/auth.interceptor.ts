import {

  Injectable

} from '@angular/core';

import {

  HttpInterceptor,

  HttpRequest,

  HttpHandler

} from '@angular/common/http';

import { AuthService }
from '../services/auth.service';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

@Injectable()

export class AuthInterceptor
implements HttpInterceptor {

  constructor(
    private auth: AuthService,
    private router: Router
  ) {}

  intercept(
    req: HttpRequest<any>,
    next: HttpHandler
  ) {

    const token =
      this.auth.getToken();

    /* ─────────────────────── */

    if (token) {

      const cloned =
        req.clone({

          setHeaders: {

            Authorization:
              `Bearer ${token}`

          }

        });

      return next.handle(cloned).pipe(
        catchError(error => {
          if (error.status === 401) {
            this.auth.logout();
            this.router.navigate(['/login'], {
              queryParams: { reason: 'session-expired' }
            });
          }
          return throwError(() => error);
        })
      );

    }

    return next.handle(req).pipe(
      catchError(error => {
        if (error.status === 401) {
          this.auth.logout();
          this.router.navigate(['/login'], {
            queryParams: { reason: 'session-expired' }
          });
        }
        return throwError(() => error);
      })
    );

  }

}
