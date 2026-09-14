import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { Routes } from '@angular/router';

import { MainLayoutComponent } from './layouts/main-layout/main-layout.component';
import { Login } from './pages/auth/login/login';
import { Dashboard } from './pages/dashboard/dashboard';
import { Quotations } from './pages/quotations/quotations';
import { Customers } from './pages/customers/customers';
import { Supplies } from './pages/supplies/supplies';
import { Binding } from './pages/supplies/binding/binding';
import { Laminating } from './pages/supplies/laminating/laminating';
import { Printing } from './pages/supplies/printing/printing';
import { StandardSizes } from './pages/supplies/standard-sizes/standard-sizes';
import { Jobs } from './pages/jobs/jobs';
import { Reports } from './pages/reports/reports';
import { QuotationDetails } from './pages/quotations/quotation-create/quotation-details/quotation-details';
import { QuotPrimary } from './pages/quotations/quotation-create/quotation-create';
import { QuotationsList } from './pages/quotations/quotations-list/quotations-list';
import { ReportQuotations } from './pages/reports/quotations/Reportquotations';
import { ReportProduction } from './pages/reports/production/Reportproduction';
import { Users } from './pages/users/users';
import { CreateUser } from './pages/users/create-user/create-user';
import { UserDetails } from './pages/users/user-details/user-details';
import { EditUser } from './pages/users/edit-user/edit-user';
import { Profile } from './pages/profile/profile';
import { Settings } from './pages/settings/settings';
import { MachineOperators } from './pages/jobs/machine-operators/machine-operators';


export const routes: Routes = [
  {
    path: 'login',
    component: Login
  },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', component: Dashboard },
      { path: 'profile', component: Profile },
      { path: 'settings', component: Settings },
      
      
      // --- Protected User Routes (Admin Only) ---
      { path: 'users', component: Users, canActivate: [roleGuard(['Admin'])] },
      { path: 'users/create', component: CreateUser, canActivate: [roleGuard(['Admin'])] },
      { path: 'users/view/:id', component: UserDetails, canActivate: [roleGuard(['Admin'])] },
      { path: 'users/edit/:id', component: EditUser, canActivate: [roleGuard(['Admin'])] },
      { path: 'dashboard/operators', component: MachineOperators, canActivate: [roleGuard(['Admin', 'Manager'])] },
      { path: 'jobs/operators', redirectTo: 'dashboard/operators', pathMatch: 'full' },
{ path: 'quotations', component: Quotations, canActivate: [roleGuard(['Admin', 'Manager'])] },
{ path: 'quotations/quotation-create', component: QuotPrimary, canActivate: [roleGuard(['Admin', 'Manager'])] },
{ path: 'quotations/quotation-create/quotations-details', component: QuotationDetails, canActivate: [roleGuard(['Admin', 'Manager'])] },
{ path: 'quotations/quotation-create/quotations-details/:id', component: QuotationDetails, canActivate: [roleGuard(['Admin', 'Manager'])] },
{ path: 'quotations/quotations-list', component: QuotationsList, canActivate: [roleGuard(['Admin', 'Manager'])] },
{ path: 'customers', component: Customers, canActivate: [roleGuard(['Admin', 'Manager'])] },
{ path: 'supplies', component: Supplies, canActivate: [roleGuard(['Admin', 'Manager'])] },
{ path: 'supplies/binding', component: Binding, canActivate: [roleGuard(['Admin', 'Manager'])] },
{ path: 'supplies/laminating', component: Laminating, canActivate: [roleGuard(['Admin', 'Manager'])] },
{ path: 'supplies/printing', component: Printing, canActivate: [roleGuard(['Admin', 'Manager'])] },
{ path: 'supplies/standard-sizes', component: StandardSizes, canActivate: [roleGuard(['Admin', 'Manager'])] },
{ path: 'jobs', component: Jobs, canActivate: [roleGuard(['Admin', 'Manager'])] },
{ path: 'jobs/:jobId/quotation/:id', component: QuotationDetails, data: { jobQuotationView: true }, canActivate: [roleGuard(['Admin', 'Manager'])] },
{ path: 'reports', component: Reports, canActivate: [roleGuard(['Admin', 'Manager'])] },
{ path: 'reports/quotations', component: ReportQuotations, canActivate: [roleGuard(['Admin', 'Manager'])] },
{ path: 'reports/production', component: ReportProduction, canActivate: [roleGuard(['Admin', 'Manager'])] },
    ]
  },
  { path: '**', redirectTo: '' }
];
