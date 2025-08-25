import { Component, OnInit, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DespesaService, Despesa, Categoria } from '../../../services/despesa';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-cadastrar-despesa',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cadastrar-despesa.html'
})
export class CadastrarDespesaComponent implements OnInit {
  @Output() despesaCadastrada = new EventEmitter<void>();
  despesas: Despesa[] = [];
  mesAtual: Date = new Date();
  totalDespesas = 0;

  novaDespesa = {
    descricao: '',
    valor: 0,
    data: new Date().toISOString().split('T')[0],
    idContaFinanceira: '',
    idTipoDespesa: '',
    idNaturezaDespesa: '',
    idCategoriaEspecifica: ''
  };

  contas: any[] = [];
  tiposDespesa: Categoria[] = [];
  naturezasDespesa: Categoria[] = [];
  categoriasEspecificas: Categoria[] = [];

  constructor(private despesaService: DespesaService) { }

  ngOnInit(): void {
    this.carregarContas();
    this.carregarTiposDespesa();
  }



  carregarContas() {
    this.despesaService.listarContas().subscribe({
      next: (contas) => this.contas = contas,
      error: (erro) => console.error('Erro ao carregar contas', erro)
    });
  }

  carregarTiposDespesa() {
    this.despesaService.listarCategorias().subscribe({
      next: (categorias: Categoria[]) => {
        this.tiposDespesa = categorias.filter(c => c.categoriaPaiId === null && c.tipoTransacao === 1);
        this.resetarHierarquia();
      },
      error: (erro: any) => console.error('Erro ao carregar tipos de despesa', erro)
    });
  }

  onTipoChange() {
    const tipoId = this.novaDespesa.idTipoDespesa;
    if (!tipoId) {
      this.naturezasDespesa = [];
      this.categoriasEspecificas = [];
      this.novaDespesa.idNaturezaDespesa = '';
      this.novaDespesa.idCategoriaEspecifica = '';
      return;
    }

    this.naturezasDespesa = this.despesaService.listarTodasCategorias
      .filter((c: Categoria) => c.categoriaPaiId === tipoId);

    this.novaDespesa.idNaturezaDespesa = '';
    this.novaDespesa.idCategoriaEspecifica = '';
    this.categoriasEspecificas = [];
  }

  onNaturezaChange() {
    const naturezaId = this.novaDespesa.idNaturezaDespesa;
    if (!naturezaId) {
      this.categoriasEspecificas = [];
      this.novaDespesa.idCategoriaEspecifica = '';
      return;
    }

    this.categoriasEspecificas = this.despesaService.listarTodasCategorias
      .filter((c: Categoria) => c.categoriaPaiId === naturezaId);

    this.novaDespesa.idCategoriaEspecifica = '';
  }

  resetarHierarquia() {
    this.naturezasDespesa = [];
    this.categoriasEspecificas = [];
    this.novaDespesa.idTipoDespesa = '';
    this.novaDespesa.idNaturezaDespesa = '';
    this.novaDespesa.idCategoriaEspecifica = '';
  }

  onSubmit() {
    if (!this.formValido()) return;

    const idCategoriaFinal = this.novaDespesa.idCategoriaEspecifica ||
      this.novaDespesa.idNaturezaDespesa ||
      this.novaDespesa.idTipoDespesa;

    const payload = {
      descricao: this.novaDespesa.descricao,
      valor: Number(this.novaDespesa.valor),
      data: this.novaDespesa.data,
      idContaFinanceira: this.novaDespesa.idContaFinanceira,
      idCategoria: idCategoriaFinal
    };

    this.despesaService.criarDespesa(payload).subscribe({
      next: () => {
        this.resetarFormulario();
        this.despesaCadastrada.emit();


        // ✅ Alerta mais elegante
        Swal.fire({
          icon: 'success',
          title: 'Despesa cadastrada!',
          text: 'Sua despesa foi registrada com sucesso.',
          confirmButtonColor: '#b49452',   // dourado premium
          background: '#f8f8f8',           // claro e elegante
          color: '#283b6b',                // azul presidente
        });
      },
      error: (erro) => {
        console.error('Erro ao salvar despesa', erro);
        Swal.fire({
          icon: 'error',
          title: 'Erro!',
          text: 'Não foi possível salvar a despesa.',
          confirmButtonColor: '#b49452',
          background: '#f8f8f8',
          color: '#283b6b',
        });
      }
    });
  }

  formValido(): boolean {
    return !!(
      this.novaDespesa.descricao &&
      this.novaDespesa.valor > 0 &&
      this.novaDespesa.data &&
      this.novaDespesa.idContaFinanceira &&
      (this.novaDespesa.idTipoDespesa || this.novaDespesa.idNaturezaDespesa || this.novaDespesa.idCategoriaEspecifica)
    );
  }

  resetarFormulario() {
    this.novaDespesa = {
      descricao: '',
      valor: 0,
      data: new Date().toISOString().split('T')[0],
      idContaFinanceira: '',
      idTipoDespesa: '',
      idNaturezaDespesa: '',
      idCategoriaEspecifica: ''
    };
    this.resetarHierarquia();
  }


}