import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { ExternalMethods, OnboardingGoal, ReferralSource } from '../../../models/auth.model';

type Step = 'name' | 'welcome' | 'goal' | 'source' | 'method' | 'email' | 'invite';

@Component({
  selector: 'app-cadastro-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './cadastro-page.html',
  styleUrls: ['./cadastro-page.css']
})
export class CadastroPageComponent implements OnInit {
  readonly goals: { value: OnboardingGoal; label: string; detail: string; icon: string }[] = [
    { value: 'gastos', label: 'Meus gastos', detail: 'Descobrir para onde o dinheiro vai', icon: 'bi-receipt' },
    { value: 'cartao', label: 'Minha fatura', detail: 'Conferir o que entrou no cartão', icon: 'bi-credit-card' },
    { value: 'objetivos', label: 'Meus objetivos', detail: 'Guardar para realizar planos', icon: 'bi-bullseye' },
    { value: 'saldo', label: 'Meu saldo', detail: 'Saber o que sobra no mês', icon: 'bi-wallet2' }
  ];
  readonly sources: { value: ReferralSource; label: string; icon: string }[] = [
    { value: 'instagram', label: 'Instagram', icon: 'bi-instagram' },
    { value: 'google-play', label: 'Google Play', icon: 'bi-google-play' },
    { value: 'amigo-familiar', label: 'Amigo ou familiar', icon: 'bi-people-fill' },
    { value: 'tiktok', label: 'TikTok', icon: 'bi-tiktok' },
    { value: 'google', label: 'Google', icon: 'bi-google' },
    { value: 'facebook', label: 'Facebook', icon: 'bi-facebook' },
    { value: 'youtube', label: 'YouTube', icon: 'bi-youtube' },
    { value: 'linkedin', label: 'LinkedIn', icon: 'bi-linkedin' },
    { value: 'outro', label: 'Outro lugar', icon: 'bi-chat-dots' },
    { value: 'prefiro-nao-responder', label: 'Prefiro não responder', icon: 'bi-dash-circle' }
  ];

  form: FormGroup;
  step: Step = 'name';
  methods: ExternalMethods = { google: false, apple: false };
  origemConhecimento: ReferralSource | '' = '';
  selectedGoals: OnboardingGoal[] = [];
  codigoConvite = '';
  conviteDigitado = '';
  conviteValidando = false;
  conviteErro = '';
  loading = false;
  error: string | null = null;
  validationSummary: string[] = [];
  serverErrorMessages: string[] = [];
  showPassword = false;
  showPasswordConfirmation = false;

  constructor(
    private readonly fb: FormBuilder,
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly route: ActivatedRoute
  ) {
    this.form = this.fb.group({
      nome: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      objetivoInicial: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      senha: ['', [Validators.required, Validators.minLength(6)]],
      senhaConfirmacao: ['', Validators.required]
    }, { validators: this.passwordsMatch });
  }

  ngOnInit(): void {
    this.authService.getExternalMethods().subscribe({
      next: methods => this.methods = methods,
      error: () => this.methods = { google: false, apple: false }
    });
    const code = this.route.snapshot.queryParamMap.get('convite');
    if (code) {
      this.conviteDigitado = code;
      this.validateInvite(code);
    }
    const external = this.route.snapshot.queryParamMap.get('externo');
    if (external === 'concluido') {
      this.step = 'method';
      this.loading = true;
      this.authService.completeExternalLogin().subscribe({
        next: () => this.router.navigate(['/dashboard']),
        error: () => {
          this.loading = false;
          this.error = 'Não foi possível concluir o acesso. Tente novamente.';
        }
      });
    } else if (external === 'erro') {
      this.step = 'method';
      this.error = 'Não foi possível entrar com essa conta. Escolha outro método ou tente novamente.';
    } else if (external === 'conta-existente') {
      this.step = 'method';
      this.error = 'Este e-mail já tem uma conta. Entre com e-mail e senha. Para usar outro método de acesso, fale com o suporte.';
    }
  }

  get firstName(): string { return String(this.form.controls['nome'].value || '').trim().split(/\s+/)[0]; }
  get progress(): number { return ({ name: 1, welcome: 2, goal: 3, source: 4, method: 5, email: 5, invite: 5 })[this.step]; }

  continueFromName(): void {
    const control = this.form.controls['nome'];
    control.setValue(String(control.value || '').trim());
    if (control.invalid) { control.markAsTouched(); return; }
    this.moveTo('welcome');
  }

  selectGoal(value: OnboardingGoal): void {
    this.selectedGoals = this.selectedGoals.includes(value)
      ? this.selectedGoals.filter(goal => goal !== value)
      : [...this.selectedGoals, value];
    this.form.controls['objetivoInicial'].setValue(this.selectedGoals[0] || '');
    this.error = null;
  }
  selectSource(value: ReferralSource): void { this.origemConhecimento = value; this.error = null; }

