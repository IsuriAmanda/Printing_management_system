import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notifications.html',
  styleUrl: './notifications.scss',
})
export class Notifications {
 notifications = [

    {
      type: 'quotation',
      title: 'New quotation received',
      message: 'Customer: ABC Company',
      time: '2 mins ago',
      unread: true
    },

    {
      type: 'warning',
      title: 'Low paper stock warning',
      message: 'A4 Matte below threshold',
      time: '15 mins ago',
      unread: true
    },

    {
      type: 'success',
      title: 'Production completed',
      message: 'Job #P023 finished successfully',
      time: '1 hour ago',
      unread: false
    },

    {
      type: 'info',
      title: 'Customer payment received',
      message: 'Invoice INV-102 paid',
      time: '3 hours ago',
      unread: false
    }

  ];
}
