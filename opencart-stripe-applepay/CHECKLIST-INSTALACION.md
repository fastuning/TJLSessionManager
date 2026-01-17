# ✅ Checklist de Instalación - Stripe Apple Pay

Marca cada paso a medida que lo completes:

## 📦 Instalación de Archivos

- [ ] Descargar/clonar repositorio
- [ ] Subir carpeta `upload/` a raíz de OpenCart vía FTP
- [ ] Verificar que los archivos se copiaron correctamente

## 🔧 Instalación de OCMOD

- [ ] Ir a Admin → Extensiones → Instalador
- [ ] Subir archivo `install.xml`
- [ ] Ir a Admin → Extensiones → Modificaciones
- [ ] Hacer clic en botón "Refrescar" (↻)
- [ ] Verificar que aparece "Stripe Apple Pay - Product Page Button" en la lista

## 🔌 Activación de Extensión

- [ ] Ir a Admin → Extensiones → Extensiones
- [ ] Filtrar por tipo: "Pagos"
- [ ] Buscar "Stripe Apple Pay"
- [ ] Hacer clic en "Instalar" (+)
- [ ] Verificar que el botón cambió a "Desinstalar" (-)

## 🔑 Configuración de Stripe - Modo Prueba

### Obtener Claves de API

- [ ] Ir a https://dashboard.stripe.com/test/apikeys
- [ ] Copiar "Publishable key" (pk_test_...)
- [ ] Copiar "Secret key" (sk_test_...)
- [ ] Guardar claves en lugar seguro

### Configurar Extensión

- [ ] Ir a Admin → Extensiones → Extensiones → Pagos
- [ ] Hacer clic en "Editar" en Stripe Apple Pay
- [ ] Pegar Clave Publicable
- [ ] Pegar Clave Secreta
- [ ] Activar "Modo de Prueba"
- [ ] Activar "Botón en Ficha de Producto"
- [ ] Seleccionar estilo: "Black" (o el que prefieras)
- [ ] Seleccionar "Estado del Pedido": "Procesando" (o el que uses)
- [ ] Zona Geográfica: "Todas las zonas"
- [ ] Activar "Estado"
- [ ] Orden de Clasificación: 1
- [ ] Hacer clic en "Guardar" (💾)

## 🧹 Limpiar Cachés

- [ ] Ir a Panel → Configuración
- [ ] Hacer clic en icono de "Refrescar" en:
  - [ ] Cache de modificaciones
  - [ ] Cache de tema
  - [ ] Cache de datos

## ✅ Verificación Básica

- [ ] Abrir la tienda en el navegador
- [ ] Ir a cualquier página de producto
- [ ] Verificar que NO hay errores de JavaScript (F12 → Consola)
- [ ] Verificar que se cargó el archivo stripe_applepay.js

### Si usas Safari en Mac/iPhone:

- [ ] Verificar que aparece el botón de Apple Pay
- [ ] Verificar que aparece el divisor "O"

### Si usas Chrome/Firefox:

- [ ] Normal que NO aparezca el botón (solo funciona en Safari)
- [ ] En la consola debería decir: "Apple Pay not available"

## 🧪 Prueba de Compra

### Preparación

- [ ] Abrir página de producto
- [ ] Verificar precio correcto
- [ ] Cambiar cantidad y verificar que se actualiza

### En Safari (Apple Pay)

- [ ] Hacer clic en botón Apple Pay
- [ ] Verificar que se abre el diálogo de Apple Pay
- [ ] Cancelar (por ahora)

### Prueba con Tarjeta de Prueba

Si tienes el checkout normal configurado:

- [ ] Añadir producto al carrito
- [ ] Ir al checkout
- [ ] Seleccionar "Stripe Apple Pay" como método de pago
- [ ] Usar tarjeta de prueba: 4242 4242 4242 4242
- [ ] Fecha: 12/34
- [ ] CVV: 123
- [ ] Completar pago
- [ ] Verificar que se creó el pedido
- [ ] Verificar que el estado es "Procesando" (o el que configuraste)
- [ ] Ir a Admin → Ventas → Pedidos
- [ ] Verificar que aparece el nuevo pedido
- [ ] Verificar comentario: "Paid via Apple Pay (Stripe)"

