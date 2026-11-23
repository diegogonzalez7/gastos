# Mi Dinero

PWA en español para llevar las cuentas personales en euros. Puedes registrar un movimiento desde el móvil, consultar el balance de cada mes y ver qué categorías concentran tus gastos. El historial empieza vacío y se guarda en el dispositivo mediante IndexedDB.

## Ejecutar en desarrollo

Desde la carpeta del repositorio, con Node.js 22.18 o posterior y npm:

```sh
npm ci
npm run dev
```

Abre la dirección que muestra Vite en la terminal. Para probar la interfaz desde un teléfono en la misma red, inicia el servidor con `npm run dev -- --host 0.0.0.0` y abre su dirección de red. La instalación y el modo sin conexión requieren HTTPS en el teléfono. En el propio ordenador también funciona `localhost`.

## Uso

- **Empezar con tus cuentas de septiembre.** En **Resumen → Saldo inicial**, introduce el dinero que tenías justo antes del primer movimiento. Puede ser positivo, cero o negativo. Se usa una vez para todo el historial.
- **Registrar.** Pulsa **Nuevo movimiento** o **Nuevo** en el móvil. Elige gasto o ingreso, escribe el importe, añade un concepto si quieres y revisa la categoría y la fecha y pulsa **Guardar movimiento**. Los accesos de **Registro rápido** abren el formulario con la categoría elegida.
- **Fecha y cambios pendientes.** Cuando la fecha corresponde a otro mes, el formulario indica cuál. Toca **Hoy** para usar la fecha actual. Si cierras un formulario con cambios, puedes seguir editándolo o descartarlos.
- **Consultar.** El resumen muestra ingresos, gastos y su diferencia. El **saldo al cierre del mes** suma el saldo inicial y todos los movimientos hasta ese mes inclusive. El **saldo total del historial** incluye también los meses posteriores que hayas registrado. Las flechas cambian de mes. Toca el nombre del mes para elegir otro periodo o volver al actual.
- **Buscar y corregir.** En **Movimientos** puedes buscar por concepto o categoría y filtrar ingresos o gastos. El selector de periodo incluye **Todos los meses**. Toca una fila para editarla o eliminarla con confirmación.
- **Repetir un movimiento.** Abre un movimiento guardado y pulsa **Duplicar movimiento**. La copia empieza con la fecha de hoy y puedes ajustar sus datos antes de guardarla.
- **Entender los gastos.** **Categorías** ordena los gastos del mes por importe y muestra su porcentaje. Toca una categoría del desglose para consultar los movimientos que la componen.
- **Apariencia.** La opción inicial sigue el tema del sistema. Puedes elegir claro u oscuro desde la barra lateral o desde **Más** en el móvil.

## Copias de seguridad

Abre **Copias de seguridad** desde la barra lateral o el menú **Más**. **Descargar copia** guarda el saldo inicial y todos los meses en un archivo `mi-dinero-AAAA-MM-DD.json`. El archivo contiene los conceptos e importes en texto legible. Guárdalo en un lugar privado.

El panel indica la fecha de la última exportación iniciada desde el dispositivo. Si el navegador admite compartir archivos, **Compartir copia** abre el menú del sistema para enviarla o guardarla en **Archivos**.

Para recuperar el historial, pulsa **Elegir archivo** y revisa el número de movimientos, los meses incluidos y el saldo inicial. Puedes pulsar **Descargar copia del historial actual** antes de confirmar **Restaurar copia**. La restauración reemplaza todo el historial de ese dispositivo y su saldo inicial en una sola operación. Las copias de la primera versión se recuperan con saldo inicial de 0 €, que puedes ajustar en Resumen. Si el archivo es inválido, está duplicado internamente o el historial cambia en otra ventana durante la confirmación, la app conserva los datos que ya había.

Cada origen web, perfil del navegador o dispositivo puede tener su propio almacén. Exporta una copia antes de cambiar de móvil, dominio o navegador, o de borrar los datos del sitio. Puedes usarla en la app instalada si esta abre un historial vacío.

## Probar la versión instalable

```sh
npm run build
npm run preview
```

La compilación genera el sitio estático en `dist/`. Abre la dirección de la vista previa y deja que termine la primera carga. El service worker guarda en el dispositivo el código, los estilos, los iconos, la tipografía y la ilustración. Para comprobarlo, registra un movimiento, desconecta la red y vuelve a abrir la app. Podrás consultar el movimiento y añadir otro.

### iPhone y Android

1. Abre la dirección HTTPS del sitio en el teléfono con conexión.
2. **iPhone.** En Safari, pulsa **Compartir → Añadir a la pantalla de inicio**. Activa **Abrir como app web** si aparece y pulsa **Añadir**.
3. **Android.** En Chrome, abre el menú **⋮** y selecciona **Instalar aplicación** o **Añadir a la pantalla de inicio → Instalar**, según la versión.
4. Inicia **Mi Dinero** desde su icono. Abre la app instalada una primera vez con conexión antes de usarla en modo avión.

## Pruebas

```sh
npm test
npx playwright install chromium
npm run test:e2e
```

Las pruebas de dominio cubren céntimos, fechas, totales y validación de copias. Playwright compila la versión de producción, la sirve bajo `/gastos/` y recorre los flujos en escritorio y móvil. Cada caso usa un perfil de pruebas aislado. En Linux, si Chromium ya está instalado, puedes ejecutar `CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e` directamente después de `npm ci`.

## Publicación con autorización del propietario

El sitio puede alojarse en cualquier servidor estático con HTTPS. Antes de publicarlo, ejecuta las pruebas y `npm run build`. Sube **el contenido** de `dist/`, con su estructura de carpetas. Mantén `sw.js`, `index.html` y `manifest.webmanifest` en el mismo directorio. Las rutas son relativas y admiten tanto un dominio raíz como una subruta.

En este repositorio, la versión compilada para GitHub Pages está en `main/docs/`.

1. Abre **Settings → Pages → Build and deployment** en GitHub.
2. Elige **Deploy from a branch**, selecciona **main** y **/docs**, y pulsa **Save**.
3. Cuando GitHub indique que el despliegue ha terminado, pulsa **Visit site** y abre la dirección HTTPS en Safari.

Para preparar una actualización de esa carpeta desde la raíz del proyecto, ejecuta `npm test` y `npm run build -- --outDir docs`. Vite regenera la carpeta de publicación. Vuelve a crear el archivo vacío `docs/.nojekyll` y sube los cambios de `docs/` junto con el código a `main`.

Para actualizar una publicación, vuelve a compilar y sustituye sus archivos estáticos en la misma dirección. El navegador descarga la nueva versión con conexión y la activa después de cerrar las ventanas de la versión anterior.

## Estructura

- `src/ledger.ts` contiene el modelo en céntimos, las fechas de calendario, el cálculo de totales y el formato de copia versionado.
- `src/storage.ts` gestiona las transacciones de IndexedDB y la actualización entre pestañas.
- `src/App.tsx` y `src/components/` contienen las vistas, los formularios y los ajustes.
- `vite.config.ts` configura la compilación, el manifiesto y la precarga sin conexión.
- `PROGRESS.md` recoge las fases y la verificación realizada. Los avisos de las dependencias distribuidas se incluyen en `public/avisos-de-terceros.txt`.
