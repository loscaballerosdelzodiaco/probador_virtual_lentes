import { readFileSync } from 'node:fs'

const env = Object.fromEntries(
  readFileSync('.env', 'utf8')
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith('#') && line.includes('='))
    .map((line) => {
      const index = line.indexOf('=')
      return [line.slice(0, index).trim(), line.slice(index + 1).trim()]
    }),
)

const url = env.VITE_SUPABASE_URL
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY
const headers = { apikey: key, Authorization: `Bearer ${key}`, Prefer: 'count=exact' }

const cols = [
  'id_usuario',
  'usuario_id',
  'codigo',
  'dui',
  'nit',
  'password',
  'contrasena',
  'clave',
  'nombre',
  'apellido',
  'correo',
  'telefono',
  'direccion',
  'fecha_nacimiento',
  'sexo',
  'genero',
  'tipo',
  'estado',
  'habilitado',
  'visible',
  'publico',
  'foto',
  'imagen',
  'url_imagen',
  'cita',
  'paciente',
  'clinica',
]
for (const col of cols) {
  const response = await fetch(`${url}/rest/v1/usuario?select=${col}&limit=0`, { headers })
  if (response.ok) console.log('OK', col)
}

const all = await fetch(`${url}/rest/v1/usuario?select=*`, { headers })
console.log('all', all.status, all.headers.get('content-range'), (await all.text()).slice(0, 200))
