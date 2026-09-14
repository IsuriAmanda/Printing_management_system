import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { JobsList } from './jobs-list/jobs-list';

@Component({
  selector: 'app-jobs',
  standalone: true,

  imports: [
    CommonModule,
    JobsList
  ],

  templateUrl: './jobs.html',
  styleUrls: ['./jobs.scss']
})
export class Jobs {

}