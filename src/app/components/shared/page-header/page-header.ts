import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'app-page-header',
  standalone: true,
  templateUrl: './page-header.html',
  styleUrl: './page-header.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageHeaderComponent {
  @Input() eyebrow = '';
  @Input({ required: true }) heading = '';
  @Input() description = '';
}
