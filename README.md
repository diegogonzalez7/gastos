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

- **Empezar con tus cuentas de septiembre.** En **Resumen → Saldo inicial del banco**, introduce el saldo bancario que tenías justo antes del primer movimiento. Puede ser positivo, cero o negativo. Si lo ajustaste con el cálculo anterior, revísalo tras clasificar los gastos en efectivo.
- **Registrar.** Pulsa **Nuevo movimiento** o **Nuevo** en el móvil. Elige gasto o ingreso, escribe el importe, añade un concepto si quieres y revisa la categoría y la fecha y pulsa **Guardar movimiento**. Los accesos de **Registro rápido** abren el formulario con la categoría elegida.
- **Fecha y cambios pendientes.** Cuando la fecha corresponde a otro mes, el formulario indica cuál. Toca **Hoy** para usar la fecha actual. Si cierras un formulario con cambios, puedes seguir editándolo o descartarlos.
- **Efectivo y banco.** En los gastos, selecciona **Pagado desde → Cuenta bancaria** para pagos como tarjeta, Bizum y transferencias, o **Efectivo** si pagaste en metálico. **Máquina Trabajo** siempre cuenta como efectivo, incluidos los movimientos antiguos. Los demás gastos antiguos se consideran bancarios hasta que cambies su forma de pago.
- **Cajero.** Pulsa **Nuevo → Retirada** para registrar dinero que sacaste de tu cuenta. La retirada reduce el saldo bancario. Registra después cada compra como gasto en efectivo para que cuente en el gasto mensual.
- **Consultar.** El balance del mes muestra ingresos menos todos los gastos, incluidos los pagos en efectivo. El **saldo bancario al cierre** combina el saldo inicial, los ingresos, los gastos bancarios y las retiradas hasta el mes elegido. El **saldo bancario total** considera todos los meses del historial. Las flechas cambian de mes. Toca el nombre del mes para elegir otro periodo o volver al actual.
- **Buscar y corregir.** En **Movimientos** puedes buscar por concepto o categoría y filtrar ingresos o gastos. El selector de periodo incluye **Todos los meses**. Toca una fila para editarla o eliminarla con confirmación.
- **Repetir un movimiento.** Abre un movimiento guardado y pulsa **Duplicar movimiento**. La copia empieza con la fecha de hoy y puedes ajustar sus datos antes de guardarla.
- **Favoritos con importe.** En **Resumen → Registro rápido → Añadir favorito**, guarda un gasto o ingreso con su importe, categoría y concepto. Al tocar el favorito se abre un movimiento editable con la fecha de hoy. Usa **Gestionar favoritos** para añadir, editar o borrar accesos. Cada dispositivo guarda sus propios favoritos.
- **Entender los gastos.** **Categorías** ordena los gastos del mes por importe y muestra su porcentaje. Toca una categoría del desglose para consultar los movimientos que la componen.
- **Apariencia.** La opción inicial sigue el tema del sistema. Puedes elegir claro u oscuro desde la barra lateral o desde **Más** en el móvil.

En **Más → Apariencia → Diseños** puedes usar **Original**, **Medianoche**, **Grafito**, **Ciruela** o **Arena**. En ordenador, el acceso está en **Apariencia**, en la barra lateral. Medianoche, Grafito y Ciruela tienen fondo oscuro. Arena usa tonos crema. La elección se guarda en cada dispositivo y al volver a Original se recupera el modo de color que tenías seleccionado allí.

## Copias de seguridad

Abre **Copias de seguridad** desde la barra lateral o el menú **Más**. **Descargar copia** guarda el saldo inicial y todos los meses en un archivo `mi-dinero-AAAA-MM-DD.json`. El archivo contiene los conceptos e importes en texto legible. Guárdalo en un lugar privado.

Las copias nuevas conservan las formas de pago y las retiradas. Puedes restaurar las copias anteriores. Los gastos antiguos de Máquina Trabajo se interpretan como efectivo también al restaurarlos.

El panel indica la fecha de la última exportación iniciada desde el dispositivo. Si el navegador admite compartir archivos, **Compartir copia** abre el menú del sistema para enviarla o guardarla en **Archivos**.

Para recuperar el historial, pulsa **Elegir archivo** y revisa los movimientos que se añadirán, modificarán o eliminarán, así como los meses y el saldo inicial. Antes de confirmar puedes **Guardar mi historial actual en Dropbox** si has conectado tu cuenta, o descargarlo al dispositivo. La restauración reemplaza todo el historial de ese dispositivo y su saldo inicial en una sola operación. Las copias de la primera versión se recuperan con saldo inicial de 0 €, que puedes ajustar en Resumen. Si el archivo es inválido, está duplicado internamente o el historial cambia en otra ventana durante la confirmación, la app conserva los datos que ya había.

Cada origen web, perfil del navegador o dispositivo puede tener su propio almacén. Exporta una copia antes de cambiar de móvil, dominio o navegador, o de borrar los datos del sitio. Puedes usarla en la app instalada si esta abre un historial vacío.

