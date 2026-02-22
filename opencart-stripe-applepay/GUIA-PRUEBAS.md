# 🧪 Guía de Pruebas - Stripe Apple Pay

Esta guía te ayudará a probar exhaustivamente la extensión antes de ponerla en producción.

## 🎴 Tarjetas de Prueba de Stripe

### ✅ Tarjetas que FUNCIONAN (Éxito)

#### Visa - Pago exitoso básico
```
Número: 4242 4242 4242 4242
Fecha: Cualquier fecha futura (ej: 12/34)
CVV: Cualquier 3 dígitos (ej: 123)
```

#### Visa - Requiere autenticación 3D Secure
```
Número: 4000 0027 6000 3184
Fecha: 12/34
CVV: 123
```
**Nota:** Se abrirá un diálogo de autenticación. Haz clic en "Complete authentication".

#### Mastercard - Pago exitoso
```
Número: 5555 5555 5555 4444
Fecha: 12/34
CVV: 123
```

#### American Express - Pago exitoso
```
Número: 3782 822463 10005
Fecha: 12/34
CVV: 1234 (4 dígitos para Amex)
```

### ❌ Tarjetas que FALLAN (Para probar errores)

#### Tarjeta Declinada - Fondos insuficientes
```
Número: 4000 0000 0000 9995
Fecha: 12/34
CVV: 123
Resultado: "Your card has insufficient funds."
```

#### Tarjeta Declinada - Genérico
```
Número: 4000 0000 0000 0002
Fecha: 12/34
CVV: 123
Resultado: "Your card was declined."
```

#### Tarjeta Declinada - CVV incorrecto
```
Número: 4000 0000 0000 0127
Fecha: 12/34
CVV: 123
Resultado: "Your card's security code is incorrect."
```

#### Tarjeta Expirada
```
Número: 4000 0000 0000 0069
Fecha: 12/34
CVV: 123
Resultado: "Your card has expired."
```

#### Autenticación 3D Secure - Falla
```
Número: 4000 0084 0000 1629
Fecha: 12/34
CVV: 123
Resultado: Diálogo de autenticación → Hacer clic en "Fail authentication"
```

## 📋 Casos de Prueba

### Test 1: Instalación Básica

**Objetivo:** Verificar que la extensión se instaló correctamente

- [ ] Ir a Admin → Extensiones → Modificaciones
- [ ] Buscar "Stripe Apple Pay - Product Page Button"
- [ ] Verificar que está en la lista
- [ ] Ir a Admin → Extensiones → Extensiones → Pagos
- [ ] Verificar que "Stripe Apple Pay" aparece con botón "Desinstalar"

**Resultado esperado:** ✅ Extensión instalada y visible

---

### Test 2: Configuración de Claves

**Objetivo:** Verificar que las claves se guardan correctamente

- [ ] Ir a Admin → Stripe Apple Pay → Editar
- [ ] Ingresar clave publicable de prueba
- [ ] Ingresar clave secreta de prueba
- [ ] Activar modo de prueba
- [ ] Guardar
- [ ] Volver a abrir la configuración
- [ ] Verificar que las claves se guardaron

**Resultado esperado:** ✅ Claves guardadas correctamente

---

### Test 3: Botón en Página de Producto

**Objetivo:** Verificar que el botón aparece en la ficha de producto

#### En Safari (Mac/iPhone):

- [ ] Abrir cualquier página de producto
- [ ] Verificar que aparece contenedor del botón Apple Pay
- [ ] Verificar que aparece el divisor "O"
- [ ] Verificar que el botón está ANTES del botón "Añadir al carrito"

**Resultado esperado:** ✅ Botón visible y bien posicionado

#### En Chrome/Firefox:

- [ ] Abrir cualquier página de producto
- [ ] Abrir consola (F12)
- [ ] Verificar mensaje: "Apple Pay not available" (normal)
- [ ] NO debería aparecer el botón (normal)