## 🍎 Configuración Apple Pay (Solo Producción)

⚠️ **Solo necesario cuando vayas a LIVE (producción)**

Para modo de prueba, SALTA esta sección.

### Verificar Dominio en Stripe

- [ ] Ir a https://dashboard.stripe.com/settings/payments
- [ ] Sección "Apple Pay" → Configurar
- [ ] Descargar archivo de verificación
- [ ] Crear carpeta `/.well-known/` en raíz del servidor
- [ ] Subir archivo como: `/.well-known/apple-developer-merchantid-domain-association`
- [ ] Verificar acceso: https://tudominio.com/.well-known/apple-developer-merchantid-domain-association
- [ ] Si da 403, copiar `.well-known-htaccess-example` a `/.well-known/.htaccess`
- [ ] En Stripe, añadir dominio: `tudominio.com` (sin https://)
- [ ] Hacer clic en "Añadir dominio"
- [ ] Verificar que aparece con check verde ✓

## 🚀 Migración a Producción (LIVE)

⚠️ **Solo cuando todo funcione en pruebas**

### Obtener Claves LIVE

- [ ] Ir a https://dashboard.stripe.com/apikeys (sin /test/)
- [ ] Copiar "Publishable key" (pk_live_...)
- [ ] Copiar "Secret key" (sk_live_...)

### Actualizar Configuración

- [ ] Ir a Admin → Stripe Apple Pay → Editar
- [ ] Cambiar a Clave Publicable LIVE
- [ ] Cambiar a Clave Secreta LIVE
- [ ] **DESACTIVAR** "Modo de Prueba"
- [ ] Guardar

### Verificar Apple Pay

- [ ] Completar sección "Configuración Apple Pay" (arriba)
- [ ] Hacer prueba real con tarjeta real
- [ ] Verificar que el pago se procesa en Stripe
- [ ] Verificar que el pedido se crea en OpenCart

## 🎨 Personalización Journal 3 (Opcional)

Si usas Journal 3:

- [ ] Ir a Journal 3 → Personalización → CSS Personalizado
- [ ] Añadir CSS personalizado (ver CONFIGURACION-RAPIDA.md)
- [ ] Guardar y verificar estilo

## 🔍 Solución de Problemas

Si algo no funciona, verificar:

- [ ] Consola del navegador (F12) → ¿Hay errores?
- [ ] Logs de OpenCart: `system/storage/logs/error.log`
- [ ] Dashboard de Stripe → Logs → ¿Aparecen las peticiones?
- [ ] El sitio usa HTTPS (SSL)
- [ ] Las claves de Stripe son correctas
- [ ] El OCMOD está instalado y refrescado
- [ ] Los cachés están limpios

## 📊 Monitoreo Post-Instalación

- [ ] Hacer 3-5 pedidos de prueba
- [ ] Verificar que todos se crean correctamente
- [ ] Verificar que los pagos aparecen en Stripe
- [ ] Probar con diferentes cantidades de productos
- [ ] Probar con productos con opciones
- [ ] Verificar emails de confirmación
- [ ] Verificar cálculo de impuestos
- [ ] Verificar cálculo de envío

## ✅ Instalación Completada

Una vez completados todos los pasos:

- [ ] Hacer backup completo de la tienda
- [ ] Documentar las claves de API utilizadas
- [ ] Informar al equipo/cliente
- [ ] Celebrar 🎉

---

## 📞 Recursos

- **README completo:** `README.md`
- **Configuración rápida:** `CONFIGURACION-RAPIDA.md`
- **Stripe Dashboard:** https://dashboard.stripe.com
- **Documentación Stripe:** https://stripe.com/docs
- **Soporte OpenCart:** https://forum.opencart.com

---

**Tiempo estimado total:** 15-20 minutos (sin Apple Pay en producción)
**Con Apple Pay en producción:** +10 minutos adicionales
