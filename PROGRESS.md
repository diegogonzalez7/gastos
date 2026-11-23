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
- [ ] Construir el resumen mensual, el registro, el historial y las categorías.
- [ ] Completar las copias, la instalación y el diseño claro y oscuro.
- [ ] Comprobar el flujo real en navegador, la persistencia y el arranque sin conexión. Corregir los problemas observados.
- [ ] Documentar el uso, la instalación y la publicación.

Los cambios se agrupan en commits por fase. La publicación de la web requiere aprobación del propietario.

## Comprobaciones

- Cinco pruebas de dominio superadas con Node: importes, fechas, totales mensuales, orden y copias JSON.
