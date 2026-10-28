import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-recuperar-senha-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './recuperar-senha-page.html',
  styleUrl: './recuperar-senha-page.css',
})
export class RecuperarSenhaPageComponent {
  private readonly fb = inject(FormBuilder);
  readonly form = this.fb.group({ email: ['', [Validators.required, Validators.email]] });
  loading = false;
  mensagem = '';
  erro = '';

  constructor(private readonly auth: AuthService) {}

  enviar(): void {
    if (this.form.invalid || this.loading) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading = true;
    this.erro = '';
    this.mensagem = '';
    this.auth.requestPasswordReset({ email: this.form.value.email! }).subscribe({
      next: response => { this.loading = false; this.mensagem = response.mensagem; },
      error: () => {
        this.loading = false;
        this.erro = 'Não foi possível enviar a solicitação agora. Tente novamente.';
      },
    });
  }
}
