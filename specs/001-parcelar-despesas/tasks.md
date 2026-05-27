# Tasks: Parcelar Despesas

**Input**: Design documents from `/specs/001-parcelar-despesas/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/despesas-parcelamento.md, quickstart.md

**Tests**: Included because the plan and quickstart require tests for financial calculation, date generation, validation, and typed service payloads.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it touches different files or has no dependency on incomplete tasks
- **[Story]**: Maps task to a user story from spec.md
- Every task includes an exact repository file path

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare the Angular expense domain for typed installment work.

- [x] T001 Review current expense form, batch flow, and route protection in `src/app/components/despesas/despesas-page/despesas-page.ts`, `src/app/components/despesas/despesas-page/despesas-page.html`, and `src/app/app.routes.ts`
- [x] T002 [P] Create or update shared expense/installment interfaces in `src/app/models/despesa.model.ts`
- [x] T003 [P] Add a focused financial installment calculation helper scaffold in `src/app/components/despesas/despesas-page/despesas-page.ts`
- [x] T004 [P] Add initial service test harness for expense REST methods in `src/app/services/despesa.spec.ts`
- [x] T005 [P] Add initial component test harness for the expenses page in `src/app/components/despesas/despesas-page/despesas-page.spec.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core contracts, security, and calculation rules that must be ready before user stories.

**CRITICAL**: No user story implementation should begin until this phase is complete.

- [x] T006 Move or import `Despesa`, `ContaFinanceira`, `Categoria`, `CriarDespesaRequest`, `CriarParcelamentoRequest`, `CriarParcelamentoResponse`, and `ParcelaDespesa` types through `src/app/models/despesa.model.ts` and `src/app/services/despesa.ts`
- [x] T007 Implement typed `criarParcelamento(request)` using `POST ${environment.apiUrl}/Despesas/parcelamento` in `src/app/services/despesa.ts`
- [x] T008 [P] Extend `Despesa` typing with optional `parcelamentoId`, `numeroParcela`, `totalParcelas`, and `valorTotalParcelamento` in `src/app/models/despesa.model.ts`
- [x] T009 Reactivate or replace bearer token propagation in `src/app/interceptors/token.interceptor.ts` and register it in `src/app/app.config.ts`
- [x] T010 [P] Add service contract tests for `criarParcelamento` URL, payload, and response typing in `src/app/services/despesa.spec.ts`
- [x] T011 [P] Add calculation tests for cent distribution and end-of-month clamping in `src/app/components/despesas/despesas-page/despesas-page.spec.ts`
- [x] T012 Verify `/despesas` remains protected by `AuthGuard` in `src/app/app.routes.ts`

**Checkpoint**: Foundation ready; user story implementation can begin.

---

## Phase 3: User Story 1 - Registrar despesa parcelada (Priority: P1) MVP

**Goal**: Users can create a parcelada expense by entering total value, initial date, account, category, and installment count.

**Independent Test**: Create a valid R$ 100,00 expense in 3 installments and verify the preview plus save request contains three monthly installments whose values sum to R$ 100,00.

### Tests for User Story 1

- [x] T013 [P] [US1] Add component tests for switching between single and parcelada modes in `src/app/components/despesas/despesas-page/despesas-page.spec.ts`
- [x] T014 [P] [US1] Add component tests for previewing 3 installments with exact total preservation in `src/app/components/despesas/despesas-page/despesas-page.spec.ts`
- [x] T015 [P] [US1] Add service test for successful `criarParcelamento` response handling in `src/app/services/despesa.spec.ts`

### Implementation for User Story 1

