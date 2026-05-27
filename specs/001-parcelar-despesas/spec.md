# Feature Specification: Parcelar Despesas

**Feature Branch**: `001-parcelar-despesas`

**Created**: 2026-05-26

**Status**: Draft

**Input**: User description: "Permitir parcelar despesas"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Registrar despesa parcelada (Priority: P1)

Como usuario autenticado, quero registrar uma despesa informando valor total, quantidade de parcelas e data inicial, para que o sistema distribua os lancamentos mensais sem que eu precise criar cada despesa manualmente.

**Why this priority**: Esta e a capacidade central da feature; sem ela, o usuario continua tendo retrabalho e maior risco de erro ao controlar compras parceladas.

**Independent Test**: Pode ser testada criando uma despesa parcelada com dados validos e verificando que todas as parcelas previstas aparecem com valores, vencimentos e identificacao consistentes.

**Acceptance Scenarios**:

1. **Given** um usuario autenticado preenchendo uma nova despesa, **When** ele informa valor total, categoria, conta, data inicial e 3 parcelas, **Then** o sistema cria 3 despesas relacionadas, uma para cada mes, mantendo o total financeiro informado.
2. **Given** uma compra parcelada cujo valor total nao divide igualmente pela quantidade de parcelas, **When** o usuario confirma o cadastro, **Then** o sistema distribui os centavos de forma que a soma das parcelas seja exatamente igual ao valor total.
3. **Given** uma despesa sem parcelamento, **When** o usuario mantem a quantidade de parcelas como 1, **Then** o sistema registra apenas uma despesa comum.

---

### User Story 2 - Visualizar e reconhecer parcelas (Priority: P2)

Como usuario autenticado, quero identificar no historico quais despesas pertencem a um parcelamento e qual parcela estou vendo, para entender meu comprometimento mensal e evitar duplicidade de lancamentos.

**Why this priority**: Depois de criar parcelas, o usuario precisa reconhecer facilmente o impacto delas nos meses seguintes para confiar nos saldos e relatorios.

**Independent Test**: Pode ser testada consultando a lista de despesas apos criar um parcelamento e verificando que cada item mostra sua posicao no conjunto, como "2/6", sem perder as informacoes financeiras existentes.

**Acceptance Scenarios**:

1. **Given** uma despesa parcelada em 6 vezes, **When** o usuario consulta despesas de um mes que contem uma parcela, **Then** a despesa exibe uma indicacao clara da parcela atual e do total de parcelas.
2. **Given** despesas parceladas e despesas comuns na mesma lista, **When** o usuario visualiza o historico, **Then** as despesas comuns continuam legiveis e as parceladas podem ser diferenciadas sem alterar os valores exibidos.

---

### User Story 3 - Validar limites do parcelamento (Priority: P3)

Como usuario autenticado, quero receber mensagens claras quando tento informar um parcelamento invalido, para corrigir os dados antes de afetar meu controle financeiro.

**Why this priority**: Validacoes reduzem erros financeiros, mas dependem da existencia do fluxo principal de cadastro.

**Independent Test**: Pode ser testada tentando criar despesas com quantidade de parcelas invalida, valor ausente, valor zero, data inicial ausente ou dados obrigatorios incompletos.

**Acceptance Scenarios**:

1. **Given** um usuario criando uma despesa parcelada, **When** ele informa quantidade de parcelas menor que 1, **Then** o sistema impede o cadastro e explica que a quantidade deve ser pelo menos 1.
2. **Given** um usuario criando uma despesa parcelada, **When** ele informa valor total zero ou negativo, **Then** o sistema impede o cadastro e solicita um valor valido.
3. **Given** uma tentativa de cadastro com falha no salvamento, **When** o erro ocorre, **Then** nenhuma criacao parcial deve ficar apresentada como concluida para o usuario.

### Edge Cases

