import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import{ Router, RouterLink } from '@angular/router';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { FormBuilder, Validators,ReactiveFormsModule } from '@angular/forms';
import { QuotationsList } from './quotations-list/quotations-list';


@Component({
  selector: 'app-quotations',
  standalone: true,

  imports: [
    CommonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    ReactiveFormsModule,
    QuotationsList
],

  templateUrl: './quotations.html',
  styleUrls: ['./quotations.scss']
})
export class Quotations{
   
}