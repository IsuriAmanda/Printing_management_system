import { Component,inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import{DashboardOverview} from './widgets/dashboard-overview/dashboard-overview';
import { OperatorDashboard }from './widgets/operator-dashboard/operator-dashboard';

import { AuthService }from '../../core/services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,

  imports: [
    CommonModule,
    DashboardOverview,
    OperatorDashboard
  ],

  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss']
})
export class Dashboard {
private authService = inject(AuthService);

readonly currentUser =  this.authService.getUser();
  
}