import { Component, effect, input, output, signal } from '@angular/core';

@Component({
  selector: 'app-calendar',
  imports: [],
  templateUrl: './calendar.component.html',
  styleUrl: './calendar.component.scss'
})
export class CalendarComponent {
  selected = input<Date | undefined>();
  select = output<Date>();

  viewDate = signal(new Date());
  selectedValue = signal<Date | undefined>(undefined);
  weeks = signal<(number | null)[][]>([]);
  weekdays = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

  constructor() {
    effect(() => {
      const select = this.selected();
      if (select) {
        this.selectedValue.set(select);
        this.viewDate.set(new Date(select));
      }
    });

    effect(() => {
      this.viewDate();
      this.buildCalendar();
    });
  }

  private buildCalendar() {
    const y = this.viewDate().getFullYear();
    const m = this.viewDate().getMonth();
    const first = new Date(y, m, 1);
    const offset = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(y, m + 1, 0).getDate();

    const cells: (number | null)[] = [];
    for (let i = 0; i < offset; i++) cells.push(null);
    for (let d = 0; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);

    const newWeeks: (number | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) newWeeks.push(cells.slice(i, i + 7));

    this.weeks.set(newWeeks);
  }

  prevMonth() {
    const vd = this.viewDate();
    this.viewDate.set(new Date(vd.getFullYear(), vd.getMonth() - 1, 1 ));
    this.buildCalendar();
  }

  nextMonth() {
    const vd = this.viewDate();
    this.viewDate.set(new Date(vd.getFullYear(), vd.getMonth() + 1, 1));
    this.buildCalendar();
  }

  choose(day: number | null) {
    if (!day) return;
    const vd = this.viewDate();
    const d = new Date(vd.getFullYear(), vd.getMonth(), day);
    this.selectedValue.set(d);
    this.select.emit(d);
  }

  isToday(day: number | null) {
    if (!day) return false;
    const t = new Date();
    const vd = this.viewDate();
    return (
      t.getFullYear() === vd.getFullYear() &&
      t.getMonth() === vd.getMonth() &&
      t.getDate() === day
    )
  }

  isSunday(colIndex: number) {
    return colIndex === 6;
  }
}
