# Contract: Despesas Parcelamento

## Existing Monthly Query

`GET {environment.apiUrl}/Despesas/por-referencia?mes={mes}&ano={ano}`

**Purpose**: Return expenses for the selected month, including regular expenses and individual installments whose `mesReferencia` belongs to the requested month.

**Expected Response**

```json
[
  {
    "id": "string",
    "data": "2026-05-26",
    "mesReferencia": "2026-05-01",
    "descricao": "Notebook",
    "valor": 333.34,
    "idContaFinanceira": "string",
    "idCategoria": "string",
    "parcelamentoId": "string",
    "numeroParcela": 1,
    "totalParcelas": 3,
    "valorTotalParcelamento": 1000.00
  }
]
```

Installment metadata may be omitted or null for non-installment expenses.

## Create Installment Expense

`POST {environment.apiUrl}/Despesas/parcelamento`

**Purpose**: Create all installments for one purchase as one authenticated financial operation.

**Request**

```json
{
  "descricao": "Notebook",
  "valorTotal": 1000.00,
  "dataInicial": "2026-05-26",
  "mesReferenciaInicial": "2026-05-01",
  "quantidadeParcelas": 3,
  "idContaFinanceira": "string",
  "idCategoria": "string"
}
```

**Success Response**

```json
{
  "parcelamentoId": "string",
  "valorTotal": 1000.00,
  "quantidadeParcelas": 3,
  "parcelas": [
    {
      "id": "string",
      "data": "2026-05-26",
      "mesReferencia": "2026-05-01",
      "descricao": "Notebook",
      "valor": 333.34,
      "idContaFinanceira": "string",
      "idCategoria": "string",
      "parcelamentoId": "string",
      "numeroParcela": 1,
      "totalParcelas": 3,
      "valorTotalParcelamento": 1000.00
    },
    {
      "id": "string",
      "data": "2026-06-26",
      "mesReferencia": "2026-06-01",
      "descricao": "Notebook",
      "valor": 333.33,
      "idContaFinanceira": "string",
      "idCategoria": "string",
      "parcelamentoId": "string",
      "numeroParcela": 2,
      "totalParcelas": 3,
      "valorTotalParcelamento": 1000.00
    },
    {
      "id": "string",
      "data": "2026-07-26",
      "mesReferencia": "2026-07-01",
      "descricao": "Notebook",
      "valor": 333.33,
      "idContaFinanceira": "string",
      "idCategoria": "string",
      "parcelamentoId": "string",
      "numeroParcela": 3,
      "totalParcelas": 3,
      "valorTotalParcelamento": 1000.00
    }
  ]
}
```

**Error States**

- `400 Bad Request`: Missing required field, invalid amount, invalid date, or `quantidadeParcelas` outside 1..120.
- `401 Unauthorized`: Missing, expired, or invalid authentication token.
- `403 Forbidden`: Authenticated user cannot access the selected account/category.
- `409 Conflict`: Backend cannot create the full installment set consistently.
- `500 Server Error`: Unexpected persistence or server failure.

## Existing Single Expense Create

`POST {environment.apiUrl}/Despesas`

Continue using this endpoint when `quantidadeParcelas` is `1` or parcelamento mode is disabled.

## Frontend Type Expectations

- `DespesaService.criarParcelamento(request)` returns an observable of the success response above.
- All calls derive from `environment.apiUrl`.
- The request must be sent with the authenticated token once token propagation is re-enabled.