  next(): void {
    if (this.step === 'welcome') this.moveTo('goal');
    else if (this.step === 'goal') {
      if (!this.selectedGoals.length) { this.error = 'Escolha pelo menos uma opção para continuar.'; return; }
      this.moveTo('source');
    } else if (this.step === 'source') {
      if (!this.origemConhecimento) { this.error = 'Escolha uma opção para continuar.'; return; }
      this.moveTo('method');
    }
  }

  back(): void {
    const previous: Record<Step, Step> = { name: 'name', welcome: 'name', goal: 'welcome', source: 'goal', method: 'source', email: 'method', invite: 'method' };
    this.moveTo(previous[this.step]);
  }

  chooseEmail(): void { this.moveTo('email'); }
  chooseInvite(): void { this.moveTo('invite'); }
  moveToMethod(): void { this.moveTo('method'); }

  startExternal(provider: 'google' | 'apple'): void {
    if (!this.methods[provider] || this.loading) return;
    this.authService.startExternalLogin(provider, {
      nome: String(this.form.controls['nome'].value).trim(),
      objetivoInicial: this.form.controls['objetivoInicial'].value,
      objetivosIniciais: this.selectedGoals,
      origemConhecimento: this.origemConhecimento,
      codigoConvite: this.codigoConvite
    });
  }

  applyInvite(): void {
    const entered = this.conviteDigitado.trim();
    let code = entered;
    if (/^https?:\/\//i.test(entered)) {
      try { code = new URL(entered).searchParams.get('convite') || ''; }
      catch { code = ''; }
    }
    this.validateInvite(code);
  }

  private validateInvite(code: string): void {
    this.conviteErro = '';
    if (!code) { this.conviteErro = 'Informe o código do convite.'; return; }
    this.conviteValidando = true;
    this.authService.validateInvite(code).subscribe({
      next: result => {
        this.conviteValidando = false;
        if (result.valido) {
          this.codigoConvite = code;
          if (this.form.controls['nome'].valid && this.form.controls['objetivoInicial'].valid && this.origemConhecimento)
            this.moveTo('method');
        }
        else { this.codigoConvite = ''; this.conviteErro = result.motivo || 'Este convite não está disponível.'; }
      },
      error: () => { this.conviteValidando = false; this.conviteErro = 'Não foi possível validar o convite agora.'; }
    });
  }

  onSubmit(): void {
    if (this.step !== 'email' || this.loading) return;
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
      nome: String(this.form.controls['nome'].value).trim(),
      objetivoInicial: this.form.controls['objetivoInicial'].value as OnboardingGoal,
      objetivosIniciais: this.selectedGoals,
      email: String(this.form.controls['email'].value).trim(),
      senha: this.form.controls['senha'].value as string,
      senhaConfirmacao: this.form.controls['senhaConfirmacao'].value as string,
      origemConhecimento: this.origemConhecimento || undefined,
      codigoConvite: this.codigoConvite || undefined
    };
    this.authService.register(payload).subscribe({
      next: () => { this.loading = false; this.router.navigate(['/dashboard']); },
      error: err => {
        this.serverErrorMessages = this.extractErrorMessages(err);
        this.error = this.serverErrorMessages.join(' ');
        this.loading = false;
      }
    });
  }

  togglePasswordVisibility(): void { this.showPassword = !this.showPassword; }
  togglePasswordConfirmationVisibility(): void { this.showPasswordConfirmation = !this.showPasswordConfirmation; }
  hasError(name: string, error: string): boolean { const control = this.form.get(name); return !!control && control.touched && control.hasError(error); }
  isInvalid(name: string): boolean { const control = this.form.get(name); return !!control && control.touched && control.invalid; }
  onFormInput(): void { this.error = null; this.serverErrorMessages = []; this.validationSummary = []; }

  private moveTo(step: Step): void { this.step = step; this.error = null; this.validationSummary = []; }

  private collectValidationSummary(): string[] {
    const messages: string[] = [];
    if (this.form.controls['email'].invalid) messages.push('Informe um e-mail válido.');
    if (this.form.controls['senha'].invalid) messages.push('A senha precisa ter pelo menos 6 caracteres.');
    if (this.form.controls['senhaConfirmacao'].invalid || this.form.hasError('passwordsMismatch')) messages.push('As senhas não conferem.');
    return messages;
  }

  private passwordsMatch(control: AbstractControl): { passwordsMismatch: true } | null {
    const password = control.get('senha')?.value;
    const confirmation = control.get('senhaConfirmacao')?.value;
    return password && confirmation && password !== confirmation ? { passwordsMismatch: true } : null;
  }

  private extractErrorMessages(err: any): string[] {
    const errors = err?.error?.errors;
    if (Array.isArray(errors?.Mensagens) && errors.Mensagens.length) return errors.Mensagens;
    if (errors && typeof errors === 'object') {
      const messages = Object.values(errors).flatMap(value => Array.isArray(value) ? value : [value]);
      const usable = messages.filter((value): value is string => typeof value === 'string' && value.trim().length > 0);
      if (usable.length) return usable;
    }
    const message = err?.error?.mensagem || err?.error?.message || err?.message;
    return [typeof message === 'string' && message.trim() ? message : 'Tente novamente em instantes.'];
  }
}
