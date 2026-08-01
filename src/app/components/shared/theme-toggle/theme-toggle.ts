import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ThemeService } from '../../../services/theme.service';

@Component({
  selector: 'app-theme-toggle', standalone: true, templateUrl: './theme-toggle.html', styleUrl: './theme-toggle.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemeToggleComponent {
  constructor(readonly themeService: ThemeService) {}
  get destination(): string { return this.themeService.theme() === 'light' ? 'escuro' : 'claro'; }
}
