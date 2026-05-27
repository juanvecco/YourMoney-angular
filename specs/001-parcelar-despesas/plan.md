# Implementation Plan: Parcelar Despesas

**Branch**: `001-parcelar-despesas` | **Date**: 2026-05-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-parcelar-despesas/spec.md`

## Summary

Enable authenticated users to register an expense as a single transaction or as monthly installments. The implementation extends the existing standalone despesas page and `DespesaService` with typed parcelamento models, deterministic cent-based installment calculation, a protected REST contract for creating installments atomically, and UI affordances to preview and recognize installment numbers in the monthly expense list.

## Technical Context

**Language/Version**: TypeScript 5.8.2 with Angular 20.1 standalone components and Angular strict templates

**Primary Dependencies**: Angular Common/Forms/Router/HttpClient, RxJS 7.8, SweetAlert2, Bootstrap Icons, existing `ym-*` SCSS tokens

**Storage**: External REST backend at `environment.apiUrl` (`https://localhost:5001/api`); frontend stores no installment data beyond current component state and authenticated local session metadata

**Testing**: Angular CLI build via `npm run build`; Karma/Jasmine via `npm test` for calculation helpers, `DespesaService` request contracts, and `DespesasComponent` validation/preview behavior

**Target Platform**: Browser-based Angular application served by Angular CLI or Docker on port 4200

**Project Type**: Single Angular web application consuming a REST API

**Performance Goals**: Creating or previewing up to 120 installments completes immediately from the user's perspective; monthly expense reload remains bounded to the selected month and should not add extra round trips beyond the create action and existing refresh

**Constraints**: Preserve `pt-BR` currency/date behavior; use two decimal places and exact total preservation; keep `/despesas` protected by `AuthGuard`; use injectable typed services and `environment.apiUrl`; reactivate or replace token propagation before relying on authenticated expense creation

**Scale/Scope**: One existing page (`/despesas`), one domain service, expense models, focused styles, and feature-specific tests; installment edit/delete in bulk remains out of scope for this feature

## Constitution Check

*GATE: Passed before Phase 0 research. Re-check after Phase 1 design: Passed.*

- **Angular standalone/domain structure**: Passed. Work stays in existing standalone `src/app/components/despesas/despesas-page/*`, injectable service `src/app/services/despesa.ts`, optional shared model file under `src/app/models/`, existing route `src/app/app.routes.ts`, and existing global/page styles. No NgModule will be added.
- **Typed REST contracts**: Passed. Plan defines typed request/response contracts for `POST {environment.apiUrl}/Despesas/parcelamento` plus existing `GET /Despesas/por-referencia`, with validation/auth/persistence error states in `contracts/despesas-parcelamento.md`.
- **Authentication and protected routes**: Passed with required remediation. `/despesas` is already protected by `AuthGuard`; implementation must also re-enable or replace token propagation in `src/app/app.config.ts`/`src/app/interceptors/token.interceptor.ts` before exercising authenticated parcelamento calls.
- **Quality and tests**: Passed. Add unit tests for installment calculation/date rules, component validation/preview decisions, and service contract payloads. Run `npm run build` before completion; run `npm test` when tests are present.
- **Financial UI and localization**: Passed. UI will reuse `ym-*` classes/tokens, danger accent for despesas, Bootstrap Icons, SweetAlert2 states, and `pt-BR` currency/date formatting.

## Project Structure

### Documentation (this feature)

```text
specs/001-parcelar-despesas/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── despesas-parcelamento.md
└── tasks.md              # Created later by /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── app.config.ts                         # re-enable/register authenticated HTTP token propagation
│   ├── app.routes.ts                         # verify /despesas remains AuthGuard-protected
│   ├── components/
│   │   └── despesas/
│   │       └── despesas-page/
│   │           ├── despesas-page.ts          # form state, installment preview, validation, save flow
│   │           ├── despesas-page.html        # parcelamento controls and installment badge/list display
│   │           ├── despesas-page.scss        # page-specific layout refinements if needed
│   │           └── despesas-page.spec.ts     # component behavior tests
│   ├── interceptors/
│   │   └── token.interceptor.ts              # active token propagation and 401 handling
│   ├── models/
│   │   └── despesa.model.ts                  # typed expense/installment payloads if split from service
│   └── services/
│       ├── despesa.ts                        # typed REST methods and exported interfaces
│       └── despesa.spec.ts                   # service contract tests
├── environments/
│   └── environment.ts
└── styles/
    └── _variables.scss                       # existing tokens reused; no new theme system
```

```text
src/**/*.spec.ts
```

**Structure Decision**: Implement inside the existing despesas domain boundary. Keep the page as a standalone component with FormsModule, keep REST access in `DespesaService`, and introduce `src/app/models/despesa.model.ts` only if the number of parcelamento interfaces makes the service file harder to scan. The route structure stays unchanged because `/despesas` already represents the target workflow.

## Complexity Tracking

No constitution violations or added architectural complexity are planned.