- Valor total com centavos que nao divide igualmente entre as parcelas deve manter a soma exata do valor original.
- Datas iniciais no fim do mes devem gerar vencimentos mensais previsiveis, preservando o dia quando possivel e ajustando para o ultimo dia valido quando o mes nao tiver o mesmo dia.
- Quantidade de parcelas muito alta deve ser limitada por uma regra clara para evitar lancamentos acidentais em excesso.
- Alterar a quantidade de parcelas antes de salvar deve recalcular a previsao exibida ao usuario.
- Falha ao salvar uma ou mais parcelas deve retornar erro claro e nao indicar sucesso parcial como se o parcelamento estivesse completo.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST permitir que usuarios autenticados escolham entre cadastrar despesa unica ou parcelada ao registrar uma despesa.
- **FR-002**: O sistema MUST permitir informar quantidade de parcelas quando a despesa for parcelada.
- **FR-003**: O sistema MUST validar que a quantidade de parcelas seja um numero inteiro entre 1 e 120.
- **FR-004**: O sistema MUST calcular o valor de cada parcela a partir do valor total informado, garantindo que a soma das parcelas seja exatamente igual ao valor total.
- **FR-005**: O sistema MUST gerar uma despesa para cada parcela, mantendo categoria, conta, descricao base, observacoes relevantes e demais classificacoes financeiras informadas no cadastro original.
- **FR-006**: O sistema MUST atribuir datas mensais sequenciais para as parcelas a partir da data inicial escolhida.
- **FR-007**: O sistema MUST identificar cada parcela com sua posicao e total de parcelas, por exemplo "1/3", "2/3" e "3/3".
- **FR-008**: O sistema MUST permitir que uma despesa com 1 parcela continue sendo tratada como despesa comum.
- **FR-009**: O sistema MUST exibir mensagem de sucesso informando quantas parcelas foram criadas quando o cadastro parcelado for concluido.
- **FR-010**: O sistema MUST impedir o cadastro quando valor, data, conta, categoria ou quantidade de parcelas obrigatoria estiver invalido.
- **FR-011**: O sistema MUST preservar a experiencia atual de cadastro, listagem e consulta de despesas comuns.
- **FR-012**: O sistema MUST exibir despesas parceladas nas mesmas consultas mensais em que despesas comuns ja aparecem, respeitando a data de cada parcela.

### Architecture & Security Requirements *(mandatory for implementation planning)*

- **ASR-001**: A feature afeta dados financeiros autenticados; cadastro, listagem e qualquer visualizacao de despesas parceladas devem permanecer acessiveis apenas a usuarios autenticados em rotas protegidas.
- **ASR-002**: As interacoes REST necessarias devem cobrir a criacao de uma despesa parcelada ou a criacao coordenada de multiplas despesas, incluindo dados da despesa base, quantidade de parcelas, valores calculados, datas de vencimento, resposta de sucesso com parcelas criadas e estados de erro para validacao, autorizacao e falha de persistencia.
- **ASR-003**: Os calculos financeiros devem usar moeda em `pt-BR`, duas casas decimais, soma exata das parcelas, distribuicao deterministica de centavos e datas mensais baseadas na data inicial.
- **ASR-004**: A interface deve contemplar estados de carregamento, vazio, erro de validacao, erro de salvamento, sucesso apos criacao e confirmacao quando uma acao puder substituir ou descartar dados ja preenchidos.

### Key Entities

- **Despesa**: Representa um compromisso financeiro do usuario, com valor, data, descricao, categoria, conta e demais classificacoes ja usadas no controle de despesas.
- **Parcelamento**: Representa o agrupamento logico de despesas geradas a partir de uma compra parcelada, com quantidade total de parcelas, identificador do grupo, descricao base e valor total original.
- **Parcela de Despesa**: Representa uma despesa individual dentro de um parcelamento, com numero da parcela, total de parcelas, valor da parcela e data de referencia.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Usuarios conseguem registrar uma despesa parcelada de ate 12 parcelas em menos de 2 minutos.
- **SC-002**: Em 100% dos parcelamentos criados, a soma dos valores das parcelas corresponde exatamente ao valor total informado pelo usuario.
- **SC-003**: Pelo menos 95% das tentativas com dados invalidos exibem uma mensagem de correcao clara antes de qualquer salvamento.
- **SC-004**: Despesas parceladas aparecem no mes correto em 100% dos casos testados com datas iniciais comuns e datas no fim do mes.
- **SC-005**: O retrabalho de cadastrar manualmente compras parceladas e reduzido em pelo menos 80% para usuarios que registram despesas recorrentes de cartao ou financiamento.

## Assumptions

- O usuario que registra despesas ja esta autenticado e possui acesso as mesmas contas, categorias e campos usados no cadastro atual de despesas.
- O valor informado para uma despesa parcelada representa o valor total da compra, nao o valor de cada parcela.
- O limite inicial de parcelamento sera de 120 parcelas para cobrir compras longas sem permitir geracao acidental ilimitada.
- Parcelas serao mensais e sequenciais; outros intervalos, como semanal ou quinzenal, ficam fora do escopo desta feature.
- A edicao ou exclusao em massa de todas as parcelas de um grupo fica fora do escopo inicial, salvo se ja existir comportamento equivalente para despesas comuns.
