import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PageHeaderComponent } from '../shared/page-header/page-header';
import { AdminUsuariosService, PaginaUsuariosAdmin } from '../../services/admin-usuarios.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-usuarios-admin-page',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent],
  templateUrl: './usuarios-admin-page.html',
  styleUrl: './usuarios-admin-page.css',
})
export class UsuariosAdminPageComponent implements OnInit {
  busca = '';
  buscaAplicada = '';
  pagina = 1;
  resultado: PaginaUsuariosAdmin | null = null;
  carregando = false;
  erro = '';
  redefinindoId = '';
  mensagemRedefinicao = '';
  private revisao = 0;

  constructor(
    private readonly usuarios: AdminUsuariosService,
    private readonly auth: AuthService,
  ) {}

  ngOnInit(): void { this.carregar(); }

  pesquisar(): void {
    this.buscaAplicada = this.busca.trim();
    this.pagina = 1;
    this.carregar();
  }

  irPara(pagina: number): void {
    if (pagina < 1 || pagina > this.totalPaginas || pagina === this.pagina) return;
    this.pagina = pagina;
    this.carregar();
  }

  get totalPaginas(): number {
    return Math.ceil((this.resultado?.total ?? 0) / 25);
  }

  enviarRedefinicao(id: string, email: string): void {
    if (this.redefinindoId) return;
    this.redefinindoId = id;
    this.mensagemRedefinicao = '';
    this.auth.requestPasswordReset({ email }).subscribe({
      next: () => {
        this.redefinindoId = '';
        this.mensagemRedefinicao = `Solicitação de redefinição registrada para ${email}.`;
      },
      error: () => {
        this.redefinindoId = '';
        this.mensagemRedefinicao = 'Não foi possível solicitar a redefinição agora.';
      },
    });
  }

  carregar(): void {
    const revisao = ++this.revisao;
    this.carregando = true;
    this.erro = '';
    this.usuarios.listar(this.pagina, this.buscaAplicada).subscribe({
      next: resultado => {
        if (revisao !== this.revisao) return;
        this.resultado = resultado;
        this.carregando = false;
      },
      error: () => {
        if (revisao !== this.revisao) return;
        this.carregando = false;
        this.erro = 'Não foi possível carregar os usuários. Tente novamente.';
      },
    });
  }
}