**Resultado esperado:** ✅ Comportamiento correcto (no Apple Pay en navegadores no-Apple)

---

### Test 4: Carga de JavaScript

**Objetivo:** Verificar que se cargan todos los scripts necesarios

- [ ] Abrir página de producto
- [ ] Abrir DevTools (F12) → Tab "Network"
- [ ] Recargar página
- [ ] Buscar: `js.stripe.com/v3/`
- [ ] Buscar: `stripe_applepay.js`
- [ ] Verificar que ambos cargan con código 200

**Resultado esperado:** ✅ Scripts cargados correctamente

---

### Test 5: Compra Simple (Safari + Apple Pay)

**Objetivo:** Realizar una compra básica exitosa

**Prerequisito:** Safari en Mac/iPhone con Apple Pay configurado

- [ ] Ir a página de producto
- [ ] Hacer clic en botón Apple Pay
- [ ] Verificar que se abre el diálogo de Apple Pay
- [ ] Seleccionar tarjeta de prueba Visa (4242...)
- [ ] Completar dirección de envío
- [ ] Confirmar pago
- [ ] Verificar redirección a página de éxito
- [ ] Ir a Admin → Ventas → Pedidos
- [ ] Verificar que se creó el pedido
- [ ] Verificar estado: "Procesando" (o configurado)
- [ ] Verificar comentario: "Paid via Apple Pay (Stripe)"

**Resultado esperado:** ✅ Pedido creado correctamente

---

### Test 6: Compra con Cantidad Múltiple

**Objetivo:** Verificar cálculo correcto con múltiples unidades

- [ ] Ir a página de producto
- [ ] Cambiar cantidad a 3
- [ ] Hacer clic en botón Apple Pay
- [ ] Verificar que el total muestra: precio × 3
- [ ] Completar pago
- [ ] Verificar pedido creado con cantidad: 3

**Resultado esperado:** ✅ Total calculado correctamente

---

### Test 7: Compra con Opciones de Producto

**Objetivo:** Verificar que las opciones del producto se incluyen

**Prerequisito:** Producto con opciones (talla, color, etc.)

- [ ] Ir a producto con opciones
- [ ] Seleccionar opción (ej: Talla: M, Color: Rojo)
- [ ] Hacer clic en Apple Pay
- [ ] Completar pago
- [ ] Verificar pedido creado
- [ ] Abrir detalles del pedido
- [ ] Verificar que las opciones seleccionadas aparecen correctamente

**Resultado esperado:** ✅ Opciones guardadas en el pedido

---

### Test 8: Tarjeta Declinada

**Objetivo:** Verificar manejo de errores de pago

- [ ] Ir a página de producto
- [ ] Hacer clic en Apple Pay
- [ ] Usar tarjeta de prueba declinada: 4000 0000 0000 0002
- [ ] Completar datos
- [ ] Intentar pagar
- [ ] Verificar mensaje de error: "Your card was declined"
- [ ] Verificar que NO se creó ningún pedido

**Resultado esperado:** ✅ Error mostrado correctamente, sin pedido creado

---

### Test 9: 3D Secure - Éxito

**Objetivo:** Verificar autenticación 3D Secure

- [ ] Ir a página de producto
- [ ] Usar tarjeta: 4000 0027 6000 3184
- [ ] Hacer clic en Apple Pay
- [ ] Se abrirá diálogo de autenticación
- [ ] Hacer clic en "Complete authentication"
- [ ] Verificar que el pago se completa
- [ ] Verificar que se crea el pedido

**Resultado esperado:** ✅ Autenticación exitosa y pedido creado

---

### Test 10: 3D Secure - Fallo

**Objetivo:** Verificar fallo en autenticación 3D Secure

