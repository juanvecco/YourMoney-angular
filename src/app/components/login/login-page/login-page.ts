import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
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

    showPassword = false;

    constructor(
        private fb: FormBuilder,
        private authService: AuthService,
        private router: Router
    ) {
        this.form = this.fb.group({
            email: ['', [Validators.required, Validators.email]],
            senha: ['', Validators.required]
        });
    }

    onSubmit(): void {
        if (this.form.invalid) return;

        this.loading = true;
        this.error = null;

        const payload = {
            email: this.form.value.email,
            senha: this.form.value.senha
        };

        this.authService.login(payload).subscribe({
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

    private extractErrorMessage(err: any): string {
        return (
            err.error?.errors?.Mensagens?.join(', ') ||
            err.error?.message ||
            err.message ||
            'Erro ao fazer login'
        );
    }
    ngOnInit(): void { }
    togglePasswordVisibility(): void {
        this.showPassword = !this.showPassword;
    }
}