- [x] T016 [US1] Add parcelamento form state fields for mode, `quantidadeParcelas`, generated preview, and saving state in `src/app/components/despesas/despesas-page/despesas-page.ts`
- [x] T017 [US1] Implement cent-based installment value distribution and monthly date generation in `src/app/components/despesas/despesas-page/despesas-page.ts`
- [x] T018 [US1] Add parcelamento controls and preview list to the `Nova Despesa` modal in `src/app/components/despesas/despesas-page/despesas-page.html`
- [x] T019 [US1] Update `salvarDespesa()` to call `DespesaService.criarParcelamento` for parcelada mode and keep existing `criarDespesa` behavior for single expenses in `src/app/components/despesas/despesas-page/despesas-page.ts`
- [x] T020 [US1] Show success messaging with created installment count and refresh monthly expenses after parcelamento save in `src/app/components/despesas/despesas-page/despesas-page.ts`
- [x] T021 [US1] Preserve existing batch and edit flows when parcelamento mode is disabled or `editando` is true in `src/app/components/despesas/despesas-page/despesas-page.ts`
- [x] T022 [US1] Add page-specific preview spacing and responsive refinements using existing `ym-*` classes in `src/app/components/despesas/despesas-page/despesas-page.scss`

**Checkpoint**: User Story 1 is fully functional and independently testable.

---

## Phase 4: User Story 2 - Visualizar e reconhecer parcelas (Priority: P2)

**Goal**: Users can identify installment expenses in the monthly list and see the current installment number and total.

**Independent Test**: After loading a monthly list with one installment expense, verify the item displays an indicator such as `Parcela 2/6` while normal expenses remain unchanged.

### Tests for User Story 2

- [x] T023 [P] [US2] Add component tests for rendering installment metadata when `numeroParcela` and `totalParcelas` are present in `src/app/components/despesas/despesas-page/despesas-page.spec.ts`
- [x] T024 [P] [US2] Add component tests proving normal expenses render without installment badges in `src/app/components/despesas/despesas-page/despesas-page.spec.ts`

### Implementation for User Story 2

- [x] T025 [US2] Add helper methods for installment label visibility and text in `src/app/components/despesas/despesas-page/despesas-page.ts`
- [x] T026 [US2] Render installment indicators in the expense list metadata in `src/app/components/despesas/despesas-page/despesas-page.html`
- [x] T027 [US2] Ensure monthly sorting, totals, account totals, and category display continue using each installment as a normal expense in `src/app/components/despesas/despesas-page/despesas-page.ts`
- [x] T028 [US2] Style installment indicators with existing chip/list patterns in `src/app/components/despesas/despesas-page/despesas-page.scss`

**Checkpoint**: User Stories 1 and 2 both work independently.

---

## Phase 5: User Story 3 - Validar limites do parcelamento (Priority: P3)

**Goal**: Users receive clear validation and error feedback before invalid installment data affects their financial records.

**Independent Test**: Try quantities `0` and `121`, value `0`, and a failed save response; each invalid case blocks or reports failure without showing success.

### Tests for User Story 3

- [x] T029 [P] [US3] Add component tests for invalid installment quantities below 1 and above 120 in `src/app/components/despesas/despesas-page/despesas-page.spec.ts`
- [x] T030 [P] [US3] Add component tests for zero or negative total value in parcelada mode in `src/app/components/despesas/despesas-page/despesas-page.spec.ts`
- [x] T031 [P] [US3] Add component tests for parcelamento save failure messaging with no success state in `src/app/components/despesas/despesas-page/despesas-page.spec.ts`

### Implementation for User Story 3

- [x] T032 [US3] Extend required-field validation to include parcelamento mode and `quantidadeParcelas` rules in `src/app/components/despesas/despesas-page/despesas-page.ts`
- [x] T033 [US3] Disable or prevent parcelamento save while required fields are invalid or preview generation fails in `src/app/components/despesas/despesas-page/despesas-page.html`
- [x] T034 [US3] Add clear SweetAlert2 warning/error messages for invalid quantity, invalid value, and parcelamento save failure in `src/app/components/despesas/despesas-page/despesas-page.ts`
- [x] T035 [US3] Ensure failed `criarParcelamento` calls leave the modal open, preserve entered data, and do not clear preview or lote state in `src/app/components/despesas/despesas-page/despesas-page.ts`

**Checkpoint**: All user stories are independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, documentation alignment, and cleanup across stories.

