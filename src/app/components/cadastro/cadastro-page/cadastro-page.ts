import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
    selector: 'app-cadastro-page',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
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
    validationSummary: string[] = [];
    serverErrorMessages: string[] = [];
    origemConhecimento = '';
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
        this.error = null;
        this.serverErrorMessages = [];
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            this.validationSummary = this.collectValidationSummary();
            return;
        }

        this.loading = true;
        this.validationSummary = [];

        const payload = {
            ...this.form.getRawValue(),
            ...(this.origemConhecimento ? { origemConhecimento: this.origemConhecimento } : {})
        };
        this.authService.register(payload).subscribe({
            next: () => {
                this.loading = false;
                this.router.navigate(['/dashboard']);
            },
            error: (err) => {
                this.serverErrorMessages = this.extractErrorMessages(err);
                this.error = this.serverErrorMessages.join(' ');
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

    isInvalid(controlName: string): boolean {
        const control = this.form.get(controlName);
        return !!control && control.invalid && control.touched;
    }

    onFormInput(): void {
        this.error = null;
        this.serverErrorMessages = [];
        if (this.validationSummary.length) {
            this.validationSummary = this.collectValidationSummary();
        }
    }

    private collectValidationSummary(): string[] {
        const messages: string[] = [];
        const nome = this.form.get('nome');
        const email = this.form.get('email');
        const senha = this.form.get('senha');
        const confirmacao = this.form.get('senhaConfirmacao');

        if (nome?.hasError('required')) messages.push('Preencha o campo Nome.');
        else if (nome?.hasError('minlength')) messages.push('Informe um nome com pelo menos 2 caracteres.');
        if (email?.hasError('required')) messages.push('Preencha o campo E-mail.');
        else if (email?.hasError('email')) messages.push('Informe um e-mail válido.');
        if (senha?.hasError('required')) messages.push('Preencha o campo Senha.');
        else if (senha?.hasError('minlength')) messages.push('A senha precisa ter pelo menos 6 caracteres.');
        if (confirmacao?.hasError('required')) messages.push('Preencha o campo Confirmar senha.');
        else if (this.form.hasError('passwordsMismatch')) messages.push('As senhas não conferem.');
        return messages;
    }

    private passwordsMatch(control: AbstractControl): { passwordsMismatch: true } | null {
        const senha = control.get('senha')?.value;
        const confirmacao = control.get('senhaConfirmacao')?.value;
        return senha && confirmacao && senha !== confirmacao ? { passwordsMismatch: true } : null;
    }

    private extractErrorMessages(err: any): string[] {
        const errors = err?.error?.errors;
        if (Array.isArray(errors?.Mensagens) && errors.Mensagens.length) return errors.Mensagens;
        if (errors && typeof errors === 'object') {
            const messages = Object.values(errors).flatMap((value) => Array.isArray(value) ? value : [value]);
            const usableMessages = messages.filter((value): value is string => typeof value === 'string' && value.trim().length > 0);
            if (usableMessages.length) return usableMessages;
        }

        const message = err?.error?.mensagem || err?.error?.message || err?.message;
        return [typeof message === 'string' && message.trim() ? message : 'Erro ao criar conta. Tente novamente.'];
    }
}
