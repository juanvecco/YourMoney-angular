import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
    selector: 'app-cadastro-page',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        RouterModule
    ],
    templateUrl: './cadastro-page.html',
    styleUrls: ['./cadastro-page.css']
})
export class CadastroPageComponent {
    form: FormGroup;
    loading = false;
    error: string | null = null;
    showPassword = false;
    showPasswordConfirmation = false;

    constructor(
        private fb: FormBuilder,
        private authService: AuthService,
        private router: Router
    ) {
        this.form = this.fb.group({
            nome: ['', [Validators.required, Validators.minLength(2)]],
            email: ['', [Validators.required, Validators.email]],
            senha: ['', [Validators.required, Validators.minLength(6)]],
            senhaConfirmacao: ['', Validators.required]
        }, { validators: this.passwordsMatch });
    }

    onSubmit(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        this.loading = true;
        this.error = null;

        this.authService.register(this.form.getRawValue()).subscribe({
            next: () => {
                this.loading = false;
                this.router.navigate(['/dashboard']);
            },
            error: (err) => {
                this.error = this.extractErrorMessage(err);
                this.loading = false;
            }
        });
    }

    togglePasswordVisibility(): void {
        this.showPassword = !this.showPassword;
    }

    togglePasswordConfirmationVisibility(): void {
        this.showPasswordConfirmation = !this.showPasswordConfirmation;
    }

    hasError(controlName: string, errorName: string): boolean {
        const control = this.form.get(controlName);
        return !!control && control.touched && control.hasError(errorName);
    }

    private passwordsMatch(control: AbstractControl): { passwordsMismatch: true } | null {
        const senha = control.get('senha')?.value;
        const confirmacao = control.get('senhaConfirmacao')?.value;
        return senha && confirmacao && senha !== confirmacao ? { passwordsMismatch: true } : null;
    }

    private extractErrorMessage(err: any): string {
        return (
            err.error?.errors?.Mensagens?.join(', ') ||
            err.error?.message ||
            err.message ||
            'Erro ao criar conta'
        );
    }
}