### Copias en Dropbox desde iPhone y Windows

Mi Dinero usa una carpeta privada de Dropbox. Puedes usar una cuenta gratuita y acceder desde el navegador o la app instalada. Las copias subidas son archivos JSON legibles en tu Dropbox y cada subida crea un archivo nuevo. El historial de trabajo se sigue guardando en el dispositivo.

1. En el ordenador abre la [consola de aplicaciones de Dropbox](https://www.dropbox.com/developers/apps) con la cuenta con la que guardarás las copias. Crea una aplicación con **Scoped access** y **App folder**. Elige un nombre único, por ejemplo `Copias Mi Dinero Diego`.
2. En **Permissions**, marca `files.metadata.read`, `files.content.read` y `files.content.write`. Pulsa **Submit** para guardar. En **Settings**, copia **App key**. Para configurar Mi Dinero solo necesitas la **App key**. Conserva el **App secret** en Dropbox.
3. En **Copias de seguridad → Conectar con Dropbox**, pega la **App key** y pulsa **Continuar → Abrir Dropbox**. Autoriza el acceso, copia el código que te muestra Dropbox y vuelve a Mi Dinero para pegarlo y pulsar **Conectar cuenta**. Hazlo una vez en cada dispositivo con la misma App key y cuenta. El paso del código permite volver a la PWA instalada desde el navegador que abre Dropbox en el iPhone.
4. En el dispositivo de origen, pulsa **Subir copia a la nube**. En el otro, pulsa **Buscar copias en la nube**, elige la copia por fecha y revisa la vista previa. **Restaurar copia** reemplaza el historial local tras confirmarlo. Puedes descargar una copia del historial actual desde esa misma vista.

Puedes usar **Desconectar Dropbox en este dispositivo** al acabar, especialmente en un ordenador compartido. Las copias siguen accesibles en la carpeta de la aplicación en Dropbox. Para transferencias manuales siguen disponibles **Descargar copia**, **Compartir copia** y **Elegir archivo**.

## Recordatorios

Abre **Más → Recordatorios** en el móvil o **Recordatorios** en la barra lateral del ordenador. Crea un pago, elige la fecha y la hora y guarda. Desde el recordatorio puedes editarlo, marcarlo como pagado o eliminarlo. Los recordatorios nuevos se incluyen en el JSON y las copias antiguas conservan los recordatorios del dispositivo.

Para recibir el aviso con Mi Dinero cerrada, programa el aviso en el dispositivo desde el recordatorio guardado.

- **Calendario.** Usa **Descargar cita** o **Compartir cita**, si el navegador admite compartir ese archivo. Importa el archivo `.ics` en tu calendario y verifica que la cita tiene un aviso a la hora de inicio. Si el iPhone no permite importar el archivo directamente, usa el atajo siguiente.
- **Recordatorios de Apple.** Configura una vez un atajo llamado **Pago de Mi Dinero** en la app Atajos. Después, en Mi Dinero pulsa **Usar Recordatorios de Apple → Abrir atajo**.

Para configurar el atajo en el iPhone:

1. Crea un atajo con el nombre **Pago de Mi Dinero** y añade **Obtener diccionario de la entrada**. Usa **Entrada del atajo** como entrada.
2. Añade dos acciones **Obtener valor del diccionario**, ambas apuntando al primer diccionario. Obtén las claves `titulo` y `fecha`.
3. Añade **Obtener fechas de la entrada** y selecciona el valor de `fecha`. Mi Dinero proporciona la fecha con su zona horaria.
4. Añade **Añadir nuevo recordatorio**. Usa el valor de `titulo` como título, elige un aviso por hora y usa la fecha que devolvió el paso anterior.

El calendario o Recordatorios de Apple se encargan de la notificación tras guardar el aviso allí. Si cambias un pago, lo marcas como pagado o lo eliminas en Mi Dinero, actualiza también el aviso que ya hayas añadido en la otra app.

## Cierre mensual

Desde el día 1 puedes abrir el **Cierre del mes anterior** en **Resumen**. Si seleccionas otro mes ya terminado, el enlace abre el cierre de ese periodo. Desliza o usa las flechas para pasar por el balance, la categoría con más gasto, el gasto más alto, la comparación con el mes anterior y el saldo al cierre. La comparación aparece cuando hay movimientos en ambos meses. Los importes se calculan con los datos que tienes en ese dispositivo.

En el iPhone, abre **Más → Aviso del cierre mensual → Abrir atajo**. Usa el atajo **Pago de Mi Dinero** para crear el primer aviso. Luego abre ese aviso en **Recordatorios** y selecciona **Repetir → Cada mes**. Si prefieres el calendario, en el mismo panel puedes descargar e importar una cita recurrente con alerta. Ambas opciones proponen el día 1 a las 09:00, hora local.

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