- [ ] Ir a página de producto
- [ ] Usar tarjeta: 4000 0084 0000 1629
- [ ] Hacer clic en Apple Pay
- [ ] Se abrirá diálogo de autenticación
- [ ] Hacer clic en "Fail authentication"
- [ ] Verificar mensaje de error
- [ ] Verificar que NO se creó pedido

**Resultado esperado:** ✅ Autenticación fallida correctamente

---

### Test 11: Cálculo de Envío

**Objetivo:** Verificar que se calculan los gastos de envío

- [ ] Ir a página de producto
- [ ] Hacer clic en Apple Pay
- [ ] Cambiar dirección de envío a otra ciudad/país
- [ ] Verificar que el total se actualiza con gastos de envío
- [ ] Completar pago
- [ ] Verificar pedido con gastos de envío correctos

**Resultado esperado:** ✅ Envío calculado dinámicamente

---

### Test 12: Checkout Normal (No Apple Pay)

**Objetivo:** Verificar método de pago en checkout estándar

- [ ] Añadir producto al carrito
- [ ] Ir al checkout
- [ ] Completar datos de cliente
- [ ] Completar dirección
- [ ] En método de pago, seleccionar "Stripe Apple Pay"
- [ ] Debería aparecer formulario de tarjeta de Stripe
- [ ] Ingresar tarjeta: 4242 4242 4242 4242
- [ ] Completar pago
- [ ] Verificar pedido creado

**Resultado esperado:** ✅ Pago funciona en checkout normal

---

### Test 13: Usuario Registrado vs Invitado

**Objetivo:** Verificar compra con cuenta vs sin cuenta

#### Usuario Registrado:

- [ ] Iniciar sesión
- [ ] Ir a página de producto
- [ ] Completar compra con Apple Pay
- [ ] Verificar que el pedido está asociado a la cuenta
- [ ] Ir a "Mi cuenta" → "Historial de pedidos"
- [ ] Verificar que aparece el pedido

#### Invitado:

- [ ] Cerrar sesión
- [ ] Ir a página de producto
- [ ] Completar compra con Apple Pay
- [ ] Verificar que se crea como pedido de invitado
- [ ] Verificar que se guarda el email

**Resultado esperado:** ✅ Ambos casos funcionan correctamente

---

### Test 14: Múltiples Monedas

**Objetivo:** Verificar que funciona con diferentes monedas

**Prerequisito:** OpenCart configurado con múltiples monedas

- [ ] Cambiar moneda a EUR (€)
- [ ] Hacer compra de prueba
- [ ] Verificar en Stripe que el pago está en EUR
- [ ] Cambiar moneda a USD ($)
- [ ] Hacer compra de prueba
- [ ] Verificar en Stripe que el pago está en USD

**Resultado esperado:** ✅ Pagos en moneda correcta

---

### Test 15: Compatibilidad Journal 3

**Objetivo:** Verificar funcionamiento con Journal 3

**Prerequisito:** Tema Journal 3 instalado

- [ ] Activar tema Journal 3
- [ ] Ir a página de producto
- [ ] Verificar que el botón Apple Pay aparece correctamente
- [ ] Verificar que el estilo se adapta al tema
- [ ] Completar compra de prueba
- [ ] Todo debería funcionar normalmente

**Resultado esperado:** ✅ Compatible con Journal 3

---

### Test 16: Rendimiento y Carga

**Objetivo:** Verificar que no hay impacto en rendimiento

- [ ] Abrir DevTools → Tab "Network"
- [ ] Recargar página de producto
- [ ] Verificar tiempo de carga total
- [ ] Verificar que stripe_applepay.js carga en < 1 segundo
- [ ] Verificar que no hay errores 404

**Resultado esperado:** ✅ Sin impacto significativo en rendimiento

---

### Test 17: Validación de Datos

**Objetivo:** Verificar que se validan correctamente los datos

