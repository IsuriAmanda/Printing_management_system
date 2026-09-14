import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import { UserList }from './user-list/user-list';

@Component({
  selector: 'app-users',
  standalone: true,

  imports: [
    CommonModule,
    UserList
  ],

  templateUrl: './users.html',
  styleUrls: ['./users.scss']
})
export class Users {

}