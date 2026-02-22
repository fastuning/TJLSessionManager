# 📦 Instalación Rápida con OCMOD ZIP

## Descargar e Instalar

### 1️⃣ Descargar el archivo
Descarga: **`stripe-applepay.ocmod.zip`** (27KB)

### 2️⃣ Instalar en OpenCart

1. **Accede al panel de administración** de tu OpenCart
2. Ve a **Extensiones → Instalador** (Extensions → Installer)
3. Haz clic en el botón **"Subir"** (Upload)
4. Selecciona el archivo **`stripe-applepay.ocmod.zip`**
5. Espera a que se suba (aparecerá mensaje de éxito)

### 3️⃣ Refrescar modificaciones

1. Ve a **Extensiones → Modificaciones** (Extensions → Modifications)
2. Haz clic en el botón **Refrescar** (🔄) en la esquina superior derecha
3. Verifica que aparece **"Stripe Apple Pay - Product Page Button"** en la lista

### 4️⃣ Activar la extensión

1. Ve a **Extensiones → Extensiones** (Extensions → Extensions)
2. Filtra por tipo: **Pagos** (Payments)
3. Busca **"Stripe Apple Pay"**
4. Haz clic en el botón verde **"Instalar"** (+)
5. El botón cambiará a rojo **"Desinstalar"** (-)

### 5️⃣ Configurar Stripe

1. Haz clic en **"Editar"** (icono de lápiz) junto a Stripe Apple Pay
2. Completa la configuración:

```
Clave Publicable: pk_test_XXXXXXXXXXX (obtener de Stripe)
Clave Secreta: sk_test_XXXXXXXXXXX (obtener de Stripe)
Modo de Prueba: ✅ Activado
Botón en Ficha de Producto: ✅ Activado
Estilo del Botón: Black
Estado del Pedido: Procesando
Estado: ✅ Activado
```

3. **Guardar**

### 6️⃣ Obtener claves de Stripe

1. Ir a: https://dashboard.stripe.com/test/apikeys
2. Copiar **Publishable key** (pk_test_...)
3. Copiar **Secret key** (sk_test_...)
4. Pegarlas en la configuración de OpenCart

### 7️⃣ Limpiar cachés

1. Ve a **Panel → Configuración**
2. Haz clic en **Refrescar** (🔄) en:
   - Cache de modificaciones
   - Cache de tema
   - Cache de datos

---

## ✅ Verificar instalación

1. Abre tu tienda
2. Ve a cualquier página de producto
3. Si usas Safari (Mac/iPhone): Deberías ver el botón de Apple Pay
4. Si usas Chrome/Firefox: Normal que NO aparezca (solo funciona en Safari)

---

## 🧪 Probar funcionamiento

**Tarjeta de prueba de Stripe:**
```
Número: 4242 4242 4242 4242
Fecha: 12/34
CVV: 123
```

1. Añade un producto al carrito
2. Ve al checkout
3. Selecciona "Stripe Apple Pay" como método de pago
4. Ingresa la tarjeta de prueba
5. Completa el pago
6. Verifica que se creó el pedido en Admin → Ventas → Pedidos

---

## 📖 Documentación Completa

Para más detalles, consulta:
- **CONFIGURACION-RAPIDA.md** - Guía rápida de configuración
- **README.md** - Documentación completa
- **CHECKLIST-INSTALACION.md** - Lista de verificación paso a paso
- **GUIA-PRUEBAS.md** - Casos de prueba detallados

---

## ⚠️ Importante

- Usa las claves de **TEST** (pk_test_ y sk_test_) para pruebas
- Cuando vayas a producción, cambia a claves **LIVE** (pk_live_ y sk_live_)
- Apple Pay solo funciona en Safari (Mac/iPhone)
- Necesitas HTTPS (certificado SSL) para que funcione en producción

---

## 🆘 Problemas?

Si encuentras algún error:
1. Verifica que refrescaste las modificaciones
2. Limpia los cachés
3. Revisa la consola del navegador (F12)
4. Consulta **README.md** sección "Solución de problemas"

---

**Tiempo de instalación:** ~5 minutos
**Listo para vender!** 🚀
