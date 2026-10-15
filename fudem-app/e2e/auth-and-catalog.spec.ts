import { expect, test } from '@playwright/test'

test.describe('flujos públicos (sin sesión)', () => {
  test('muestra el registro en la ruta inicial', async ({ page }) => {
    await page.goto('/')
    await expect(
      page.getByRole('heading', { name: 'Crear cuenta' }),
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Catálogo de lentes' }),
    ).toHaveCount(0)
  })

  test('abre el login y valida campos vacíos sin llamar a credenciales reales', async ({
    page,
  }) => {
    await page.goto('/login')
    await expect(
      page.getByRole('heading', { name: 'Iniciar sesión' }),
    ).toBeVisible()

    await page.getByRole('button', { name: 'Iniciar sesión' }).click()

    await expect(page.getByRole('alert')).toBeVisible()
    await expect(page.getByRole('alert')).toContainText(/correo|contraseña/i)
    await expect(
      page.getByRole('heading', { name: 'Catálogo de lentes' }),
    ).toHaveCount(0)
  })

  test('muestra error controlado con credenciales de prueba inválidas', async ({
    page,
  }) => {
    await page.goto('/login')
    await page.getByLabel('Correo').fill('qa.inexistente@example.com')
    await page.getByLabel('Contraseña').fill('password-de-prueba-invalida')
    await page.getByRole('button', { name: 'Iniciar sesión' }).click()

    await expect(page.getByRole('alert')).toContainText(
      'No pudimos iniciar sesión. Revisa tu correo y contraseña.',
    )
    await expect(
      page.getByRole('heading', { name: 'Catálogo de lentes' }),
    ).toHaveCount(0)
  })

  test('no abre el catálogo sin sesión', async ({ page }) => {
    await page.goto('/catalogo')
    await expect(
      page.getByRole('heading', { name: 'Iniciar sesión' }),
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Catálogo de lentes' }),
    ).toHaveCount(0)
  })
})
