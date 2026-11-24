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

## Entrada y presentación de importes

- Al empezar por coma o punto, el campo completa el cero y muestra la coma decimal. Funciona en gastos, ingresos y saldo inicial.
- Las cifras de los importes tienen más separación y el símbolo del euro acompaña al valor escrito y a los importes del resumen, el historial y las copias.
- Se añadió una prueba de registro de un gasto de 0,90 € empezando por la coma.

## Registro frecuente y recuperación de datos

- Se limitan a dos los decimales que se pueden introducir en el campo de importe.
- El formulario destaca las fechas de otro mes, permite cambiar la fecha a hoy y pide confirmación antes de descartar cambios.
- Se pueden duplicar movimientos guardados para revisarlos con la fecha de hoy antes de guardar la copia.
- Las copias muestran la última fecha de exportación y permiten compartir el JSON cuando el navegador lo admite. La restauración muestra el periodo de la copia y ofrece descargar el historial actual antes de reemplazarlo.

## Pantalla de arranque y balance

- El balance ajusta el tamaño de la cifra al espacio de la tarjeta para mantener el importe y el símbolo del euro en una línea.
- La pantalla inicial muestra el icono de Mi Dinero y el crédito a diegogonzalez7 durante la carga del historial.
- La pantalla inicial se desvanece y las vistas principales aparecen con una transición breve que respeta el ajuste de movimiento reducido.

## Recordatorios de pago y traslado de copias

- El panel de Recordatorios permite elegir qué pagar y cuándo, editar el aviso y marcar el pago como resuelto.
- Cada recordatorio genera una cita con alerta a la hora indicada. En iPhone también se puede enviar al atajo de Recordatorios de Apple.
- Las copias JSON guardan los recordatorios junto a los movimientos. Las copias creadas antes de esta función mantienen los recordatorios que ya existen en el dispositivo.
- La guía describe cómo mover el mismo JSON entre iPhone y ordenador con iCloud Drive o AirDrop.

## Cierre mensual en historias

- Resumen del mes cerrado con balance, categoría principal, gasto mayor, comparación y saldo al cierre. Se recalcula con los movimientos del dispositivo.
- Acceso discreto en Resumen, con un punto para el cierre nuevo y navegación por deslizamiento, controles y teclado.
- Aviso opcional el día 1 a las 09:00 mediante el atajo de Apple o una cita recurrente de calendario.

## Diseños de la interfaz

- El selector de Apariencia ofrece Original, Medianoche, Grafito, Ciruela y Arena, con una vista previa de cada diseño.
- La elección se guarda en el dispositivo y se aplica desde el arranque. Original conserva el ajuste de color del sistema, claro u oscuro que se usaba antes.
- La prueba de navegador comprueba los cuatro diseños, la persistencia de la elección y que los movimientos siguen disponibles al cambiar de diseño.
