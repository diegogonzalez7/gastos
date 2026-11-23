import { expect, test, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'

async function navigate(page: Page, label: string) {
  await page.getByRole('navigation', { name: 'Navegación principal' }).getByRole('link', { name: label, exact: true }).click()
  await expect(page.getByRole('heading', { name: label, level: 1 })).toBeVisible()
}

async function add(page: Page, concept: string, amount: string, date: string, category = 'food') {
  await page.getByRole('button', { name: 'Nuevo movimiento' }).click()
  const dialog = page.getByRole('dialog')
  if (category === 'salary') await dialog.getByRole('button', { name: 'Ingreso', exact: true }).click()
  await dialog.getByLabel('Importe', { exact: true }).fill(amount)
  await dialog.getByLabel('Concepto').fill(concept)
  await dialog.getByLabel('Categoría').selectOption(category)
  await dialog.getByLabel('Fecha').fill(date)
  await dialog.getByRole('button', { name: 'Guardar movimiento' }).click()
  await expect(dialog).toHaveCount(0)
}

async function backups(page: Page) {
  const more = page.getByRole('button', { name: 'Más', exact: true })
  if (await more.isVisible()) await more.click()
  await page.getByRole('button', { name: 'Copias de seguridad', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Copias de seguridad' })).toBeVisible()
}

const signed = (value: string) => value.replace(/\s/g, '')
async function balance(page: Page, expected: string) {
  await expect.poll(async () => signed(await page.locator('.balance-amount').innerText())).toBe(expected)
}

test.beforeEach(async ({ page }) => {
  await page.goto('./')
  await expect(page.getByRole('button', { name: 'Nuevo movimiento' })).toBeEnabled()
})

test('el libro mensual se calcula, persiste y se corrige desde el historial', async ({ page }) => {
  await balance(page, '0,00€')
  await add(page, 'Nómina de febrero', '2000', '2024-02-03', 'salary')
  await add(page, 'Mercado central', '36,50', '2024-02-29')
  await add(page, 'Abono de metro', '18.25', '2024-02-10', 'transport')
  await balance(page, '1.945,25€')
  await expect(page.locator('.hero-metric').first()).toContainText('2.000,00')
  await expect(page.locator('.hero-metric').last()).toContainText('54,75')
  await expect(page.locator('.entry-list .entry-row')).toHaveCount(3)
  await navigate(page, 'Categorías')
  const ranks = page.locator('.rank-row')
  await expect(ranks).toHaveCount(2)
  await expect(ranks.first()).toContainText('Alimentación')
  await expect(ranks.first()).toContainText('67')
  await ranks.first().click()
  await expect(page.getByRole('button', { name: 'Editar Mercado central' })).toBeVisible()
  await expect(page.locator('.entry-row')).toHaveCount(1)
  await page.getByRole('button', { name: 'Quitar filtro de Alimentación' }).click()
  await page.getByRole('button', { name: 'Editar Mercado central' }).click()
  await page.getByLabel('Importe', { exact: true }).fill('46,50')
  await page.getByRole('button', { name: 'Guardar cambios' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await navigate(page, 'Resumen')
  await balance(page, '1.935,25€')
  await page.getByRole('button', { name: 'Mes siguiente' }).click()
  await balance(page, '0,00€')
  await page.getByRole('button', { name: 'Mes anterior' }).click()
  await balance(page, '1.935,25€')
  // Tras recargar se abre el mes actual. El historial conserva los meses anteriores.
  await page.reload()
  await navigate(page, 'Movimientos')
  await page.getByRole('button', { name: 'Elegir periodo' }).click()
  await page.getByRole('button', { name: 'Todos los meses' }).click()
  await page.getByRole('searchbox').fill('nomina')
  await expect(page.locator('.entry-row')).toHaveCount(1)
  await expect(page.locator('.entry-row')).toContainText('Nómina de febrero')
  await page.getByRole('searchbox').fill('')
  await page.getByRole('button', { name: 'Gastos', exact: true }).click()
  await expect(page.locator('.entry-row')).toHaveCount(2)
  await page.getByRole('button', { name: 'Editar Abono de metro' }).click()
  await page.getByRole('button', { name: 'Eliminar movimiento' }).click()
  await page.getByRole('button', { name: 'Cancelar' }).click()
  await expect(page.getByRole('dialog', { name: 'Editar movimiento' })).toBeVisible()
  await page.getByRole('button', { name: 'Eliminar movimiento' }).click()
  await page.getByRole('button', { name: 'Sí, eliminar' }).click()
  await expect(page.getByRole('button', { name: 'Editar Abono de metro' })).toHaveCount(0)
  await expect(page.locator('.entry-row')).toHaveCount(1)
})

test('registro rápido, validación, tema y tamaño de pantalla', async ({ page }) => {
  await page.getByRole('button', { name: 'Registrar en Transporte' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByLabel('Categoría')).toHaveValue('transport')
  await expect(dialog.getByLabel('Importe', { exact: true })).toHaveAttribute('inputmode', 'decimal')
  await dialog.getByLabel('Importe', { exact: true }).fill('-2')
  await dialog.getByLabel('Concepto').fill('Autobús')
  await dialog.getByRole('button', { name: 'Guardar movimiento' }).click()
  await expect(dialog.getByRole('alert')).toContainText('dos decimales')
  await dialog.getByLabel('Importe', { exact: true }).fill('1,25')
  await dialog.getByRole('button', { name: 'Guardar movimiento' }).click()
  await balance(page, '-1,25€')
  const more = page.getByRole('button', { name: 'Más', exact: true })
  if (await more.isVisible()) await more.click()
  await page.getByRole('button', { name: 'Tema oscuro' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await balance(page, '-1,25€')
  await expect(page.getByRole('button', { name: 'Editar Autobús' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('exportar y restaurar conserva todas las fechas y exige confirmación', async ({ page }) => {
  await add(page, 'Libro', '15', '2023-12-29', 'meal')
  await add(page, 'Billete', '3,55', '2024-01-02', 'transport')
  await backups(page)
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Descargar copia' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/^mi-dinero-\d{4}-\d{2}-\d{2}\.json$/)
  const file = JSON.parse(await readFile((await download.path())!, 'utf8'))
  expect(file.transactions.map((t: { date: string }) => t.date).sort()).toEqual(['2023-12-29', '2024-01-02'])
  await expect(page.getByText('Última exportación:')).toBeVisible()
  const upload = (data: unknown) => page.getByLabel('Archivo de copia').setInputFiles({
    name: 'copia.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(data)),
  })
  await upload({ ...file, transactions: [...file.transactions, file.transactions[0]] })
  await expect(page.getByRole('alert')).toContainText('duplicados')
  await upload({ ...file, transactions: [] })
  await expect(page.getByText('Esta copia dejará tu historial vacío.')).toBeVisible()
  await page.getByRole('button', { name: 'Cancelar' }).click()
  await page.getByRole('button', { name: 'Cerrar' }).click()
  await balance(page, '-3,55€')
  await backups(page)
  await expect(page.getByText('Última exportación:')).toBeVisible()
  await upload({ ...file, transactions: [] })
  const rescuePromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Descargar copia del historial actual' }).click()
  const rescue = await rescuePromise
  expect(rescue.suggestedFilename()).toMatch(/^mi-dinero-antes-de-restaurar-/)
  expect(JSON.parse(await readFile((await rescue.path())!, 'utf8')).transactions).toEqual(file.transactions)
  await expect(page.getByRole('dialog', { name: 'Confirmar restauración' })).toBeVisible()
  await page.getByRole('button', { name: 'Restaurar copia', exact: true }).click()
  await balance(page, '0,00€')
  await backups(page)
  await upload(file)
  await expect(page.getByText('Diciembre de 2023 a Enero de 2024')).toBeVisible()
  await page.getByRole('button', { name: 'Restaurar copia', exact: true }).click()
  await balance(page, '-3,55€')
  await page.getByRole('button', { name: 'Mes anterior' }).click()
  await balance(page, '-15,00€')
})

test('la PWA abre bajo una subruta y el libro funciona sin red', async ({ page, context }) => {
  const manifestURL = await page.locator('link[rel=manifest]').evaluate(el => (el as HTMLLinkElement).href)
  const manifest = await (await page.request.get(manifestURL)).json()
  expect(manifest.display).toBe('standalone')
  expect(new URL(manifest.start_url, manifestURL).pathname).toBe('/gastos/')
  for (const icon of manifest.icons) {
    const response = await page.request.get(new URL(icon.src, manifestURL).href)
    expect(response.headers()['content-type']).toContain('image/png')
    expect((await response.body()).readUInt32BE(16)).toBe(Number(icon.sizes.split('x')[0]))
  }
  await page.evaluate(() => navigator.serviceWorker.ready)
  await page.reload()
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true)
  await context.setOffline(true)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Últimos movimientos' })).toBeVisible()
  await expect.poll(() => page.locator('.hero-wallet').evaluate(node => (node as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
  await add(page, 'Sin conexión', '7,95', '2025-01-10')
  await balance(page, '-7,95€')
  const newPage = await context.newPage()
  await newPage.goto(page.url())
  await navigate(newPage, 'Movimientos')
  await newPage.getByRole('button', { name: 'Elegir periodo' }).click()
  await newPage.getByRole('button', { name: 'Todos los meses' }).click()
  await expect(newPage.getByRole('button', { name: 'Editar Sin conexión' })).toBeVisible()
})

test('editar el tipo y la fecha traslada el importe al mes correcto', async ({ page }) => {
  await add(page, 'Devolución', '12,40', '2024-12-31', 'clothes')
  await page.getByRole('button', { name: 'Editar Devolución' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'Ingreso', exact: true }).click()
  await dialog.getByLabel('Categoría').selectOption('otherIncome')
  await dialog.getByLabel('Fecha').fill('2025-01-01')
  await dialog.getByRole('button', { name: 'Guardar cambios' }).click()
  await balance(page, '12,40€')
  await expect(page.getByRole('button', { name: 'Elegir periodo' })).toContainText('Enero 2025')
  await expect(page.locator('.hero-metric').last()).toContainText('0,00')
  await page.getByRole('button', { name: 'Elegir periodo' }).click()
  await page.getByRole('button', { name: 'Año anterior' }).click()
  await page.getByRole('button', { name: 'Diciembre', exact: true }).click()
  await balance(page, '0,00€')
})

test('una restauración detecta cambios posteriores a la vista previa', async ({ page, context }) => {
  await backups(page)
  await page.getByLabel('Archivo de copia').setInputFiles({
    name: 'vacía.json', mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ app: 'mi-dinero', version: 1, currency: 'EUR', transactions: [] })),
  })
  await expect(page.getByRole('dialog', { name: 'Confirmar restauración' })).toBeVisible()
  const second = await context.newPage()
  await second.goto('./')
  await add(second, 'Movimiento simultáneo', '9,99', '2024-04-10')
  await page.getByRole('button', { name: 'Restaurar copia', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('otra ventana')
  await page.getByRole('button', { name: 'Cerrar' }).click()
  await navigate(page, 'Movimientos')
  await page.getByRole('button', { name: 'Elegir periodo' }).click()
  await page.getByRole('button', { name: 'Todos los meses' }).click()
  await expect(page.getByRole('button', { name: 'Editar Movimiento simultáneo' })).toBeVisible()
})

test('dos ventanas no sobrescriben una edición ya guardada', async ({ page, context }) => {
  await page.getByRole('button', { name: 'Registrar en Ropa' }).click()
  await page.getByLabel('Importe', { exact: true }).fill('30')
  await page.getByLabel('Concepto').fill('Luz')
  await page.getByRole('button', { name: 'Guardar movimiento' }).click()
  const second = await context.newPage()
  await second.goto('./')
  await second.getByRole('button', { name: 'Editar Luz' }).click()
  await page.getByRole('button', { name: 'Editar Luz' }).click()
  await page.getByLabel('Importe', { exact: true }).fill('40')
  await page.getByRole('button', { name: 'Guardar cambios' }).click()
  await balance(page, '-40,00€')
  await second.getByLabel('Importe', { exact: true }).fill('50')
  await second.getByRole('button', { name: 'Guardar cambios' }).click()
  await expect(second.getByRole('alert')).toContainText('otra ventana')
  await second.getByRole('button', { name: 'Cerrar' }).click()
  await second.getByRole('button', { name: 'Descartar cambios' }).click()
  await balance(second, '-40,00€')
})

test('el saldo inicial acompaña el historial y se restaura con la copia', async ({ page }) => {
  const setOpening = async (amount: string) => {
    await page.getByRole('button', { name: 'Editar saldo inicial' }).click()
    await page.getByLabel('Saldo inicial en euros').fill(amount)
    await page.getByRole('button', { name: 'Guardar saldo inicial' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
  }
  await setOpening('500')
  await add(page, '', '15,25', '2024-09-01', 'food')
  await expect(page.getByRole('button', { name: 'Editar Alimentación' })).toBeVisible()
  await add(page, '', '120', '2024-11-15', 'salary')
  await balance(page, '120,00€')
  const balances = page.getByRole('region', { name: 'Saldos de la cuenta' }).locator('strong')
  await expect(balances.nth(1)).toContainText('604,75')
  await page.getByRole('button', { name: 'Mes anterior' }).click()
  await balance(page, '0,00€')
  await expect(balances.nth(1)).toContainText('484,75')
  await expect(balances.nth(2)).toContainText('604,75')
  await backups(page)
  const filePromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Descargar copia' }).click()
  const path = (await (await filePromise).path())!
  expect(JSON.parse(await readFile(path, 'utf8')).openingCents).toBe(50000)
  await page.getByRole('button', { name: 'Cerrar' }).click()
  await page.getByRole('button', { name: 'Editar saldo inicial' }).click()
  await page.getByLabel('Saldo inicial en euros').fill('50')
  await page.getByRole('button', { name: 'Saldo positivo o cero' }).click()
  await page.getByRole('button', { name: 'Guardar saldo inicial' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(balances.nth(2)).toContainText('54,75')
  await backups(page)
  await page.getByLabel('Archivo de copia').setInputFiles(path)
  await page.getByRole('button', { name: 'Restaurar copia', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.reload()
  await expect(balances.first()).toContainText('500,00')
  await expect(balances.nth(2)).toContainText('604,75')
})

test('actualizar la app conserva la base de datos anterior', async ({ browser, page }) => {
  const fresh = await browser.newContext()
  try {
    const tab = await fresh.newPage()
    await tab.goto(new URL('icons/apple-touch.png', page.url()).href)
    await tab.evaluate(() => new Promise<void>((resolve, reject) => {
      const req = indexedDB.open('mi-dinero', 1)
      req.onupgradeneeded = () => {
        req.result.createObjectStore('entries', { keyPath: 'id' }).add({
          id: crypto.randomUUID(), kind: 'expense', cents: 1400, category: 'food',
          concept: 'Registro anterior', date: '2024-09-18', createdAt: 1,
        })
      }
      req.onsuccess = () => { req.result.close(); resolve() }
      req.onerror = () => reject(req.error)
    }))
    await tab.goto(page.url())
    const strip = tab.getByRole('region', { name: 'Saldos de la cuenta' })
    await expect(strip.locator('strong').last()).toContainText('-14,00')
    await expect(strip.locator('strong').first()).toContainText('0,00')
  } finally { await fresh.close() }
})

test('el balance de cuatro cifras y los importes largos caben en una línea', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await add(page, 'Ingreso de prueba', '1179,88', '2026-10-01', 'salary')
  await balance(page, '1.179,88€')
  const amount = page.locator('.balance-value')
  await page.evaluate(() => document.fonts.ready)
  const fits = () => amount.evaluate(node => {
    const text = document.createRange()
    text.selectNodeContents(node)
    const [line, ...rest] = text.getClientRects()
    return !!line && rest.length === 0 && line.right <= node.parentElement!.getBoundingClientRect().right
  })
  await expect.poll(fits).toBe(true)
  await page.setViewportSize({ width: 320, height: 700 })
  await expect.poll(fits).toBe(true)
  await add(page, 'Importe largo', '999999999,99', '2026-10-02')
  await balance(page, '-999.998.820,11€')
  await expect.poll(fits).toBe(true)
})

test('el arranque muestra el icono y el crédito hasta que el historial está listo', async ({ browser, page }) => {
  const context = await browser.newContext({ colorScheme: 'dark', reducedMotion: 'reduce', serviceWorkers: 'block' })
  let loadApp!: () => void
  const moduleGate = new Promise<void>(resolve => { loadApp = resolve })
  try {
    const holder = await context.newPage()
    await holder.goto(new URL('icons/apple-touch.png', page.url()).href)
    await holder.evaluate(() => new Promise<void>((resolve, reject) => {
      const req = indexedDB.open('mi-dinero', 1)
      req.onupgradeneeded = () => req.result.createObjectStore('entries', { keyPath: 'id' })
      req.onsuccess = () => { Reflect.set(window, 'startupTestDb', req.result); resolve() }
      req.onerror = () => reject(req.error)
    }))
    const tab = await context.newPage()
    await tab.route('**/assets/index-*.js', async route => {
      await moduleGate
      await route.continue()
    })
    await tab.goto(page.url(), { waitUntil: 'commit' })
    const loading = tab.getByRole('status', { name: 'Cargando Mi Dinero' })
    await expect(loading).toContainText('Powered by diegogonzalez7')
    await expect(loading).toHaveCSS('background-color', 'rgb(17, 27, 26)')
    await expect.poll(() => loading.locator('img').evaluate(img => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
    loadApp()
    await expect(tab.locator('.app-shell')).toHaveAttribute('inert', '')
    await expect(loading).toBeVisible()
    await holder.close()
    await expect(loading).toBeHidden()
    await expect(tab.getByRole('button', { name: 'Nuevo movimiento' })).toBeEnabled()
    await expect(tab.locator('.page-content')).toHaveCSS('animation-name', 'none')
  } finally {
    loadApp()
    await context.close()
  }
})

test('categorías solicitadas, teclado y movimientos de versiones anteriores', async ({ page }) => {
  await page.getByRole('button', { name: 'Nuevo movimiento' }).click()
  const dialog = page.getByRole('dialog')
  const amount = dialog.getByLabel('Importe', { exact: true })
  await expect(amount).toHaveAttribute('inputmode', 'decimal')
  await expect(amount).not.toBeFocused()
  await expect(dialog.getByLabel('Concepto')).toHaveAttribute('inputmode', 'text')
  const options = await dialog.getByLabel('Categoría').locator('option').allTextContents()
  expect(options).toEqual(['Alimentación', 'Transporte', 'Máquina Trabajo', 'Ropa', 'Peluquería', 'Veterinario', 'Comida', 'Spotify', 'Regalo', 'Bet365', 'Quiniela', 'Otro'])
  await dialog.getByRole('button', { name: 'Ingreso', exact: true }).click()
  expect(await dialog.getByLabel('Categoría').locator('option').allTextContents()).toEqual(['Nómina', 'Bet365', 'Quiniela', 'Regalo', 'Otro'])
  await dialog.getByRole('button', { name: 'Cerrar' }).click()
  await dialog.getByRole('button', { name: 'Descartar cambios' }).click()
  await page.getByRole('button', { name: 'Editar saldo inicial' }).click()
  await expect(page.getByLabel('Saldo inicial en euros')).toHaveAttribute('inputmode', 'decimal')
})

test('Supermercado anterior se agrupa en Alimentación sin perder movimientos', async ({ page }) => {
  const ledger = {
    app: 'mi-dinero', version: 2, currency: 'EUR', openingCents: 0,
    transactions: [
      { id: '11111111-1111-4111-8111-111111111111', kind: 'expense', category: 'supermarket', cents: 1000, date: '2024-09-01', concept: 'Compra antigua', createdAt: 1 },
      { id: '22222222-2222-4222-8222-222222222222', kind: 'expense', category: 'food', cents: 500, date: '2024-09-01', concept: 'Compra nueva', createdAt: 2 },
      { id: '33333333-3333-4333-8333-333333333333', kind: 'expense', category: 'home', cents: 200, date: '2024-09-01', concept: 'Anterior hogar', createdAt: 3 },
    ],
  }
  await backups(page)
  await page.getByLabel('Archivo de copia').setInputFiles({ name: 'anterior.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(ledger)) })
  await page.getByRole('button', { name: 'Restaurar copia', exact: true }).click()
  await navigate(page, 'Movimientos')
  await page.getByRole('button', { name: 'Elegir periodo' }).click()
  await page.getByRole('button', { name: 'Todos los meses' }).click()
  await page.getByRole('button', { name: 'Editar Compra antigua' }).click()
  await expect(page.getByLabel('Categoría')).toHaveValue('food')
  await page.getByRole('button', { name: 'Guardar cambios' }).click()
  await page.getByRole('button', { name: 'Editar Anterior hogar' }).click()
  await expect(page.getByLabel('Categoría')).toHaveValue('home')
  await page.getByRole('button', { name: 'Cerrar' }).click()
  await page.getByRole('button', { name: 'Elegir periodo' }).click()
  await page.getByRole('button', { name: 'Septiembre' }).click()
  await navigate(page, 'Categorías')
  await expect(page.getByRole('button', { name: 'Ver movimientos de Alimentación' })).toContainText('15,00')
})

test('escribir la coma primero completa el cero y guarda el gasto en céntimos', async ({ page }) => {
  await page.getByRole('button', { name: 'Nuevo movimiento' }).click()
  const dialog = page.getByRole('dialog')
  const amount = dialog.getByLabel('Importe', { exact: true })
  await amount.pressSequentially(',')
  await expect(amount).toHaveValue('0,')
  await amount.pressSequentially('9')
  await expect(amount).toHaveValue('0,9')
  await amount.pressSequentially('07')
  await expect(amount).toHaveValue('0,90')
  await amount.fill('1,999')
  await expect(amount).toHaveValue('0,90')
  await dialog.getByLabel('Categoría').selectOption('machine')
  await dialog.getByRole('button', { name: 'Guardar movimiento' }).click()
  await balance(page, '-0,90€')
  await expect(page.getByRole('button', { name: 'Editar Máquina Trabajo' })).toContainText('0,90\u202f€')

  await page.getByRole('button', { name: 'Editar saldo inicial' }).click()
  const opening = dialog.getByLabel('Saldo inicial en euros')
  await opening.fill('.25')
  await expect(opening).toHaveValue('0,25')
  await opening.pressSequentially('4')
  await expect(opening).toHaveValue('0,25')
})

test('un mes anterior se destaca, Hoy cambia la fecha y cerrar protege el borrador', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-23T12:00:00+01:00'))
  await page.reload()
  await page.getByRole('button', { name: 'Mes anterior' }).click()
  await page.getByRole('button', { name: 'Nuevo movimiento' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByLabel('Fecha')).toHaveValue('2026-10-01')
  await expect(dialog.getByLabel('Fecha')).toHaveAccessibleDescription('Mes del movimiento: Octubre de 2026')
  await dialog.getByRole('button', { name: 'Hoy', exact: true }).click()
  await dialog.getByLabel('Importe', { exact: true }).fill('0,95')
  await dialog.getByLabel('Concepto').fill('Café')
  await dialog.getByRole('button', { name: 'Cerrar' }).click()
  await expect(dialog).toHaveAccessibleName('¿Descartar cambios?')
  await dialog.getByRole('button', { name: 'Seguir editando' }).click()
  await expect(dialog.getByLabel('Importe', { exact: true })).toHaveValue('0,95')
  await expect(dialog.getByLabel('Concepto')).toHaveValue('Café')
  await expect(dialog.getByLabel('Fecha')).toHaveValue('2026-11-23')
  await page.keyboard.press('Escape')
  await dialog.getByRole('button', { name: 'Descartar cambios' }).click()
  await expect(dialog).toHaveCount(0)
  await balance(page, '0,00€')
})

test('duplicar un movimiento permite confirmar una copia con fecha de hoy', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-23T12:00:00+01:00'))
  await add(page, 'Café', '0,90', '2026-10-01', 'machine')
  await page.getByRole('button', { name: 'Editar Café' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Importe', { exact: true }).fill('0,95')
  await dialog.getByRole('button', { name: 'Duplicar movimiento' }).click()
  await expect(dialog).toHaveAccessibleName('¿Descartar cambios?')
  await dialog.getByRole('button', { name: 'Descartar cambios' }).click()
  await expect(dialog).toHaveAccessibleName('Duplicar movimiento')
  await expect(dialog.getByLabel('Importe', { exact: true })).toHaveValue('0,90')
  await expect(dialog.getByLabel('Concepto')).toHaveValue('Café')
  await expect(dialog.getByLabel('Categoría')).toHaveValue('machine')
  await expect(dialog.getByLabel('Fecha')).toHaveValue('2026-11-23')
  await dialog.getByRole('button', { name: 'Cerrar' }).click()
  await expect(dialog).toHaveCount(0)
  await page.getByRole('button', { name: 'Mes siguiente' }).click()
  await balance(page, '0,00€')
  await page.getByRole('button', { name: 'Mes anterior' }).click()
  await page.getByRole('button', { name: 'Editar Café' }).click()
  await dialog.getByRole('button', { name: 'Duplicar movimiento' }).click()
  await dialog.getByLabel('Importe', { exact: true }).fill('0,95')
  await dialog.getByRole('button', { name: 'Guardar movimiento' }).click()
  await balance(page, '-0,95€')
  await page.getByRole('button', { name: 'Mes anterior' }).click()
  await balance(page, '-0,90€')
})

test('Compartir entrega la copia JSON al sistema y anota la fecha', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'canShare', { value: (data: ShareData) => data.files?.[0]?.type === 'application/json' })
    Object.defineProperty(navigator, 'share', { value: async (data: ShareData) => {
      const active = navigator.userActivation.isActive
      const file = data.files?.[0]
      const backup = file ? JSON.parse(await file.text()) : null
      Reflect.set(window, 'sharedBackup', { active, backup })
    } })
  })
  await page.reload()
  await add(page, 'Copia compartida', '1,20', '2024-01-02')
  await backups(page)
  await page.getByRole('button', { name: 'Compartir copia' }).click()
  await expect(page.getByText('Última exportación:')).toBeVisible()
  expect(await page.evaluate(() => Reflect.get(window, 'sharedBackup'))).toMatchObject({
    active: true,
    backup: { version: 2, transactions: [{ concept: 'Copia compartida', cents: 120 }] },
  })
})
