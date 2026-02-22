# Stripe Apple Pay para OpenCart 3.0.3.6

Extensión completa de Stripe con Apple Pay para OpenCart 3.0.3.6 que permite a los clientes comprar directamente desde la ficha de producto usando Apple Pay.

## Características

✅ **Botón de Apple Pay en ficha de producto** - Compra directa sin ir al checkout
✅ **Compatible con Journal 3** - Funciona perfectamente con el template Journal 3
✅ **Soporte completo de Stripe** - Acepta tarjetas de crédito/débito y Apple Pay
✅ **Modo de prueba** - Prueba los pagos sin cobros reales
✅ **Multiidioma** - Incluye español e inglés
✅ **Gestión de envíos** - Calcula opciones de envío dinámicamente
✅ **Creación automática de pedidos** - Los pedidos se crean automáticamente tras el pago

## Requisitos

- OpenCart 3.0.3.6
- PHP 7.0 o superior
- Extensión cURL habilitada en PHP
- Cuenta de Stripe (https://stripe.com)
- Certificado SSL (HTTPS) - **OBLIGATORIO para Apple Pay**
- Dominio verificado en Stripe para Apple Pay

## Instalación

### Paso 1: Subir archivos

1. Descarga o clona este repositorio
2. Sube la carpeta `upload/` completa a la raíz de tu instalación de OpenCart usando FTP
3. Los archivos se copiarán automáticamente a sus ubicaciones correctas

### Paso 2: Instalar OCMOD

1. Accede al panel de administración de OpenCart
2. Ve a **Extensiones > Instalador**
3. Haz clic en el botón de subir archivo
4. Selecciona el archivo `install.xml`
5. Una vez subido, ve a **Extensiones > Modificaciones**
6. Haz clic en el botón **Refrescar** (icono de actualización en la esquina superior derecha)

### Paso 3: Instalar la extensión de pago

1. Ve a **Extensiones > Extensiones**
2. Filtra por tipo: **Pagos**
3. Busca **Stripe Apple Pay** en la lista
4. Haz clic en el botón **Instalar** (botón verde con +)

### Paso 4: Configurar Stripe

#### 4.1 Obtener claves de API de Stripe

1. Inicia sesión en tu cuenta de Stripe: https://dashboard.stripe.com
2. Ve a **Desarrolladores > Claves de API**
3. Copia tu **Clave publicable** (Publishable key)
4. Copia tu **Clave secreta** (Secret key)

**IMPORTANTE:** Para modo de prueba, usa las claves de prueba (test). Para producción, usa las claves en vivo (live).

#### 4.2 Configurar la extensión

1. En OpenCart, haz clic en **Editar** junto a Stripe Apple Pay
2. Completa los siguientes campos:

   - **Clave Publicable**: Pega tu Publishable Key de Stripe
   - **Clave Secreta**: Pega tu Secret Key de Stripe
   - **Modo de Prueba**: Activado (para pruebas) / Desactivado (para producción)
   - **Botón en Ficha de Producto**: Activado
   - **Estilo del Botón Apple Pay**: Black / White / White Outline
   - **Estado del Pedido**: Selecciona el estado para pedidos completados (ej: "Procesando")
   - **Zona Geográfica**: Todas las zonas (o selecciona una específica)
   - **Estado**: Activado
   - **Orden de Clasificación**: 1

3. Haz clic en **Guardar**

### Paso 5: Configurar Apple Pay (OBLIGATORIO)

Para que Apple Pay funcione, debes verificar tu dominio con Stripe:

#### 5.1 Descargar archivo de verificación

1. En el dashboard de Stripe, ve a **Configuración > Métodos de pago**
2. Busca **Apple Pay** y haz clic en **Configurar**
3. Descarga el archivo de verificación: `apple-developer-merchantid-domain-association`

#### 5.2 Subir archivo de verificación

1. Crea una carpeta `.well-known` en la raíz de tu sitio web
2. Sube el archivo descargado a: `/.well-known/apple-developer-merchantid-domain-association`
3. El archivo debe ser accesible en: `https://tudominio.com/.well-known/apple-developer-merchantid-domain-association`

#### 5.3 Verificar dominio en Stripe

1. En Stripe, en la sección de configuración de Apple Pay
2. Añade tu dominio: `tudominio.com` (sin https:// ni www)
3. Haz clic en **Añadir dominio**
4. Stripe verificará automáticamente que el archivo está en su lugar

**IMPORTANTE:**
- Debes tener un certificado SSL válido (HTTPS)
- El archivo debe ser accesible públicamente sin autenticación
- No añadas extensión .txt ni cambies el nombre del archivo

### Paso 6: Añadir clave publicable al header (IMPORTANTE)

Para que el JavaScript de Apple Pay funcione, necesitas añadir la clave publicable en el header:

1. Ve a **Diseño > Layouts**
2. Edita el layout de **Product** (Producto)
3. O edita tu archivo de tema `catalog/view/theme/[tu-tema]/template/common/header.twig`
4. Añade esta línea en la sección `<head>`:

```html
<meta name="stripe-publishable-key" content="tu_clave_publicable_aqui">
```

Reemplaza `tu_clave_publicable_aqui` con tu Publishable Key real de Stripe.

### Paso 7: Limpiar cachés

1. Ve a **Panel > Configuración**
2. Haz clic en el botón **Refrescar** en los cachés de:
   - Cache de modificaciones
   - Cache de tema
   - Cache de datos

## Uso

### Compra directa desde producto

1. Los usuarios con dispositivos Apple (iPhone, iPad, Mac con Safari) verán el botón de Apple Pay en la ficha de producto
2. Al hacer clic en el botón de Apple Pay:
   - Se abre el diálogo de Apple Pay
   - El usuario selecciona método de pago y dirección de envío
   - Se calculan automáticamente los gastos de envío
   - Se procesa el pago
   - Se crea el pedido automáticamente
   - Se redirige a la página de éxito

### Checkout normal

La extensión también funciona en el proceso de checkout normal:

1. El cliente añade productos al carrito
2. Va al checkout
3. En la selección de método de pago, puede elegir:
   - Tarjeta de crédito/débito (Stripe)
   - Apple Pay (si está disponible en su dispositivo)

## Pruebas

### Modo de Prueba

1. Activa **Modo de Prueba** en la configuración de la extensión
2. Usa las claves de prueba (test) de Stripe
3. Tarjetas de prueba de Stripe:
   - **Éxito**: 4242 4242 4242 4242
   - **Requiere autenticación**: 4000 0027 6000 3184
   - **Declinada**: 4000 0000 0000 0002
   - Fecha de expiración: Cualquier fecha futura
   - CVV: Cualquier 3 dígitos

### Apple Pay en modo de prueba

- En Safari, Apple Pay funcionará en modo de prueba
- No se realizarán cobros reales
- Los pedidos se crearán normalmente en OpenCart

## Compatibilidad

### Temas

✅ **Default OpenCart** - Compatible
✅ **Journal 3** - Compatible
✅ **Otros temas** - Compatible (puede requerir ajustes de CSS)

### OpenCart

- ✅ OpenCart 3.0.3.6
- ⚠️ Otras versiones de 3.x pueden funcionar pero no están probadas

### Navegadores

- ✅ Safari (macOS, iOS) - Soporte completo de Apple Pay
- ✅ Chrome (macOS, iOS) - Soporte de tarjetas de crédito
- ✅ Firefox - Soporte de tarjetas de crédito
- ✅ Edge - Soporte de tarjetas de crédito

## Solución de problemas

### El botón de Apple Pay no aparece

1. Verifica que estás usando Safari en un dispositivo Apple
2. Comprueba que tienes al menos una tarjeta configurada en Apple Pay
3. Verifica que tu sitio usa HTTPS (SSL)
4. Asegúrate de que el dominio está verificado en Stripe
5. Revisa la consola del navegador (F12) para errores JavaScript

### Error: "Apple Pay not available"

- Apple Pay solo está disponible en dispositivos Apple con Safari
- En otros navegadores/dispositivos se mostrará el formulario de tarjeta estándar

### El pago se procesa pero no se crea el pedido

1. Verifica que el **Estado del Pedido** está configurado en la extensión
2. Revisa los logs de errores de OpenCart en `system/storage/logs/`
3. Verifica que tu API Key de Stripe es correcta y está en modo correcto (test/live)

### Error 403 al verificar dominio en Stripe

1. Asegúrate de que el archivo está exactamente en `/.well-known/apple-developer-merchantid-domain-association`
2. Verifica que el archivo es accesible públicamente
3. Comprueba que no hay reglas de .htaccess bloqueando la carpeta `.well-known`
4. Prueba acceder directamente: `https://tudominio.com/.well-known/apple-developer-merchantid-domain-association`

### El botón aparece en negro en fondo oscuro

Cambia el **Estilo del Botón Apple Pay** en la configuración:
- **Black**: Fondo claro
- **White**: Fondo oscuro
- **White Outline**: Fondo oscuro con borde

## Personalización

### Cambiar posición del botón

Edita el archivo `install.xml` y modifica la sección `<search>` para cambiar dónde se inserta el botón.

### Cambiar estilo del botón

Edita `upload/catalog/view/javascript/stripe_applepay.js` en la función `displayApplePayButton()`:

```javascript
var prButton = elements.create('paymentRequestButton', {
    paymentRequest: config.paymentRequest,
    style: {
        paymentRequestButton: {
            type: 'buy', // 'buy', 'donate', 'plain', 'book', 'check-out', 'subscribe'
            theme: 'black', // 'dark', 'light', 'light-outline'
            height: '48px'
        }
    }
});
```

### Añadir campos personalizados

Si necesitas capturar campos adicionales (como número de teléfono, notas, etc.), edita:
- `upload/catalog/controller/extension/module/stripe_product_payment.php` (backend)
- `upload/catalog/view/javascript/stripe_applepay.js` (frontend)

## Seguridad

⚠️ **IMPORTANTE:**

1. **NUNCA** compartas tus claves secretas de Stripe
2. Usa **claves de prueba** en entorno de desarrollo
3. Usa **claves en vivo** solo en producción
4. Mantén OpenCart actualizado
5. Usa certificado SSL válido (Let's Encrypt es gratis)
6. Revisa regularmente las transacciones en el dashboard de Stripe

## Soporte

### Recursos de Stripe

- Documentación oficial: https://stripe.com/docs
- Dashboard: https://dashboard.stripe.com
- Documentación de Apple Pay: https://stripe.com/docs/apple-pay

### OpenCart

- Foro oficial: https://forum.opencart.com
- Documentación: https://docs.opencart.com

## Desinstalación

### Para desinstalar completamente:

1. Ve a **Extensiones > Extensiones > Pagos**
2. Busca **Stripe Apple Pay**
3. Haz clic en **Desinstalar** (botón rojo con -)
4. Ve a **Extensiones > Modificaciones**
5. Busca **Stripe Apple Pay - Product Page Button**
6. Haz clic en eliminar
7. Haz clic en **Refrescar** modificaciones
8. Elimina los archivos manualmente por FTP si lo deseas

## Changelog

### Versión 1.0.0 (2026-01-17)

- ✅ Lanzamiento inicial
- ✅ Soporte de Apple Pay en ficha de producto
- ✅ Compra directa sin checkout
- ✅ Compatible con Journal 3
- ✅ Soporte multiidioma (ES/EN)
- ✅ Modo de prueba
- ✅ Creación automática de pedidos

## Licencia

Este código es de uso libre para proyectos personales y comerciales.

## Créditos

- Desarrollado para OpenCart 3.0.3.6
- Integración con Stripe Payment Gateway
- Apple Pay es una marca registrada de Apple Inc.

---

**¿Necesitas ayuda?** Revisa la sección de Solución de problemas o consulta la documentación de Stripe.

**¿Todo funciona?** ¡Disfruta de tus ventas con Apple Pay! 🎉
