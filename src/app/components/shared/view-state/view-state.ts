import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { FinancialViewState } from '../../../models/financial-view-state.model';

@Component({
  selector: 'app-view-state', standalone: true, templateUrl: './view-state.html', styleUrl: './view-state.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ViewStateComponent {
  @Input({ required: true }) state: FinancialViewState = 'loading';
  @Input() message = '';
  @Input() retryAvailable = false;
  @Output() readonly retry = new EventEmitter<void>();
  get isProgress(): boolean { return this.state === 'loading' || this.state === 'refreshing'; }
  get isError(): boolean { return this.state === 'loadError' || this.state === 'stale' || this.state === 'unauthenticated'; }
  get isVisible(): boolean { return this.state !== 'loadedWithData'; }
}
