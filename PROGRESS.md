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
- [ ] Documentar el uso, la instalación y la publicación.

Los cambios se agrupan en commits por fase. La publicación de la web requiere aprobación del propietario.

## Comprobaciones

- Cinco pruebas de dominio superadas con Node: importes, fechas, totales mensuales, orden y copias JSON.
- La interfaz compila con TypeScript en modo estricto. El resumen, los accesos rápidos y el historial utilizan los datos reales de IndexedDB.
- La compilación genera manifiesto, iconos instalables y caché local del código, la tipografía y la ilustración.
- Una instalación limpia con el lockfile y la compilación de producción terminaron correctamente.
- Pasaron los 14 casos de Playwright en Chromium, siete flujos en escritorio y móvil. Cubren altas y correcciones, traslados entre meses, búsqueda, categorías, borrado, copias válidas y dañadas, escrituras simultáneas y uso sin conexión bajo la ruta `/gastos/`.
- Chromium validó la instalabilidad del manifiesto. Un perfil persistente recuperó su movimiento tras cerrar el navegador por completo y arrancar otra vez sin red.
- WebKitGTK 2.54.3 en formato móvil permitió registrar un gasto, recargarlo, consultar su categoría y abrir el editor con su importe. El formulario abre con el foco en el importe.
