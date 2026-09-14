import {
  Component, OnDestroy, AfterViewInit, inject,
  signal, computed, ViewChild, PLATFORM_ID
} from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { Router, NavigationEnd, RouterModule } from '@angular/router';
import { filter, map, shareReplay, takeUntil } from 'rxjs/operators';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { MatSidenav } from '@angular/material/sidenav';
import { Observable, Subject, of, interval } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';

export interface MenuItem {
  name: string;
  link: string;
  icon?: string;
  isHeader?: boolean;
}

export type ModuleKey =
  | 'dashboard' | 'quotations' | 'supplies'
  | 'customers' | 'jobs' | 'reports' | 'users';

const VALID_MODULES = new Set<ModuleKey>([
  'quotations', 'supplies', 'customers', 'jobs', 'reports', 'users',
]);

@Component({
  selector: 'app-main-layout',
  standalone: true,
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.scss'],
  imports: [
    CommonModule, RouterModule,
    MatToolbarModule, MatButtonModule, MatSidenavModule,
    MatListModule, MatIconModule, MatMenuModule,
    MatBadgeModule, MatTooltipModule, MatDividerModule,
  ],
})
export class MainLayoutComponent implements OnDestroy, AfterViewInit {
  private readonly breakpointObserver = inject(BreakpointObserver);
  private readonly router             = inject(Router);
  private readonly authService        = inject(AuthService);
  private readonly platformId         = inject(PLATFORM_ID);        
  private readonly notificationService = inject(NotificationService);

  @ViewChild('drawer') drawer!: MatSidenav;

  // Signals & Computed States
  readonly currentUser = computed(() => this.authService.getUser());
  readonly notifications = this.notificationService.notifications;
  readonly activeModule = signal<ModuleKey>('dashboard');

  private readonly destroy$ = new Subject<void>();
  showNotifications = false;

  readonly isHandset$: Observable<boolean> = isPlatformBrowser(this.platformId)
    ? this.breakpointObserver.observe(Breakpoints.Handset).pipe(
        map(r => r.matches),
        shareReplay(1),
      )
    : of(false);

  private readonly menuMap: Record<ModuleKey, MenuItem[]> = {
    dashboard:  [
      { name: 'Overview', link: '/', icon: 'dashboard' }
    ],
    quotations: [
      { name: 'Quotation History', link: '/quotations',                  icon: 'history'   },
      { name: 'Create Quote',      link: '/quotations/quotation-create', icon: 'post_add'  },
    ],
    supplies: [
      { name: 'Materials',         link: '/supplies',                icon: 'inventory_2' },
      { name: 'Standard Sizes',    link: '/supplies/standard-sizes', icon: 'straighten'   },
      { name: 'Lamination',        link: '/supplies/laminating',     icon: 'layers'       },
      { name: 'Binding Supplies',  link: '/supplies/binding',        icon: 'book'         },
      { name: 'Printing Supplies', link: '/supplies/printing',       icon: 'print'        },
    ],
    customers: [{ name: 'Customer List',   link: '/customers', icon: 'people'         }],
    jobs:      [{ name: 'Job List',        link: '/jobs',      icon: 'work'           },
      { name: 'Machine Operators', link: '/jobs/operators', icon: 'engineering' },
    ],
    
    reports: [
      { name: 'Reports Overview',  link: '/reports',            icon: 'bar_chart'              },
      { name: 'Quotation Report',  link: '/reports/quotations', icon: 'request_quote'          },
      { name: 'Production Report', link: '/reports/production', icon: 'precision_manufacturing'},
    ],
    users: [
      { name: 'User Management', link: '/users',        icon: 'manage_accounts' },
      { name: 'Create User',     link: '/users/create', icon: 'person_add'      },
    ],
  };

  readonly menuItems = computed<MenuItem[]>(() => {
    const section = this.activeModule();
    const items = this.menuMap[section] ?? [];

    if (this.currentUser()?.role === 'Operator') {
      return section === 'dashboard'
        ? items.filter(item => item.link === '/')
        : [];
    }

    return items;
  });

  readonly allMenuItems = computed<MenuItem[]>(() => {
    const role = this.currentUser()?.role;

    return Object.entries(this.menuMap).flatMap(([section, sectionItems]) => {
      if (role === 'Operator' && section !== 'dashboard') return [];
      if (section === 'users' && role !== 'Admin') return [];

      const items = role === 'Operator'
        ? sectionItems.filter(item => item.link === '/')
        : sectionItems;

      if (items.length === 0) return [];

      return [
        { name: section.toUpperCase(), link: '', isHeader: true },
        ...items,
      ];
    });
  });

readonly topNavLinks = computed(() => {
  if (this.currentUser()?.role === 'Operator') {
    return [{ name: 'Dashboard', link: '/', exact: true }];
  }
  return [
    { name: 'Dashboard',  link: '/',          exact: true  },
    { name: 'Quotations', link: '/quotations', exact: false },
    { name: 'Supplies',   link: '/supplies',   exact: false },
    { name: 'Customers',  link: '/customers',  exact: false },
    { name: 'Jobs',       link: '/jobs',       exact: false },
    { name: 'Reports',    link: '/reports',    exact: false },
    { name: 'Users',      link: '/users',      exact: false },
  ];});

  get unreadCount() {
    return this.notifications().filter(n => !n.is_read).length;
  }

  constructor() {
    this.updateActiveModule(this.router.url);

    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      takeUntil(this.destroy$),
    ).subscribe(e => this.updateActiveModule(e.urlAfterRedirects));
  }

  ngOnDestroy(): void { 
    this.destroy$.next(); 
    this.destroy$.complete(); 
  }

  ngAfterViewInit(): void {
    // Sidenav responsive management
    this.isHandset$.pipe(takeUntil(this.destroy$))
      .subscribe(isHandset => {
        if (isHandset) {
          this.drawer.close();
        } else {
          this.drawer.open();
        }
      });

    // Close on navigation change in responsive viewports
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      takeUntil(this.destroy$),
    ).subscribe(() => {
      if (this.drawer?.mode === 'over') {
        this.drawer.close();
      }
    });

    // Real-time backend notifications fetching & pulling loop
    if (isPlatformBrowser(this.platformId)) {
      this.notificationService.fetchAll().subscribe();
      
      interval(30000)
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          this.notificationService.fetchAll().subscribe();
        });
    }
  }

  toggleNotifications(): void {
    this.showNotifications = !this.showNotifications;
    if (this.showNotifications) {
      this.notificationService.markAllAsRead().subscribe();
    }
  }

  toggleDrawer(): void  { if (this.drawer) this.drawer.toggle(); }
  closeDrawer(): void   { if (this.drawer?.opened) this.drawer.close(); }

  trackByLink(_i: number, item: MenuItem) { return item.link; }
  trackByNotificationId(_i: number, n: any) { return n.notification_id || n.id; }

  private updateActiveModule(url: string): void {
    const seg = url.split('?')[0].split('#')[0].split('/')[1] as ModuleKey;
    this.activeModule.set(seg === 'dashboard' || !VALID_MODULES.has(seg) ? 'dashboard' : seg);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
