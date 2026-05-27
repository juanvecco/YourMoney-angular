<!--
Sync Impact Report
Version change: template -> 1.0.0
Modified principles:
- PRINCIPLE_1_NAME -> I. Angular Standalone e Estrutura por Dominio
- PRINCIPLE_2_NAME -> II. Contratos REST Tipados
- PRINCIPLE_3_NAME -> III. Autenticacao e Rotas Protegidas
- PRINCIPLE_4_NAME -> IV. Qualidade, Testes e TypeScript Strict
- PRINCIPLE_5_NAME -> V. UI Financeira Consistente e Localizada
Added sections:
- Stack e Arquitetura Registradas
- Fluxo de Desenvolvimento
Removed sections:
- Nenhuma
Templates requiring updates:
- updated: .specify/templates/plan-template.md
- updated: .specify/templates/spec-template.md
- updated: .specify/templates/tasks-template.md
- reviewed: .specify/templates/checklist-template.md
- reviewed: README.md
- reviewed: AGENTS.md
Follow-up TODOs:
- Nenhum placeholder foi intencionalmente mantido.
-->
# YourMoneyAngular Constitution

## Core Principles

### I. Angular Standalone e Estrutura por Dominio
Toda nova interface MUST ser implementada como componente Angular standalone,
seguindo a estrutura existente em `src/app/components`, `src/app/navegacao`,
`src/app/services`, `src/app/guards`, `src/app/interceptors` e
`src/app/models`. Novas funcionalidades MUST preservar a separacao entre
pagina/componente, servico de dominio, modelos tipados e configuracao global.
NgModules novos sao proibidos sem justificativa documentada no plano da feature.

Rationale: o projeto ja usa `bootstrapApplication`, `ApplicationConfig` e
componentes standalone; manter esse padrao reduz complexidade e evita duas
arquiteturas Angular convivendo.

### II. Contratos REST Tipados
Toda comunicacao com backend MUST passar por servicos Angular injetaveis com
`providedIn: 'root'`, usando `HttpClient`, `Observable` e interfaces ou tipos
explicitos para payloads e respostas. Endpoints MUST derivar de
`environment.apiUrl`, e inconsistencias de casing, pluralizacao ou prefixos de
rota MUST ser resolvidas antes de expandir o contrato.

Rationale: a aplicacao depende de uma API REST externa em
`https://localhost:5001/api`; contratos tipados tornam alteracoes verificaveis
e reduzem erros silenciosos em fluxos financeiros.

### III. Autenticacao e Rotas Protegidas
Qualquer rota que exponha dados financeiros, configuracoes ou operacoes de
criacao, edicao ou exclusao MUST usar `AuthGuard` ou mecanismo equivalente
registrado no roteamento. O estado de autenticacao MUST ter expiracao valida,
logout consistente e propagacao do token para chamadas autenticadas; se o
interceptor JWT estiver desativado, a feature MUST registrar a razao no plano
ou reativar o fluxo de forma testada.

Rationale: receitas, despesas, investimentos e configuracoes sao dados
sensiveis do usuario; acesso sem guarda ou token inconsistente quebra o modelo
de seguranca da aplicacao.

### IV. Qualidade, Testes e TypeScript Strict
Toda mudanca MUST compilar com TypeScript strict e Angular strict templates.
Novas regras de negocio, guards, servicos e componentes com calculos financeiros
MUST incluir testes automatizados ou uma justificativa explicita no plano quando
o teste for adiado. Antes da conclusao, a feature MUST executar `npm run build`
e, quando houver testes, `npm test` ou comando equivalente documentado.

Rationale: o projeto esta configurado com `strict`, `strictTemplates` e Karma,
mas nao possui cobertura atual; cada mudanca deve melhorar a verificabilidade
em vez de ampliar a area sem testes.

### V. UI Financeira Consistente e Localizada
Novas telas MUST reutilizar os tokens e classes visuais existentes (`ym-*`,
variaveis SCSS, cores de sucesso/perigo/aviso/investimento) e respeitar o locale
`pt-BR` para datas, moeda e exibicao numerica. Fluxos de formulario MUST tratar
estado de carregamento, validacao, sucesso, erro e confirmacao destrutiva de
modo consistente com os componentes atuais.

Rationale: o produto e um aplicativo financeiro pessoal; consistencia visual,
legibilidade e localizacao correta reduzem erro operacional para o usuario.

## Stack e Arquitetura Registradas

- Aplicacao Angular 20 standalone, iniciada por `bootstrapApplication`.
- Configuracao global em `src/app/app.config.ts`, com `provideRouter`,
  `provideHttpClient`, `FormsModule`, `CommonModule` e `LOCALE_ID` `pt-BR`.
- Roteamento em `src/app/app.routes.ts`, com paginas publicas e rotas privadas
  protegidas por `AuthGuard`.
- Servicos de dominio para autenticacao, receitas, despesas, investimentos,
  disponivel, categorias, contas e configuracao.
- Backend REST configurado por `src/environments/environment.ts` em
  `https://localhost:5001/api`.
- UI com SCSS global em `src/styles/_variables.scss`, Angular Material/CDK,
  Bootstrap Icons, SweetAlert2 e Chart.js.
- Build e desenvolvimento por Angular CLI: `npm start`, `npm run build` e
  `npm test`.
- Ambiente containerizado opcional com Node 22 Alpine e porta 4200 via Docker.

## Fluxo de Desenvolvimento

Planos de feature MUST declarar o impacto em rotas, componentes standalone,
servicos REST, modelos, autenticacao, estado de formulario e testes. Tarefas
MUST ser organizadas por historia de usuario e incluir caminhos reais dentro de
`src/app` e `src/styles`.

Mudancas em contratos REST MUST documentar endpoints, payloads, respostas,
tratamento de erro e necessidade de token. Mudancas financeiras MUST explicitar
regras de calculo, arredondamento, datas de referencia e comportamento para
dados vazios.

Revisoes MUST verificar aderencia a esta constituicao, especialmente:
componentes standalone, uso correto de `environment.apiUrl`, protecao de rotas,
TypeScript strict, testes/justificativas, consistencia visual e locale `pt-BR`.

## Governance

Esta constituicao prevalece sobre praticas informais do projeto. Qualquer
excecao MUST ser registrada no `plan.md` da feature, com motivo, risco e plano
de remocao ou normalizacao.

Alteracoes nesta constituicao MUST incluir um Sync Impact Report, revisar os
templates em `.specify/templates`, e atualizar documentacao operacional quando
os principios mudarem. A versao segue SemVer: MAJOR para remocao ou redefinicao
incompativel de principios, MINOR para novos principios ou secoes materiais, e
PATCH para clarificacoes sem mudanca de governanca.

Toda feature MUST passar pelo Constitution Check antes da pesquisa/design e
novamente antes da implementacao. Nao conformidades bloqueiam a implementacao
ate serem corrigidas ou justificadas no plano.

**Version**: 1.0.0 | **Ratified**: 2026-05-26 | **Last Amended**: 2026-05-26