- [ ] Intentar compra sin seleccionar opciones requeridas
- [ ] Verificar mensaje de error
- [ ] Intentar compra con cantidad = 0
- [ ] Verificar que no se procesa
- [ ] Intentar compra de producto sin stock
- [ ] Verificar manejo correcto

**Resultado esperado:** ✅ Validaciones funcionan correctamente

---

### Test 18: Dashboard de Stripe

**Objetivo:** Verificar que los pagos aparecen en Stripe

- [ ] Hacer compra de prueba exitosa
- [ ] Ir a https://dashboard.stripe.com/test/payments
- [ ] Verificar que aparece el pago
- [ ] Verificar metadata: product_id, product_name, quantity
- [ ] Verificar descripción del pago
- [ ] Verificar monto correcto

**Resultado esperado:** ✅ Pagos registrados correctamente en Stripe

---

### Test 19: Emails de Confirmación

**Objetivo:** Verificar que se envían emails

**Prerequisito:** Emails configurados en OpenCart

- [ ] Hacer compra de prueba
- [ ] Verificar que el cliente recibe email de confirmación
- [ ] Verificar que el admin recibe notificación
- [ ] Verificar que el email contiene info correcta del pedido

**Resultado esperado:** ✅ Emails enviados correctamente

---

### Test 20: Seguridad y Logs

**Objetivo:** Verificar que no hay fugas de información sensible

- [ ] Revisar consola del navegador
- [ ] Verificar que NO aparecen claves secretas
- [ ] Solo debe aparecer clave publicable
- [ ] Revisar logs de OpenCart: `system/storage/logs/`
- [ ] Verificar que NO hay claves secretas en logs
- [ ] Verificar que los errores se registran apropiadamente

**Resultado esperado:** ✅ Sin fugas de información sensible

---

## 📊 Resumen de Pruebas

| Test | Descripción | Estado |
|------|-------------|--------|
| 1 | Instalación Básica | ⬜ |
| 2 | Configuración de Claves | ⬜ |
| 3 | Botón en Página de Producto | ⬜ |
| 4 | Carga de JavaScript | ⬜ |
| 5 | Compra Simple | ⬜ |
| 6 | Cantidad Múltiple | ⬜ |
| 7 | Opciones de Producto | ⬜ |
| 8 | Tarjeta Declinada | ⬜ |
| 9 | 3D Secure Éxito | ⬜ |
| 10 | 3D Secure Fallo | ⬜ |
| 11 | Cálculo de Envío | ⬜ |
| 12 | Checkout Normal | ⬜ |
| 13 | Usuario vs Invitado | ⬜ |
| 14 | Múltiples Monedas | ⬜ |
| 15 | Journal 3 | ⬜ |
| 16 | Rendimiento | ⬜ |
| 17 | Validación de Datos | ⬜ |
| 18 | Dashboard Stripe | ⬜ |
| 19 | Emails | ⬜ |
| 20 | Seguridad | ⬜ |

**Total: 20 tests**

## ✅ Criterios de Aceptación

La extensión está lista para producción cuando:

- [ ] Todos los tests obligatorios pasan (1-12, 18, 20)
- [ ] Al menos 15 de 20 tests totales pasan
- [ ] No hay errores de seguridad (Test 20)
- [ ] No hay errores críticos en consola
- [ ] Los pagos aparecen correctamente en Stripe Dashboard

## 🚀 Pasar a Producción

Una vez completadas todas las pruebas:

1. [ ] Cambiar a claves LIVE de Stripe
2. [ ] Desactivar modo de prueba
3. [ ] Configurar Apple Pay domain verification
4. [ ] Hacer 1 compra real de bajo monto (€1)
5. [ ] Verificar que funciona en producción
6. [ ] Reembolsar la compra de prueba desde Stripe Dashboard
7. [ ] ✅ ¡Listo para aceptar pagos reales!

---

**Más información sobre tarjetas de prueba:**
https://stripe.com/docs/testing

**Buena suerte con las pruebas!** 🎉
