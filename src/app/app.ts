import { Component } from '@angular/core';
import { WeekView } from './week-view/week-view';

@Component({
  selector: 'app-root',
  imports: [WeekView],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {}
