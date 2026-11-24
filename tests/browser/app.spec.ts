import { expect, test, type BrowserContext, type Page } from '@playwright/test'
import { createHash } from 'node:crypto'
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
  await expect(page.locator('.restore-removals')).toHaveText('Se eliminarán2')
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

test('Dropbox conserva varias copias y permite restaurarlas entre dispositivos', async ({ page, context, browser, baseURL }) => {
  const appKey = 'mi-dinero-pruebas'
  const challenges = new Map<string, string>()
  const cloud = new Map<string, { name: string, server_modified: string, contents: string }>()

  async function fakeDropbox(target: BrowserContext) {
    await target.route('https://api.dropboxapi.com/oauth2/token', async route => {
      const body = new URLSearchParams(route.request().postData() ?? '')
      expect(body.get('client_id')).toBe(appKey)
      expect(body.has('client_secret')).toBe(false)
      if (body.get('grant_type') === 'authorization_code') {
        const verifier = body.get('code_verifier') ?? ''
        const challenge = createHash('sha256').update(verifier).digest('base64url')
        expect(challenge).toBe(challenges.get(body.get('code')!))
        await route.fulfill({ json: { refresh_token: 'refresh-token-pruebas' } })
      } else {
        expect(body.get('grant_type')).toBe('refresh_token')
        expect(body.get('refresh_token')).toBe('refresh-token-pruebas')
        await route.fulfill({ json: { access_token: 'access-token-pruebas' } })
      }
    })
    await target.route(/^https:\/\/(?:api|content)\.dropboxapi\.com\/2\/files\//, async route => {
      const request = route.request()
      expect(request.headers().authorization).toBe('Bearer access-token-pruebas')
      const endpoint = new URL(request.url()).pathname.split('/2/files/')[1]
      if (endpoint.startsWith('list_folder')) {
        const next = endpoint.endsWith('/continue')
        expect(request.postDataJSON()).toEqual(next ? { cursor: 'test-cursor' } : { path: '', limit: 100 })
        const entries = Array.from(cloud, ([id, { name, server_modified }]) => ({ '.tag': 'file', id, name, server_modified }))
        await route.fulfill({ json: {
          entries: next ? entries.slice(1) : [{ '.tag': 'file', id: 'otro', name: 'otro.json' }, ...entries.slice(0, 1)],
          has_more: !next && entries.length > 1, cursor: 'test-cursor',
        } })
      } else {
        const args = JSON.parse(request.headers()['dropbox-api-arg'])
        if (endpoint === 'upload') {
          expect(args.mode).toBe('add')
          const id = 'id:copy-' + (cloud.size + 1)
          const name = args.path.slice(1)
          expect(name).toMatch(/^mi-dinero-\S+\.json$/)
          expect(Array.from(cloud.values()).some(file => file.name === name)).toBe(false)
          const server_modified = new Date(Date.UTC(2026, 10, 24, 12, cloud.size)).toISOString()
          cloud.set(id, { name, server_modified, contents: request.postData()! })
          await route.fulfill({ json: { id, name, server_modified } })
        } else {
          expect(endpoint).toBe('download')
          await route.fulfill({ body: cloud.get(args.path)!.contents, contentType: 'application/octet-stream' })
        }
      }
    })
  }

  async function connect(target: Page, code: string) {
    await backups(target)
    await target.getByRole('button', { name: 'Conectar con Dropbox' }).click()
    await target.getByLabel('App key de Dropbox').fill(appKey)
    await target.getByRole('button', { name: 'Continuar', exact: true }).click()
    const url = new URL((await target.getByRole('link', { name: 'Abrir Dropbox' }).getAttribute('href'))!)
    expect(url.origin).toBe('https://www.dropbox.com')
    expect(url.searchParams.get('code_challenge_method')).toBe('S256')
    expect(url.searchParams.get('token_access_type')).toBe('offline')
    challenges.set(code, url.searchParams.get('code_challenge')!)
    await target.getByLabel('Código de Dropbox').fill(code)
    await target.getByRole('button', { name: 'Conectar cuenta' }).click()
    await expect(target.getByRole('button', { name: 'Buscar copias en la nube' })).toBeVisible()
  }

  await fakeDropbox(context)
  const other = await browser.newContext({ baseURL, serviceWorkers: 'block', locale: 'es-ES', timezoneId: 'Europe/Madrid' })
  try {
    await fakeDropbox(other)
    const second = await other.newPage()
    await second.clock.setFixedTime(new Date('2026-11-24T12:00:00+01:00'))
    await second.goto('./')
    await connect(page, 'codigo-iphone')
    await page.getByRole('button', { name: 'Buscar copias en la nube' }).click()
    await expect(page.getByText('Todavía no hay copias guardadas')).toBeVisible()
    await page.getByRole('button', { name: 'Cerrar' }).click()
    await add(page, 'Café desde el móvil', '0,90', '2026-11-24', 'machine')
    await backups(page)
    const upload = (target: Page) => target.getByRole('button', { name: 'Subir copia a la nube' }).click()
    await upload(page)
    await expect(page.getByText('Copia subida a la carpeta privada de Dropbox.')).toBeVisible()

    await connect(second, 'codigo-pc')
    const openLatest = async (target: Page, count: number) => {
      await target.getByRole('button', { name: 'Buscar copias en la nube' }).click()
      const list = target.getByRole('list', { name: 'Copias guardadas en Dropbox' }).getByRole('button')
      await expect(list).toHaveCount(count)
      await expect(list.first()).toContainText(Array.from(cloud.values()).at(-1)!.name)
      await list.first().click()
      await expect(target.getByRole('dialog', { name: 'Confirmar restauración' })).toBeVisible()
    }
    await openLatest(second, 1)
    await balance(second, '0,00€')
    await second.getByRole('button', { name: 'Restaurar copia', exact: true }).click()
    await expect(second.getByRole('button', { name: 'Editar Café desde el móvil' })).toBeVisible()
    await add(second, 'Comida desde el PC', '9', '2026-11-24', 'meal')
    await backups(second)
    await upload(second)
    await expect(second.getByText('Copia subida a la carpeta privada de Dropbox.')).toBeVisible()

    await page.clock.setFixedTime(new Date('2026-11-24T12:00:00+01:00'))
    await page.reload()
    await page.getByRole('button', { name: 'Editar Café desde el móvil' }).click()
    await page.getByLabel('Importe', { exact: true }).fill('1,00')
    await page.getByRole('button', { name: 'Guardar cambios' }).click()
    await add(page, 'Solo en el móvil', '5', '2026-11-24', 'transport')
    await backups(page)
    await openLatest(page, 2)
    await expect(page.getByText('La copia contiene')).toContainText('2 movimientos')
    await expect(page.locator('.restore-comparison dd')).toHaveText(['1', '1', '1'])
    await page.getByRole('button', { name: 'Guardar mi historial actual en Dropbox' }).click()
    await expect(page.getByText('Historial actual guardado en Dropbox.')).toBeVisible()
    const rescue = Array.from(cloud.values()).at(-1)!
    expect(rescue.name).toMatch(/^mi-dinero-antes-de-restaurar-/)
    expect(JSON.parse(rescue.contents).transactions).toEqual(expect.arrayContaining([
      expect.objectContaining({ concept: 'Solo en el móvil', cents: 500 }),
      expect.objectContaining({ concept: 'Café desde el móvil', cents: 100 }),
    ]))
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click()
    await expect(page.getByRole('list', { name: 'Copias guardadas en Dropbox' })).toBeVisible()
    await balance(page, '-6,00€')
    await page.getByRole('button', { name: 'Buscar copias en la nube' }).click()
    const cloudList = page.getByRole('list', { name: 'Copias guardadas en Dropbox' })
    await expect(cloudList.getByRole('button')).toHaveCount(3)
    await cloudList.getByText(cloud.get('id:copy-2')!.name).click()
    await page.getByRole('button', { name: 'Restaurar copia', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Editar Comida desde el PC' })).toBeVisible()
    await backups(page)
    await page.getByRole('button', { name: 'Desconectar Dropbox en este dispositivo' }).click()
    await expect(page.getByRole('button', { name: 'Conectar con Dropbox' })).toBeVisible()
    expect(cloud.size).toBe(3)
  } finally {
    await other.close()
  }
})

test('un favorito conserva importe y categoría y abre un movimiento con fecha de hoy', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-24T12:00:00+01:00'))
  await page.reload()
  await page.getByRole('button', { name: 'Añadir favorito' }).click()
  const favorite = page.getByRole('dialog', { name: 'Nuevo favorito' })
  await favorite.getByLabel('Importe', { exact: true }).fill(',9')
  await favorite.getByLabel('Concepto').fill('Café')
  await favorite.getByLabel('Categoría').selectOption('machine')
  await favorite.getByRole('button', { name: 'Guardar favorito' }).click()
  await balance(page, '0,00€')
  await page.reload()
  await page.getByRole('button', { name: 'Mes anterior' }).click()
  await page.getByRole('button', { name: /Registrar Café.*0,90/ }).click()
  const entry = page.getByRole('dialog', { name: 'Nuevo movimiento' })
  await expect(entry.getByLabel('Importe', { exact: true })).toHaveValue('0,90')
  await expect(entry.getByLabel('Concepto')).toHaveValue('Café')
  await expect(entry.getByLabel('Categoría')).toHaveValue('machine')
  await expect(entry.getByLabel('Fecha', { exact: true })).toHaveValue('2026-11-24')
  await entry.getByRole('button', { name: 'Guardar movimiento' }).click()
  await balance(page, '-0,90€')

  const openFavorite = async () => {
    await page.getByRole('button', { name: 'Gestionar favoritos' }).click()
    await page.getByRole('button', { name: /Editar favorito Café/ }).click()
  }
  await openFavorite()
  await page.getByLabel('Importe', { exact: true }).fill('1,10')
  await page.getByRole('button', { name: 'Guardar favorito' }).click()
  await expect(page.getByRole('button', { name: /Registrar Café.*1,10/ })).toBeVisible()
  await openFavorite()
  await page.getByRole('button', { name: 'Eliminar favorito' }).click()
  await page.getByRole('button', { name: 'Sí, eliminar' }).click()
  await expect(page.getByRole('button', { name: 'Añadir favorito' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Editar Café', exact: true })).toBeVisible()
  await balance(page, '-0,90€')
})

test('un ingreso en efectivo cuenta para el mes y conserva su forma de cobro en favoritos y copias', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-24T12:00:00+01:00'))
  await page.reload()
  await add(page, 'Nómina', '1000', '2026-11-10', 'salary')
  await page.getByRole('button', { name: 'Añadir favorito' }).click()
  const favorite = page.getByRole('dialog', { name: 'Nuevo favorito' })
  await favorite.getByRole('button', { name: 'Ingreso', exact: true }).click()
  await favorite.getByLabel('Importe', { exact: true }).fill('20')
  await favorite.getByLabel('Concepto').fill('Regalo en mano')
  await favorite.getByLabel('Categoría').selectOption('gift')
  await favorite.getByRole('group', { name: 'Recibido en' }).getByRole('button', { name: 'Efectivo' }).click()
  await favorite.getByRole('button', { name: 'Guardar favorito' }).click()
  await page.getByRole('button', { name: /Registrar Regalo en mano/ }).click()
  const editor = page.getByRole('dialog')
  await expect(editor.getByRole('button', { name: 'Efectivo', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await editor.getByRole('button', { name: 'Guardar movimiento' }).click()
  await expect(editor).toHaveCount(0)
  await balance(page, '1.020,00€')
  const bank = page.getByRole('region', { name: 'Saldos de la cuenta' }).locator('strong')
  await expect(bank.nth(1)).toContainText('1.000,00')
  await expect(bank.nth(2)).toContainText('1.000,00')
  await page.reload()
  const row = page.getByRole('button', { name: 'Editar Regalo en mano' })
  await expect(row).toContainText('Efectivo')
  await backups(page)
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Descargar copia', exact: true }).click()
  const exported = JSON.parse(await readFile((await (await download).path())!, 'utf8'))
  expect(exported.version).toBe(5)
  expect(exported.transactions).toContainEqual(expect.objectContaining({ concept: 'Regalo en mano', payment: 'cash' }))
  await page.getByRole('button', { name: 'Cerrar' }).click()
  await row.click()
  await editor.getByRole('button', { name: 'Cuenta bancaria' }).click()
  await editor.getByRole('button', { name: 'Guardar cambios' }).click()
  await expect(bank.nth(2)).toContainText('1.020,00')
  await balance(page, '1.020,00€')

  await backups(page)
  await page.getByLabel('Archivo de copia').setInputFiles({
    name: 'ingreso-efectivo.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(exported)),
  })
  await expect(page.locator('.restore-comparison dd')).toHaveText(['0', '1', '0'])
  await page.getByRole('button', { name: 'Restaurar copia', exact: true }).click()
  await expect(row).toContainText('Efectivo')
  await expect(bank.nth(2)).toContainText('1.000,00')
})

test('el saldo bancario separa el efectivo y las retiradas del balance mensual al recuperar una copia antigua', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-24T12:00:00+01:00'))
  await page.reload()
  await backups(page)
  const expense = { kind: 'expense', date: '2026-11-20', createdAt: 1 }
  const oldBackup = { app: 'mi-dinero', version: 2, currency: 'EUR', openingCents: 10000, transactions: [
    { ...expense, id: '11111111-1111-4111-8111-111111111111', category: 'machine', concept: 'Café anterior', cents: 42 },
    { ...expense, id: '22222222-2222-4222-8222-222222222222', category: 'meal', concept: 'Comida anterior', cents: 800 },
  ] }
  await page.getByLabel('Archivo de copia').setInputFiles({
    name: 'copia-antigua.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(oldBackup)),
  })
  await page.getByRole('button', { name: 'Restaurar copia', exact: true }).click()
  const bank = page.getByRole('region', { name: 'Saldos de la cuenta' }).locator('strong')
  const verifyBank = async (value: string) => {
    await expect(bank.nth(1)).toContainText(value)
    await expect(bank.nth(2)).toContainText(value)
  }
  await verifyBank('92,00')
  await balance(page, '-8,42€')

  const dialog = page.getByRole('dialog')
  const cash = dialog.getByRole('button', { name: 'Efectivo', exact: true })
  const bankButton = dialog.getByRole('button', { name: 'Cuenta bancaria', exact: true })
  await page.getByRole('button', { name: 'Editar Café anterior' }).click()
  await expect(cash).toHaveAttribute('aria-pressed', 'true')
  await expect(bankButton).toBeDisabled()
  await dialog.getByRole('button', { name: 'Cerrar' }).click()

  await page.getByRole('button', { name: 'Editar Comida anterior' }).click()
  await expect(bankButton).toHaveAttribute('aria-pressed', 'true')
  await cash.click()
  await dialog.getByRole('button', { name: 'Guardar cambios' }).click()
  await verifyBank('100,00')
  await balance(page, '-8,42€')
  await expect(page.getByRole('button', { name: 'Editar Comida anterior' })).toContainText('Efectivo')

  await page.getByRole('button', { name: 'Nuevo movimiento' }).click()
  await dialog.getByRole('button', { name: 'Retirada', exact: true }).click()
  await dialog.getByLabel('Importe', { exact: true }).fill('20')
  await dialog.getByLabel('Fecha').fill('2026-11-19')
  await dialog.getByRole('button', { name: 'Guardar movimiento' }).click()
  await expect(dialog).toHaveCount(0)
  await verifyBank('80,00')
  await page.reload()
  await verifyBank('80,00')
  await balance(page, '-8,42€')
  await navigate(page, 'Movimientos')
  await page.getByRole('button', { name: 'Retiradas', exact: true }).click()
  await expect(page.locator('.entry-row')).toHaveCount(1)
  await expect(page.getByRole('button', { name: 'Editar Retirada de efectivo' })).toBeVisible()
})

test('un reembolso en otro mes se ve por fecha y corrige el gasto original', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-24T12:00:00+01:00'))
  await page.reload()
  await add(page, 'Cena compartida', '40', '2026-10-25', 'meal')
  await page.getByRole('button', { name: 'Editar Cena compartida' }).click()
  await page.getByRole('button', { name: 'Registrar reembolso', exact: true }).click()
  const refund = page.getByRole('dialog', { name: 'Registrar reembolso' })
  await refund.getByLabel('Importe del reembolso').fill('41')
  await refund.getByRole('button', { name: 'Guardar reembolso' }).click()
  await expect(refund.getByRole('alert')).toContainText('40,00')
  await refund.getByLabel('Importe del reembolso').fill('20')
  await expect(refund.getByLabel('Fecha del reembolso')).toHaveValue('2026-11-24')
  await refund.getByRole('button', { name: 'Efectivo', exact: true }).click()
  await refund.getByRole('button', { name: 'Guardar reembolso' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await balance(page, '-20,00€')
  const bank = page.getByRole('region', { name: 'Saldos de la cuenta' }).locator('strong')
  await expect(bank.nth(2)).toContainText('-40,00')
  await page.getByRole('button', { name: 'Editar Cena compartida' }).click()
  await page.getByRole('button', { name: 'Ver reembolsos', exact: true }).click()
  const refunds = page.getByRole('dialog', { name: 'Reembolsos' })
  await expect(refunds.locator('dd')).toHaveText([/40,00/, /20,00/, /20,00/])
  await refunds.getByRole('button', { name: 'Cerrar' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Cerrar' }).click()

  await page.getByRole('button', { name: 'Mes siguiente' }).click()
  await balance(page, '0,00€')
  await navigate(page, 'Movimientos')
  const row = page.getByRole('button', { name: 'Editar Reembolso · Cena compartida' })
  await expect(row).toContainText('Efectivo')
  await row.click()
  const editRefund = page.getByRole('dialog', { name: 'Editar reembolso' })
  await editRefund.getByRole('button', { name: 'Cuenta bancaria' }).click()
  await editRefund.getByRole('button', { name: 'Guardar reembolso' }).click()
  await expect(row).toContainText('Cuenta bancaria')
  await navigate(page, 'Resumen')
  await expect(bank.nth(1)).toContainText('-20,00')
  await row.click()
  await editRefund.getByRole('button', { name: 'Eliminar reembolso' }).click()
  await page.getByRole('button', { name: 'Sí, eliminar' }).click()
  await expect(bank.nth(2)).toContainText('-40,00')
  await expect(row).toHaveCount(0)
  await page.getByRole('button', { name: 'Mes anterior' }).click()
  await balance(page, '-40,00€')
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
  const amount = page.locator('.balance-amount .fitted-amount-value')
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
    backup: { version: 3, transactions: [{ concept: 'Copia compartida', cents: 120, payment: 'bank' }] },
  })
})

async function openReminders(page: Page) {
  const more = page.getByRole('button', { name: 'Más', exact: true })
  if (await more.isVisible()) await more.click()
  await page.getByRole('button', { name: 'Recordatorios', exact: true }).click()
  return page.getByRole('dialog')
}

test('programar un pago genera una cita con alerta y permite marcarlo como pagado', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-23T12:00:00+01:00'))
  const dialog = await openReminders(page)
  await dialog.getByRole('button', { name: 'Nuevo recordatorio' }).click()
  await dialog.getByLabel('Qué quieres pagar').fill('Seguro')
  await dialog.getByLabel('Fecha y hora del aviso').fill('2026-11-22T09:30')
  await dialog.getByRole('button', { name: 'Guardar recordatorio' }).click()
  await expect(dialog.getByRole('alert')).toContainText('fecha y hora futuras')
  await dialog.getByLabel('Fecha y hora del aviso').fill('2026-11-25T09:30')
  await dialog.getByRole('button', { name: 'Guardar recordatorio' }).click()
  await expect(dialog.getByText('Recordatorio guardado.')).toBeVisible()
  const download = page.waitForEvent('download')
  await dialog.getByRole('button', { name: 'Descargar cita' }).click()
  const file = await download
  expect(file.suggestedFilename()).toMatch(/\.ics$/)
  const calendar = await readFile((await file.path())!, 'utf8')
  expect(calendar).toContain('DTSTART:20261125T083000Z')
  expect(calendar).toContain('TRIGGER:PT0M')
  await dialog.getByText('Usar Recordatorios de Apple').click()
  const shortcutUrl = new URL((await dialog.getByRole('link', { name: 'Abrir atajo' }).getAttribute('href'))!)
  expect(JSON.parse(shortcutUrl.searchParams.get('text')!)).toEqual({ titulo: 'Pagar Seguro', fecha: '2026-11-25T08:30:00.000Z' })

  await page.reload()
  await openReminders(page)
  await dialog.getByRole('button', { name: /Seguro/ }).click()
  await dialog.getByRole('button', { name: 'Marcar como pagado' }).click()
  await expect(dialog.getByRole('button', { name: 'Marcar como pendiente' })).toBeVisible()
  await dialog.getByRole('button', { name: 'Cerrar' }).click()
  await expect(dialog.getByRole('button', { name: /Seguro/ })).toContainText('Pagado')
  await dialog.getByRole('button', { name: /Seguro/ }).click()
  await dialog.getByRole('button', { name: 'Eliminar recordatorio' }).click()
  await dialog.getByRole('button', { name: 'Sí, eliminar' }).click()
  await expect(dialog.getByRole('button', { name: /Seguro/ })).toHaveCount(0)
  await dialog.getByRole('button', { name: 'Cerrar' }).click()
  await balance(page, '0,00€')
})

test('recuperar una copia antigua conserva los recordatorios guardados', async ({ page }) => {
  await backups(page)
  const incoming = { app: 'mi-dinero', version: 2, currency: 'EUR', openingCents: 2000, transactions: [] }
  const reminder = { id: '11111111-1111-4111-8111-111111111111', title: 'Alquiler', at: Date.UTC(2030, 0, 12, 8), paid: false }
  async function restore(data: object, showCount = false) {
    await page.getByLabel('Archivo de copia').setInputFiles({
      name: 'copia.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(data)),
    })
    if (showCount) await expect(page.getByText('Recordatorios que se restaurarán:')).toBeVisible()
    await page.getByRole('button', { name: 'Restaurar copia', exact: true }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
  }
  await restore({ ...incoming, reminders: [reminder] }, true)
  await backups(page)
  await restore(incoming)
  await backups(page)
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Descargar copia', exact: true }).click()
  const file = await download
  const backup = JSON.parse(await readFile((await file.path())!, 'utf8'))
  expect(backup.reminders).toEqual([reminder])
})

test('el cierre aparece al cambiar de mes y se puede volver a ver o abrir su historial', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-30T23:58:00+01:00') })
  await page.reload()
  await add(page, 'Gasto anterior', '100', '2026-10-23', 'food')
  await add(page, 'Mercado', '70', '2026-11-22', 'food')
  await add(page, 'Café', '0,90', '2026-11-22', 'machine')
  await add(page, 'Nómina', '1000', '2026-11-01', 'salary')
  await expect(page.getByRole('button', { name: /Cierre de octubre de 2026/ })).toBeVisible()

  await page.clock.fastForward(3 * 60 * 1000)
  await page.getByRole('button', { name: 'Cierre de noviembre de 2026, nuevo' }).click()
  const story = page.getByRole('dialog', { name: 'Cierre mensual' })
  await expect(story.getByRole('heading', { name: 'Balance del mes' })).toBeVisible()
  await expect(story.locator('.fitted-amount-value')).toContainText('929,10')
  await story.getByRole('button', { name: 'Siguiente', exact: true }).click()
  await expect(story.getByRole('heading', { name: 'La categoría en la que más gastaste' })).toBeVisible()
  await expect(story.locator('.story-category')).toContainText('Alimentación')

  const stage = story.locator('.story-stage')
  await stage.dispatchEvent('pointerdown', { pointerType: 'touch', clientX: 200, clientY: 100 })
  await stage.dispatchEvent('pointerup', { pointerType: 'touch', clientX: 90, clientY: 105 })
  await expect(story.getByRole('heading', { name: 'Tu mayor gasto' })).toBeVisible()
  await expect(story.getByText('Mercado', { exact: true })).toBeVisible()
  await page.keyboard.press('ArrowRight')
  await expect(story.getByRole('heading', { name: 'Frente al mes anterior' })).toBeVisible()
  await expect(story.locator('.fitted-amount-value')).toContainText('29,10')
  await story.getByRole('button', { name: 'Saldo bancario al cierre', exact: true }).click()
  await expect(story.locator('.fitted-amount-value')).toContainText('830,00')
  await story.getByRole('button', { name: 'Ver movimientos', exact: true }).click()
  await expect(story).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Movimientos', level: 1 })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Editar Mercado' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Editar Gasto anterior' })).toHaveCount(0)

  await page.goto('./')
  await page.getByRole('button', { name: 'Cierre de noviembre de 2026', exact: true }).click()
  await expect(story.getByRole('heading', { name: 'Balance del mes' })).toBeVisible()
})

test('el aviso mensual genera una cita recurrente y enlaza al atajo existente', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-24T12:00:00+01:00'))
  const more = page.getByRole('button', { name: 'Más', exact: true })
  if (await more.isVisible()) {
    await more.click()
    await page.getByRole('button', { name: 'Aviso del cierre mensual' }).click()
  } else await page.getByRole('button', { name: 'Aviso mensual', exact: true }).click()
  const notice = page.getByRole('dialog', { name: 'Aviso del cierre mensual' })
  const shortcut = new URL((await notice.getByRole('link', { name: 'Abrir atajo' }).getAttribute('href'))!)
  expect(shortcut.searchParams.get('name')).toBe('Pago de Mi Dinero')
  expect(JSON.parse(shortcut.searchParams.get('text')!)).toEqual({
    titulo: 'Ver el cierre mensual en Mi Dinero', fecha: '2026-12-01T08:00:00.000Z',
  })
  const download = page.waitForEvent('download')
  await notice.getByRole('button', { name: 'Descargar cita mensual' }).click()
  const file = await download
  expect(file.suggestedFilename()).toBe('mi-dinero-cierre-mensual.ics')
  expect(await readFile((await file.path())!, 'utf8')).toContain('RRULE:FREQ=MONTHLY;BYMONTHDAY=1')
})

test('los diseños se pueden previsualizar, se recuerdan y conservan el modo del original', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-24T12:00:00+01:00'))
  const root = page.locator('html')
  const more = page.getByRole('button', { name: 'Más', exact: true })
  const openAppearance = async () => {
    if (await more.isVisible()) await more.click()
  }
  const openDesigns = async () => {
    await openAppearance()
    await page.getByRole('button', { name: 'Elegir diseño' }).click()
  }
  const picker = page.getByRole('dialog', { name: 'Diseños de Mi Dinero' })
  const balanceCard = page.getByRole('region', { name: 'Resumen financiero del mes' })

  await expect(root).not.toHaveAttribute('data-design', /.+/)
  await add(page, 'Café del día', '0,90', '2026-11-24', 'machine')
  await openAppearance()
  await page.getByRole('button', { name: 'Tema oscuro' }).click()
  await page.getByRole('button', { name: 'Elegir diseño' }).click()
  await expect(picker.getByRole('button', { name: 'Original' })).toHaveAttribute('aria-pressed', 'true')

  for (const [name, id, mode, color, radius] of [
    ['Medianoche', 'midnight', 'dark', 'rgb(16, 25, 35)', '13px'],
    ['Grafito', 'graphite', 'dark', 'rgb(24, 24, 25)', '9px'],
    ['Ciruela', 'plum', 'dark', 'rgb(30, 23, 37)', '25px'],
    ['Arena', 'sand', 'light', 'rgb(234, 227, 215)', '18px'],
  ]) {
    const option = picker.getByRole('button', { name, exact: true })
    await option.click()
    await expect(option).toHaveAttribute('aria-pressed', 'true')
    await expect(root).toHaveAttribute('data-design', id)
    await expect(root).toHaveAttribute('data-theme', mode)
    await expect(root).toHaveCSS('background-color', color)
    await expect(balanceCard).toHaveCSS('border-top-left-radius', radius)
  }

  await page.reload()
  await expect(root).toHaveAttribute('data-design', 'sand')
  await expect(page.getByRole('button', { name: 'Editar Café del día' })).toBeVisible()
  await openDesigns()
  await expect(picker.getByRole('button', { name: 'Arena' })).toHaveAttribute('aria-pressed', 'true')
  await picker.getByRole('button', { name: 'Original' }).click()
  await expect(root).not.toHaveAttribute('data-design', /.+/)
  await expect(root).toHaveAttribute('data-theme', 'dark')
  await expect(root).toHaveCSS('background-color', 'rgb(17, 27, 26)')
  await picker.getByRole('button', { name: 'Cerrar' }).click()
  await expect(page.getByRole('button', { name: 'Editar Café del día' })).toBeVisible()
})
