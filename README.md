# probador_virtual_lentes

## Recetas y exámenes (Storage)

Los archivos se guardan en el bucket **privado** `documentos` de Supabase Storage. La app usa solo `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`; el dueño se identifica con su sesión. No hay URLs públicas ni clave de servicio en el cliente.

Si el SQL de `supabase/migrations/20261022041219_documento_cliente.sql` ya se ejecutó, el bucket y las políticas están listos. Si no:

1. Crear el bucket `documentos` como **privado**.
2. Límite 10 MB. MIME: `application/pdf`, `image/jpeg`, `image/png`, `image/webp`.
3. Políticas: el usuario autenticado solo opera sobre objetos cuya primera carpeta es su `auth.uid()`.
4. El cliente abre el archivo con `download()` (blob en el navegador), no con un enlace público.
5. Tras validar el archivo y guardarlo, el registro queda en `recibida`. `usuario_id` lo asigna la sesión (`auth.uid()`), no un id enviado por el cliente.
6. Ejecuta también `supabase/migrations/20261022043808_recibir_documento.sql` si la tabla ya existía.