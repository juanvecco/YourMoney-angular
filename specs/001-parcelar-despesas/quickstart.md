# Quickstart: Parcelar Despesas

## Prerequisites

- Backend API available at `https://localhost:5001/api`.
- User account with access to at least one conta financeira and one despesa category.
- Frontend dependencies installed.

## Development Flow

1. Confirm the current feature context:

   ```powershell
   Get-Content .specify\feature.json
   ```

2. Implement the typed expense/installment model and `DespesaService.criarParcelamento`.

3. Re-enable or replace authenticated token propagation in `app.config.ts` and `token.interceptor.ts`, then verify `/despesas` remains protected by `AuthGuard`.

4. Add installment controls to the existing `Nova Despesa` modal:

   - mode for single versus parcelada expense
   - `quantidadeParcelas` input with 1..120 validation
   - preview of generated installment amounts and dates
   - success/error messages for parcelamento creation

5. Update the monthly expense list to display installment indicators when metadata is present.

6. Add tests for:

   - cent-based value distribution
   - end-of-month date generation
   - validation for invalid installment counts and values
   - typed service payload for `POST /Despesas/parcelamento`

7. Validate before completion:

   ```powershell
   npm run build
   npm test
   ```

## Manual Acceptance Check

1. Log in and open `/despesas`.
2. Create a parcelada expense for R$ 100,00 in 3 installments starting on 2026-05-31.
3. Confirm the preview sums to R$ 100,00 and dates clamp correctly across shorter months.
4. Save and verify a success message indicates 3 installments.
5. Move through future months and verify each installment appears in its own month with `1/3`, `2/3`, and `3/3`.
6. Try quantity `0`, quantity `121`, and value `0`; each should block save with clear validation.
