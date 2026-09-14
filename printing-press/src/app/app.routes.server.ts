import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: '**',
    // Authentication is stored in browser localStorage. Rendering protected
    // routes on the server makes guards see no token and redirect on refresh.
    renderMode: RenderMode.Client
  }
];
