# Guía de Pruebas de Notificaciones WhatsApp

Este documento describe cómo probar las notificaciones de WhatsApp implementadas en la aplicación.

## Configuración Previa

Antes de probar, asegúrate de que:
1. Los destinatarios administrativos están configurados en **Configuración > Notificaciones**
2. Las credenciales de Twilio están correctamente configuradas
3. Los números de teléfono están en formato válido (con o sin prefijo +34)

## Casos de Prueba

### 1. Notificaciones de Incidencias (Prioridad Alta)

#### Test 1.1: Crear incidencia con prioridad alta
**Pasos:**
1. Ir a **Incidencias > Nueva Incidencia**
2. Llenar el formulario con:
   - Título: "Prueba notificación alta"
   - Descripción: "Test de notificación automática"
   - Prioridad: **Alta**
3. Guardar la incidencia

**Resultado esperado:**
- La incidencia se crea correctamente
- Se envía WhatsApp a todos los `notification_recipients` configurados
- El mensaje incluye: 🚨 título, descripción, estado, y nombre del creador
- Se registra en `sync_logs` con `source='twilio'` y `action='incident_alert'`

#### Test 1.2: Cambiar prioridad a alta (estado != en_curso)
**Pasos:**
1. Crear una incidencia con prioridad **media** o **baja**
2. Ir al detalle de la incidencia
3. Cambiar la prioridad a **Alta** (sin cambiar el estado a "En Curso")

**Resultado esperado:**
- Se actualiza la prioridad
- Se envía WhatsApp a todos los `notification_recipients`
- Se registra en `sync_logs`

#### Test 1.3: Cambiar prioridad a alta con estado "En Curso" (NO debe notificar)
**Pasos:**
1. Crear una incidencia con prioridad **media**
2. Cambiar el estado a **En Curso**
3. Cambiar la prioridad a **Alta**

**Resultado esperado:**
- Se actualiza la prioridad
- **NO** se envía notificación (porque el estado es "en_curso")

### 2. Notificaciones de Stock Bajo

#### Test 2.1: Stock baja del mínimo
**Pasos:**
1. Ir a **Stock**
2. Seleccionar un producto
3. Editar el `stock_actual` para que quede por debajo del `stock_minimo`
4. Guardar

**Resultado esperado:**
- El stock se actualiza
- Se envía WhatsApp a todos los `notification_recipients`
- El mensaje incluye: ⚠️ nombre del producto, stock actual, stock mínimo
- Se registra en `sync_logs` con `source='twilio'` y `action='low_stock_alert'`

#### Test 2.2: Stock sigue bajo (NO debe notificar de nuevo)
**Pasos:**
1. Reducir el stock de un producto que ya está por debajo del mínimo

**Resultado esperado:**
- El stock se actualiza
- **NO** se envía notificación (solo se envía cuando cruza el umbral)

### 3. Notificaciones de Encargos

#### Test 3.1: Crear nuevo encargo
**Pasos:**
1. Ir a **Encargos > Nuevo Encargo**
2. Llenar el formulario incluyendo:
   - Nombre del cliente
   - Teléfono del cliente (ej: 676138583 o +34676138583)
   - Productos
3. Guardar

**Resultado esperado:**
- El encargo se crea con estado "pendiente"
- Se envía WhatsApp a:
  - Cliente (número normalizado con +34)
  - Todos los `notification_recipients`
- El mensaje al cliente incluye: ✨ saludo, número de encargo, tipo de entrega, productos, total
- Se registra en `sync_logs` (implícito en la función)

#### Test 3.2: Cambiar estado a "Listo para Recoger"
**Pasos:**
1. Seleccionar un encargo existente
2. Cambiar el estado a **Listo para Recoger**
3. Guardar

**Resultado esperado:**
- El estado se actualiza
- Se envía WhatsApp a cliente y admins
- El mensaje incluye: ✅ "Tu encargo está listo para recoger" (o "en camino" si es domicilio)

#### Test 3.3: Cambiar estado a "Entregado"
**Pasos:**
1. Cambiar un encargo a estado **Entregado**

**Resultado esperado:**
- El estado se actualiza
- Se envía WhatsApp a cliente y admins
- El mensaje incluye: 🎉 "Tu encargo ha sido entregado"
- Se crea automáticamente una **factura en Holded** (si está configurado)
- La factura se guarda en la tabla `facturas`

#### Test 3.4: Cambiar estado a "Cancelado"
**Pasos:**
1. Cambiar un encargo a estado **Cancelado**

**Resultado esperado:**
- El estado se actualiza
- Se envía WhatsApp a cliente y admins
- El mensaje informa de la cancelación

### 4. Normalización de Teléfonos

#### Test 4.1: Números sin prefijo
**Entrada:** `676138583`  
**Salida esperada:** `whatsapp:+34676138583`

#### Test 4.2: Números con prefijo 0034
**Entrada:** `0034676138583`  
**Salida esperada:** `whatsapp:+34676138583`

#### Test 4.3: Números con prefijo +34
**Entrada:** `+34676138583`  
**Salida esperada:** `whatsapp:+34676138583`

#### Test 4.4: Números con 0 inicial
**Entrada:** `0676138583`  
**Salida esperada:** `whatsapp:+34676138583`

### 5. Verificación de Logs

Para verificar que las notificaciones se están registrando correctamente:

1. Ir a **Configuración**
2. Revisar la sección de "Logs de Sincronización"
3. Verificar que aparecen registros con:
   - `source: 'twilio'`
   - `action: 'incident_alert'` | `'low_stock_alert'` | etc.
   - `success: true/false`
   - `message`: descripción del resultado

### 6. Casos Edge

#### Test 6.1: Sin destinatarios configurados
**Pasos:**
1. Eliminar todos los `notification_recipients` en Configuración
2. Intentar crear una incidencia de prioridad alta

**Resultado esperado:**
- La incidencia se crea
- **NO** se envía notificación
- Se registra error en `sync_logs`: "No recipients configured"

#### Test 6.2: Cliente sin teléfono
**Pasos:**
1. Crear un encargo sin proporcionar teléfono del cliente

**Resultado esperado:**
- El encargo se crea
- Solo se envía WhatsApp a `notification_recipients` (admins)
- No se intenta enviar al cliente

#### Test 6.3: Teléfono malformado
**Pasos:**
1. Intentar usar un número inválido (ej: "abc123")

**Resultado esperado:**
- El sistema intenta normalizar
- Si falla, se registra en logs pero continúa con otros destinatarios

## Notas de Seguridad

- Ningún token o secret se imprime en logs
- Los logs solo muestran: "Alerta enviada a X destinatarios"
- Los mensajes de error no exponen credenciales

## Solución de Problemas

### No se reciben WhatsApp
1. Verificar credenciales de Twilio en Configuración
2. Usar botones de "Probar" en Configuración
3. Verificar que los números están en la sandbox de Twilio (si es entorno de pruebas)
4. Revisar `sync_logs` para mensajes de error

### Números duplicados
- El sistema deduplica automáticamente
- Si el cliente y un admin tienen el mismo número, solo recibe un mensaje

### Notificaciones no deseadas
- Ajustar `notification_recipients` en Configuración
- Las alertas de incidencias solo se envían si prioridad es "alta"
- Las alertas de stock solo se envían al cruzar el umbral mínimo
