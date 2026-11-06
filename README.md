# opti-sales-portal

> sales bounded context: web UI (remote)

Part of the **LMS Library** distributed system — team `lms-library`, Grupo 2.
Governance and documentation live in [`library-docs`](https://github.com/code-corhuila/library-docs).

## Branching

Three permanent branches. **None of them accepts a direct commit** — you enter through a child
branch and leave through a Pull Request.

```
develop  <--PR--  feat/... fix/... chore/...
qa       <--PR--  qa/...
main     <--PR--  release/...  hotfix/...
```

Promotion happens **by re-application** (`git cherry-pick -x`), never by merging one permanent
branch into another: `merge develop -> qa` and `merge qa -> main` do not exist in this model.

`main` requires **1 approval from `ariel5253`**. On `develop` and `qa` the team sets its own review
rule.

Full policy: `00-governance/branching-policy.md` in `library-docs`.

## Factura PDF y pagos de prueba

La ficha de orden/factura descarga el documento interno PDF y advierte que no es una factura fiscal certificada. PSE/tarjeta muestran un SMS **simulado**, su código de prueba, caducidad y límite de intentos; no solicitan teléfonos ni datos bancarios/tarjetas. Las transferencias, Nequi y Daviplata requieren adjunto ficticio PDF/PNG/JPEG hasta 2 MiB, validado antes del envío y nuevamente por la API. Los pagos con `hasReceipt` permiten descarga privada; los registros antiguos siguen visibles.

Requiere la actualización coordinada de `opti-front`, `opti-sales-api`, V020 de `opti-sales-db` y el límite de pagos de `opti-api-gateway`. El código simulado reside en una instancia de la API y se pierde al reiniciar: revisar historial ante respuestas inciertas antes de iniciar otro pago. No hay cobros, proveedores ni SMS reales.

`npm test` y `npm run build`; revisión Chromium con datos ficticios de descarga, OTP, adjunto ausente/tipo inválido/válido. No se modifican reportes HU-24.