- [x] T036 [P] Update implementation notes if endpoint behavior differs from the planned contract in `specs/001-parcelar-despesas/contracts/despesas-parcelamento.md`
- [x] T037 [P] Confirm quickstart manual acceptance steps still match implemented UI labels in `specs/001-parcelar-despesas/quickstart.md`
- [x] T038 Review code for strict template/type errors and remove unused imports in `src/app/components/despesas/despesas-page/despesas-page.ts` and `src/app/services/despesa.ts`
- [x] T039 Run `npm run build` from repository root and fix any build errors in affected Angular files
- [x] T040 Run `npm test` from repository root and fix any failing specs in `src/app/services/despesa.spec.ts` and `src/app/components/despesas/despesas-page/despesas-page.spec.ts`
- [ ] T041 Execute the manual acceptance checklist from `specs/001-parcelar-despesas/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies; can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion; blocks all user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational completion; this is the MVP.
- **User Story 2 (Phase 4)**: Depends on Foundational completion and can use mocked loaded expenses, but is most useful after US1 metadata exists.
- **User Story 3 (Phase 5)**: Depends on Foundational completion and validates the US1 save path.
- **Polish (Phase 6)**: Depends on all desired user stories being complete.

### User Story Dependencies

- **US1 Registrar despesa parcelada**: Starts after Phase 2 and delivers the MVP.
- **US2 Visualizar e reconhecer parcelas**: Starts after Phase 2; independent test can use mocked `Despesa` data with installment metadata.
- **US3 Validar limites do parcelamento**: Starts after Phase 2; most validation integrates with US1 form state and save path.

### Within Each User Story

- Write story tests before implementation tasks.
- Types and service contracts must exist before component save integration.
- Calculation helpers must exist before preview rendering.
- UI rendering tasks should follow component state tasks when they touch the same file.
- Validate each story at its checkpoint before moving to lower-priority work.

## Parallel Opportunities

- T002, T003, T004, and T005 can run in parallel during setup.
- T008, T010, and T011 can run in parallel after model/service direction is agreed.
- US1 tests T013, T014, and T015 can run in parallel.
- US2 tests T023 and T024 can run in parallel.
- US3 tests T029, T030, and T031 can run in parallel.
- Documentation checks T036 and T037 can run in parallel during polish.

## Parallel Example: User Story 1

```text
Task: "T013 [P] [US1] Add component tests for switching between single and parcelada modes in src/app/components/despesas/despesas-page/despesas-page.spec.ts"
Task: "T014 [P] [US1] Add component tests for previewing 3 installments with exact total preservation in src/app/components/despesas/despesas-page/despesas-page.spec.ts"
Task: "T015 [P] [US1] Add service test for successful criarParcelamento response handling in src/app/services/despesa.spec.ts"
```

## Parallel Example: User Story 2

```text
Task: "T023 [P] [US2] Add component tests for rendering installment metadata when numeroParcela and totalParcelas are present in src/app/components/despesas/despesas-page/despesas-page.spec.ts"
Task: "T024 [P] [US2] Add component tests proving normal expenses render without installment badges in src/app/components/despesas/despesas-page/despesas-page.spec.ts"
```

## Parallel Example: User Story 3

```text
Task: "T029 [P] [US3] Add component tests for invalid installment quantities below 1 and above 120 in src/app/components/despesas/despesas-page/despesas-page.spec.ts"
Task: "T030 [P] [US3] Add component tests for zero or negative total value in parcelada mode in src/app/components/despesas/despesas-page/despesas-page.spec.ts"
Task: "T031 [P] [US3] Add component tests for parcelamento save failure messaging with no success state in src/app/components/despesas/despesas-page/despesas-page.spec.ts"
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 setup.
2. Complete Phase 2 foundation, especially typed models, `criarParcelamento`, token propagation, and calculation tests.
3. Complete Phase 3 for US1.
4. Stop and validate US1 independently with the R$ 100,00 in 3 installments scenario.

### Incremental Delivery

1. Deliver US1 so users can create parcelada expenses.
2. Deliver US2 so installment expenses are recognizable in the monthly list.
3. Deliver US3 to harden invalid inputs and failure feedback.
4. Complete polish with build, tests, and quickstart validation.

### Notes

- Keep backend implementation out of this repository unless a backend path is explicitly added later.
- Preserve existing single expense, edit, delete, and lote behavior while adding parcelamento.
- Use `pt-BR` formatting and existing `ym-*` visual patterns throughout.
- Avoid group edit/delete behavior unless a later spec expands scope.
