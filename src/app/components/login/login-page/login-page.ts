import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
    selector: 'app-login-page',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        RouterModule
    ],
    templateUrl: './login-page.html',
    styleUrls: ['./login-page.css']
})
export class LoginPageComponent implements OnInit {
    form: FormGroup;
    loading = false;
    error: string | null = null;
    validationSummary: string[] = [];

    showPassword = false;

    constructor(
        private fb: FormBuilder,
        private authService: AuthService,
        private router: Router,
        private route: ActivatedRoute
    ) {
        this.form = this.fb.group({
            email: ['', [Validators.required, Validators.email]],
            senha: ['', Validators.required]
        });
    }

    onSubmit(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            this.validationSummary = this.collectValidationSummary();
            return;
        }

        this.loading = true;
        this.error = null;
        this.validationSummary = [];

        const payload = {
            email: this.form.value.email,
            senha: this.form.value.senha
        };

        this.authService.login(payload).subscribe({
            next: () => {
                this.loading = false;
                const requested = this.route.snapshot.queryParamMap.get('returnUrl');
                const returnUrl = requested && requested.startsWith('/') && !requested.startsWith('//')
                    ? requested
                    : '/dashboard';
                this.router.navigateByUrl(returnUrl);
            },
            error: (err) => {
                this.error = this.extractErrorMessage(err);
                this.loading = false;
            }
        });
    }

    private extractErrorMessage(err: any): string {
        return (
            err.error?.errors?.Mensagens?.join(', ') ||
            err.error?.message ||
            err.message ||
            'Erro ao fazer login'
        );
    }

    hasError(controlName: string, errorName: string): boolean {
        const control = this.form.get(controlName);
        return !!control && control.touched && control.hasError(errorName);
    }

    isInvalid(controlName: string): boolean {
        const control = this.form.get(controlName);
        return !!control && control.invalid && control.touched;
    }

    onFormInput(): void {
        this.error = null;
        if (this.validationSummary.length) {
            this.validationSummary = this.collectValidationSummary();
        }
    }

    private collectValidationSummary(): string[] {
        const messages: string[] = [];
        const email = this.form.get('email');
        const senha = this.form.get('senha');
        if (email?.hasError('required')) messages.push('Preencha o campo E-mail.');
        else if (email?.hasError('email')) messages.push('Informe um e-mail válido.');
        if (senha?.hasError('required')) messages.push('Preencha o campo Senha.');
        return messages;
    }

    ngOnInit(): void { }
    togglePasswordVisibility(): void {
        this.showPassword = !this.showPassword;
    }
}
