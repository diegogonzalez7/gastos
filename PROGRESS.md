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

- [x] Colección One Piece con cuatro fondos animados en toda la app, miniaturas en Apariencia y soporte para movimiento reducido.

- El selector de Apariencia ofrece Original, Medianoche, Grafito, Ciruela y Arena, con una vista previa de cada diseño.
- La elección se guarda en el dispositivo y se aplica desde el arranque. Original conserva el ajuste de color del sistema, claro u oscuro que se usaba antes.
- La prueba de navegador comprueba los cuatro diseños, la persistencia de la elección y que los movimientos siguen disponibles al cambiar de diseño.

## Copias en la nube con Dropbox

- Conexión opcional desde Copias de seguridad a una carpeta privada de Dropbox con autorización PKCE y una App key de uso personal.
- Cada subida crea un archivo independiente. Las copias se pueden buscar y abrir en cualquier dispositivo conectado a la misma cuenta con la misma App key.
- La restauración de Dropbox comparte la validación, la vista previa y la confirmación de las copias locales.
- La prueba de navegador simula Dropbox para verificar la transferencia en ambas direcciones y la selección entre varias copias. Queda pendiente conectar una cuenta real desde un iPhone.

## Comparación de copias y favoritos

- La vista previa de restauración, desde archivo o Dropbox, cuenta los movimientos añadidos, modificados y eliminados. Con Dropbox conectado permite subir una copia independiente del historial actual antes de confirmar.
- Registro rápido admite favoritos editables con importe, categoría y concepto que rellenan un movimiento con la fecha de hoy. Los favoritos se guardan por dispositivo.
- Las pruebas de navegador cubren el uso y la gestión de favoritos, la comparación de historiales y la copia previa a restaurar con Dropbox simulado.

## Saldo bancario y efectivo

- El formulario distingue los gastos pagados desde la cuenta bancaria y en efectivo. Máquina Trabajo se trata como efectivo, también en el historial y en copias antiguas.
- Los gastos en efectivo siguen en los totales de gasto y categorías. Las retiradas de cajero afectan al saldo bancario y quedan fuera de los totales de ingresos y gastos. Resumen, historial y cierre mensual muestran esta distinción.
- Las copias nuevas guardan las formas de pago y retiradas. La restauración sigue aceptando versiones anteriores. El saldo inicial guardado se conserva para que el usuario pueda contrastarlo con el banco.

## Reembolsos vinculados a gastos

- Los gastos admiten reembolsos parciales o completos con fecha y forma de cobro propias. Se pueden consultar, editar y eliminar desde el historial o desde el gasto.
- El gasto neto se refleja en el mes y la categoría de la compra. Un reembolso bancario afecta al saldo en su fecha de cobro. Los reembolsos aparecen como movimientos separados en su mes.
- Las copias incluyen los reembolsos y se siguen leyendo los formatos anteriores. Las pruebas cubren pagos y reembolsos en efectivo o banco, cambios de mes y validación de importes.

## Ingresos en efectivo

- Los ingresos y favoritos tienen el selector Recibido en. Los ingresos en efectivo cuentan en el balance mensual y quedan fuera del saldo bancario. Los ingresos antiguos conservan el tratamiento bancario.
- Las copias conservan la forma de cobro y se pueden restaurar en la versión actual junto con los formatos anteriores. Las pruebas cubren favoritos, edición, saldo y restauración de ingresos en efectivo.

## Posición del selector y presentación de favoritos

- El selector ocupa un lugar fijo en la fila superior de Resumen, Movimientos y Categorías. En los anchos más estrechos usa nombres de mes abreviados.
- Los gastos de favoritos y de Máquina Trabajo muestran la categoría en el historial y conservan su concepto para editarlo o buscarlo. Las copias guardan la presentación de los nuevos gastos creados desde favoritos.
- Registro rápido muestra solo los favoritos y su opción de gestión. El formulario Nuevo permite elegir la categoría de cualquier movimiento.

## Historial desde septiembre e historias con temporizador

- El enlace abre el cierre del mes anterior al seleccionado. El selector, los formularios y el historial visible parten de septiembre de 2026. Los movimientos anteriores guardados siguen en las copias y en el cálculo bancario.
- Las historias avanzan tras 30 segundos, con barra de progreso, toques, deslizamiento y pausa. La pantalla final permite volver al inicio o consultar los movimientos del mes.
- La comparación destaca el importe y el porcentaje gastado de más o de menos. Con un mes anterior sin gastos, se muestra la diferencia en euros.

## Mes de inicio configurable

- Ajustes permite elegir el primer mes del calendario, los movimientos y los cierres. La preferencia se guarda en el dispositivo. Las instalaciones anteriores parten de septiembre de 2026 y las nuevas de enero del año actual.
- La prueba de navegador verifica que un inicio en abril de 2020 se recuerda y que los movimientos ocultos reaparecen al ampliar el periodo. Las copias y el saldo conservan los movimientos previos.

## Organización de ajustes

- La barra lateral y el menú Más dan acceso a Recordatorios y Ajustes. Ajustes agrupa General, Apariencia, Notificaciones y Copias de seguridad. Cada sección permite volver al menú.

## Filtro por forma de pago

- Movimientos permite filtrar por efectivo o cuenta bancaria y muestra los importes y el neto de las filas visibles. Cada reembolso se filtra por su propia forma de cobro y las retiradas aparecen con los movimientos bancarios.
- Los totales visibles se distribuyen a lo ancho. Con tres importes se alinean a la izquierda, al centro y a la derecha. Con dos importes ocupan los extremos.

## Retiradas, deshacer y copias con preferencias

- [x] Las retiradas muestran Cuenta bancaria → Efectivo y se localizan con el filtro bancario.
- [x] Deshacer recupera un movimiento borrado y sus reembolsos vinculados, o un reembolso borrado de forma individual.
- [x] Las copias locales y de Dropbox pueden incluir favoritos, tema, diseño y mes de inicio. La restauración permite elegir qué opciones recuperar junto al historial.
