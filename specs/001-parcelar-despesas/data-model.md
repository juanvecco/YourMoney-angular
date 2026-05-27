# Data Model: Parcelar Despesas

## Despesa

Represents one financial expense visible in the monthly expense list.

**Fields**

- `id`: Unique identifier returned by the backend.
- `data`: Expense date in API date format.
- `mesReferencia`: Month reference used by monthly queries.
- `descricao`: User-facing description.
- `valor`: Expense value for this transaction.
- `idContaFinanceira`: Account identifier.
- `idCategoria`: Category identifier.
- `parcelamentoId`: Optional identifier linking installments from the same purchase.
- `numeroParcela`: Optional one-based installment number.
- `totalParcelas`: Optional total number of installments.
- `valorTotalParcelamento`: Optional original purchase total.

**Validation Rules**

- `descricao`, `data`, `mesReferencia`, `valor`, `idContaFinanceira`, and `idCategoria` are required for creation.
- `valor` must be greater than zero.
- Installment metadata is optional for normal expenses and required for installment-generated expenses.

## Parcelamento

Represents the logical group created from one installment purchase.

**Fields**

- `id`: Group identifier returned by the backend.
- `descricaoBase`: Description shared by generated installments.
- `valorTotal`: Total purchase amount provided by the user.
- `quantidadeParcelas`: Number of monthly installments.
- `dataInicial`: Date used for the first installment.
- `mesReferenciaInicial`: Reference month for the first installment.
- `idContaFinanceira`: Account applied to all installments.
- `idCategoria`: Category applied to all installments.
- `parcelas`: Ordered collection of generated `ParcelaDespesa` records.

**Validation Rules**

- `valorTotal` must be greater than zero.
- `quantidadeParcelas` must be an integer from 1 to 120.
- Dates must be valid and generate monthly installments.
- Sum of `parcelas.valor` must equal `valorTotal`.

## ParcelaDespesa

Represents one generated installment that also behaves like a regular `Despesa`.

**Fields**

- `numeroParcela`: One-based installment position.
- `totalParcelas`: Total installment count.
- `valor`: Value for this installment.
- `data`: Generated monthly expense date.
- `mesReferencia`: Month reference derived from `data`.
- `descricao`: Description presented in the list.
- `parcelamentoId`: Link to the parent `Parcelamento`.

**Validation Rules**

- `numeroParcela` must be between 1 and `totalParcelas`.
- `totalParcelas` must match the parent `Parcelamento.quantidadeParcelas`.
- `valor` must be greater than zero.
- Monthly dates must be sequential from `dataInicial`.

## State Transitions

```text
Draft form
  -> Validated single expense
  -> Saved expense

Draft form
  -> Validated parcelamento
  -> Preview generated
  -> Saving parcelamento
  -> Saved parcelamento with generated parcelas

Saving parcelamento
  -> Save failed with no success state shown
```
