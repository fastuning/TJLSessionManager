# Guía de Configuración Rápida - Stripe Apple Pay

## ⚡ Instalación Express (10 minutos)

### 1. Subir Archivos (2 min)
```bash
# Por FTP, sube la carpeta "upload/" a la raíz de tu OpenCart
# Los archivos se copiarán automáticamente
```

### 2. Instalar OCMOD (1 min)
1. Admin → Extensiones → Instalador
2. Sube `install.xml`
3. Admin → Extensiones → Modificaciones → Refrescar ↻

### 3. Activar Extensión (1 min)
1. Admin → Extensiones → Extensiones → Tipo: **Pagos**
2. Busca **Stripe Apple Pay** → Instalar ➕

### 4. Configurar Stripe (3 min)

#### Obtener claves de Stripe:
1. Ir a: https://dashboard.stripe.com/test/apikeys
2. Copiar **Publishable key** (empieza con `pk_test_...`)
3. Copiar **Secret key** (empieza con `sk_test_...`)

#### Configurar en OpenCart:
1. Editar Stripe Apple Pay
2. Rellenar:
   ```
   Clave Publicable: pk_test_XXXXXXXXXXX
   Clave Secreta: sk_test_XXXXXXXXXXX
   Modo de Prueba: ✅ Activado
   Botón en Ficha de Producto: ✅ Activado
   Estilo del Botón: Black
   Estado del Pedido: Procesando
   Estado: ✅ Activado
   ```
3. Guardar 💾

### 5. Añadir Meta Tag al Header (2 min)

**IMPORTANTE:** Este paso es necesario para que funcione.

#### Opción A: Mediante FTP (Recomendado)

Edita el archivo:
```
catalog/view/theme/[tu-tema]/template/common/header.twig
```

Si usas **Journal 3**:
```
catalog/view/theme/journal3/template/common/header.twig
```

Busca la etiqueta `<head>` y añade justo después:
```html
<head>
<meta name="stripe-publishable-key" content="pk_test_XXXXXXXXXXX">
<!-- resto del head -->
```

⚠️ **Reemplaza** `pk_test_XXXXXXXXXXX` con tu clave publicable real.

#### Opción B: Mediante Admin de OpenCart

1. Admin → Diseño → Layouts
2. Edita el layout de **Product**
3. Añade un módulo de HTML personalizado con:
```html
<meta name="stripe-publishable-key" content="pk_test_XXXXXXXXXXX">
```

### 6. Configurar Apple Pay (Solo para producción) (1 min)

⚠️ **Solo necesario si vas a usar Apple Pay en producción (LIVE)**

1. Crear carpeta: `/.well-known/` en la raíz de tu web
2. Descargar archivo de: https://dashboard.stripe.com/settings/payments
3. Sección **Apple Pay** → Descargar archivo de verificación
4. Subir como: `/.well-known/apple-developer-merchantid-domain-association`
5. Verificar dominio en Stripe

Para pruebas, **NO** es necesario este paso.

---

## ✅ Verificación

### Prueba que todo funciona:

1. Abre tu tienda
2. Ve a cualquier producto
3. Deberías ver el botón de Apple Pay (si usas Safari en Mac/iPhone)

### Prueba de compra:

**Tarjeta de prueba:**
```
Número: 4242 4242 4242 4242
Fecha: 12/34
CVV: 123
```

---

## 🎨 Personalización Journal 3

Si usas Journal 3 y quieres ajustar el estilo del botón:

### CSS personalizado:
```css
/* Añadir en Journal 3 → Personalización → CSS Personalizado */

#stripe-applepay-button-container {
    margin-bottom: 20px;
}

#stripe-applepay-button-container button {
    width: 100% !important;
    border-radius: 5px !important;
}

#stripe-applepay-divider {
    margin: 20px 0;
    font-size: 14px;
}
```

---

## 🐛 Solución Rápida de Problemas

### ❌ No veo el botón de Apple Pay
**Solución:** Apple Pay solo funciona en Safari (Mac/iPhone). En Chrome/Firefox verás tarjeta normal.

### ❌ Error: "Stripe publishable key not found"
**Solución:** Añadiste el meta tag en el header? (Paso 5)

### ❌ El pago funciona pero no se crea el pedido
**Solución:**
1. Ve a Admin → Stripe Apple Pay → Editar
2. Verifica que "Estado del Pedido" está configurado
3. Guarda de nuevo

### ❌ Error 403 al verificar dominio
**Solución:**
1. El archivo debe estar exactamente en `/.well-known/apple-developer-merchantid-domain-association`
2. Prueba acceder: `https://tudominio.com/.well-known/apple-developer-merchantid-domain-association`
3. Si no funciona, copia el archivo `.well-known-htaccess-example` a `/.well-known/.htaccess`

---

## 📊 Modo Producción (LIVE)

Cuando quieras aceptar pagos reales:

1. **Obtener claves LIVE de Stripe:**
   - https://dashboard.stripe.com/apikeys (sin /test/)
   - Copiar `pk_live_XXXXX` y `sk_live_XXXXX`

2. **Actualizar configuración:**
   - Admin → Stripe Apple Pay → Editar
   - Clave Publicable: `pk_live_XXXXX`
   - Clave Secreta: `sk_live_XXXXX`
   - Modo de Prueba: ❌ Desactivado
   - Guardar

3. **Actualizar meta tag:**
   - Editar `header.twig`
   - Cambiar a: `content="pk_live_XXXXX"`

4. **Configurar Apple Pay:** (Obligatorio)
   - Seguir Paso 6 completo
   - Verificar dominio en Stripe

5. **¡Listo para vender!** 🎉

---

## 📞 Ayuda Adicional

- **README completo:** `README.md`
- **Documentación Stripe:** https://stripe.com/docs
- **Tarjetas de prueba:** https://stripe.com/docs/testing

---

**⏱️ Tiempo total: ~10 minutos**
**💰 Costo: Gratis (Stripe cobra comisión por transacción)**
**🔒 Seguridad: Certificada por Stripe**
