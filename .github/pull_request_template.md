## Historia de usuario
<!-- Referencia a la historia en el repositorio de documentacion: code-corhuila/opti-docs#NN -->

## Que cambia y por que


## Como se probo
<!-- Pruebas que cubren el cambio y resultado del flujo ci.yml -->

## Rastro de promocion
<!-- Solo hacia qa o main: commits re-aplicados, cada uno con su linea "(cherry picked from commit <sha>)" -->

## Lista de verificacion
- [ ] Sin secretos ni credenciales en el cambio
- [ ] El portal no crea su propio cliente HTTP ni maneja el token (usa `shell.api`)
- [ ] Cada vista tiene sus cuatro estados: cargando, error con reintento, vacio y datos
- [ ] Cada creacion usa `Idempotency-Key` (`shell.ui.useSubmit`) y el boton se deshabilita mientras hay un envio pendiente
