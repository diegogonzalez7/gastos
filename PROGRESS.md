# Mi Dinero · Progreso

Aplicación personal en español para anotar ingresos y gastos en euros desde el móvil. El repositorio parte de un README y de un historial vacío.

## Arquitectura

- Interfaz responsive con React, TypeScript y Vite. Las tres vistas comparten el mes seleccionado y el mismo formulario de movimiento.
- IndexedDB conserva el libro de movimientos en el navegador. Los importes se guardan en céntimos enteros y las fechas como días del calendario local.
- La copia JSON versionada contiene todos los meses. La restauración se valida antes de pedir confirmación y se aplica en una única transacción.
- El manifiesto y el service worker permiten instalar la PWA y volver a abrirla sin conexión después de la primera carga. Los recursos se sirven desde el mismo sitio.

## Fases

- [x] Definir el flujo, la arquitectura y las fases.
- [x] Implementar el modelo, la persistencia y las pruebas de cálculo y validación.
- [x] Construir el resumen mensual, el registro, el historial y las categorías.
- [x] Completar las copias, la instalación y el diseño claro y oscuro.
- [x] Comprobar el flujo real en navegador, la persistencia y el arranque sin conexión. Corregir los problemas observados.
- [x] Documentar el uso, la instalación y la publicación.

Los cambios se agrupan en commits por fase. La publicación de la web requiere aprobación del propietario.

## Comprobaciones

- Cinco pruebas de dominio superadas con Node: importes, fechas, totales mensuales, orden y copias JSON.
- La interfaz compila con TypeScript en modo estricto. El resumen, los accesos rápidos y el historial utilizan los datos reales de IndexedDB.
- La compilación genera manifiesto, iconos instalables y caché local del código, la tipografía y la ilustración.
- Una instalación limpia con el lockfile y la compilación de producción terminaron correctamente.
- Pasaron los 14 casos de Playwright en Chromium, siete flujos en escritorio y móvil. Cubren altas y correcciones, traslados entre meses, búsqueda, categorías, borrado, copias válidas y dañadas, escrituras simultáneas y uso sin conexión bajo la ruta `/gastos/`.
- Chromium validó la instalabilidad del manifiesto. Un perfil persistente recuperó su movimiento tras cerrar el navegador por completo y arrancar otra vez sin red.
- WebKitGTK 2.54.3 en formato móvil permitió registrar un gasto, recargarlo, consultar su categoría y abrir el editor con su importe. El formulario abre con el foco en el importe.

## Pendiente fuera del entorno

- La instalación con los menús de Safari en un iPhone físico y de Chrome en un Android físico queda pendiente de una comprobación en esos dispositivos.
- El propietario ha autorizado la publicación gratuita para probar la app en el móvil.

## Seguimiento desde septiembre

- [x] Añadir las categorías del Excel y permitir movimientos fechados con concepto opcional.
- [x] Incorporar el saldo inicial, el acumulado mensual y su copia de seguridad.
- [x] Verificar la actualización y facilitar la instalación desde Safari.

Se superaron siete pruebas de dominio y dieciocho pruebas de navegador en la compilación de producción. Se comprobó la migración de una base anterior, el registro sin concepto, el arrastre en meses vacíos y la recuperación del saldo inicial desde una copia. El paquete incluye el icono de iPhone de 180 × 180, los metadatos de iOS y el manifiesto en modo independiente. Las instrucciones de instalación están en el menú Más.

## Publicación para pruebas móviles

- [x] Compilar la versión de código 2fec1c3 y repetir las siete pruebas de dominio.
- [x] Subir los quince archivos de distribución a la raíz de la rama `gh-pages` (commit `0ba6be5`) y comprobar el commit remoto.
- [x] Preparar y verificar un ZIP para carga directa en Cloudflare Pages.
- [x] Integrar el código de `mi-dinero` y la distribución de `gh-pages` en `main`. Comprobar que `docs/` coincide con la compilación y que abre el resumen y el formulario sin conexión bajo `/gastos/`.
- [ ] Confirmar la activación del alojamiento y abrir la URL pública por HTTPS. La política de red del entorno bloqueó las consultas a la API de GitHub y al dominio de Pages.

## Categorías y teclado móvil

- Se ofrecen las categorías solicitadas, con Alimentación en lugar de Supermercado y Otro al final.
- Los movimientos anteriores se conservan y Supermercado se agrupa con Alimentación.
- Los formularios usan teclado decimal para importes, permiten saldo negativo y ajustan el panel al espacio visible cuando aparece el teclado.
- Pendiente de comprobar el teclado físico en un iPhone.
