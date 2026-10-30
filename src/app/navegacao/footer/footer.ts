import { Component } from '@angular/core';

@Component({
  selector: 'app-footer',
  standalone: true,
  templateUrl: './footer.html',
  styles: [`footer { border-top: 1px solid var(--ym-border); color: var(--ym-muted); } .ym-footer { width: min(1180px, calc(100% - 2rem)); margin: auto; padding: 1.5rem 0; text-align: center; }`]
})
export class FooterComponent {
  year = new Date().getFullYear();
}
