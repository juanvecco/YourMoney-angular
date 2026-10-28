import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-redefinir-senha-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './redefinir-senha-page.html',
  styleUrl: '../recuperar-senha-page/recuperar-senha-page.css',
})
export class RedefinirSenhaPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    token: ['', Validators.required],
    senha: ['', [Validators.required, Validators.minLength(6)]],
    senhaConfirmacao: ['', Validators.required],
  }, { validators: this.senhasIguais });
  loading = false;
  concluido = false;
  erro = '';

  constructor(
    private readonly auth: AuthService,
    private readonly route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.form.patchValue({
      email: this.route.snapshot.queryParamMap.get('email') ?? '',
      token: this.route.snapshot.queryParamMap.get('token') ?? '',
    });
  }

  redefinir(): void {
    if (this.form.invalid || this.loading) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading = true;
    this.erro = '';
    const value = this.form.getRawValue();
    this.auth.resetPassword({
      email: value.email!, token: value.token!, senha: value.senha!, senhaConfirmacao: value.senhaConfirmacao!,
    }).subscribe({
      next: () => { this.loading = false; this.concluido = true; },
      error: () => {
        this.loading = false;
        this.erro = 'O link é inválido, expirou ou já foi utilizado. Solicite uma nova recuperação.';
      },
    });
  }

  private senhasIguais(control: AbstractControl): ValidationErrors | null {
    return control.get('senha')?.value === control.get('senhaConfirmacao')?.value
      ? null : { passwordsMismatch: true };
  }
}
