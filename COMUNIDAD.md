# Comunidad del campus

Abre **Comunidad** para consultar alertas y eventos. **Ver demostración** muestra ejemplos ficticios, que nunca se guardan en Supabase. Vuelve a datos reales antes de publicar.

## Funciones

- Consulta pública de alertas activas y eventos próximos, con filtros, mapa y ruta al edificio.
- Registro, inicio de sesión y recuperación de contraseña mediante Supabase Auth.
- Los estudiantes pueden reportar ascensores, escaleras, caminos y otros problemas, adjuntar una foto y confirmar reportes ajenos una sola vez.
- Los reportes comienzan sin verificar, caducan a las 24 horas y tienen un límite de 10 por cuenta al día. No alteran el cálculo de rutas.
- Administradores: confirmar, resolver o descartar reportes; publicar y cancelar eventos.
- Fechas de eventos en hora de Bogotá. Consulta cada minuto mientras la página está visible.
- Fotos privadas de hasta 3 MB; enlaces temporales para consultar los adjuntos de avisos visibles.
- La PWA conserva la interfaz offline, pero requiere conexión para consultar datos actuales y publicar.

## Configuración de Auth pendiente del propietario

Proyecto: `outwkqplowgoyixxxwmk`. La base de datos y las políticas ya están creadas.

En Supabase → Authentication → URL Configuration, configura Site URL y Redirect URLs con:

`https://guti03-dev.github.io/campus-uniandes/`

Esto permite que la confirmación por correo y la recuperación vuelvan a la aplicación. Configura un proveedor SMTP para enviar correos a usuarios reales cuando abras el registro al público; el servicio de correo de prueba de Supabase tiene restricciones. No se han creado cuentas ni enviado correos automáticamente.

## Primer administrador

1. Crea y confirma tu cuenta desde Comunidad → Mi cuenta.
2. Identifica su UUID en Supabase → Authentication → Users.
3. Como propietario del proyecto, ejecuta en SQL Editor, reemplazando el UUID:

```sql
insert into public.campus_admins(user_id)
values ('UUID_DE_TU_CUENTA') on conflict do nothing;
```

Actualiza Comunidad para ver los controles. Ningún usuario puede otorgarse este rol desde el navegador. No se asigna automáticamente al primer registro.

## Desarrollo y pruebas

La integración se carga desde `pwa.js`; el mapa principal no requiere reconstrucción. `community.js` utiliza la clave publicable y el cliente Supabase JS 2.118.0 incluido en `vendor/`. Nunca añadas claves secretas o service_role.

`supabase/001_community.sql` conserva el esquema aplicado. La autorización depende de RLS y de permisos por columna, no de los controles de la interfaz.

- `npm ci && npm test`: pruebas de interfaz con DOM simulado.
- `tests/permissions.sql`: prueba de permisos con usuarios temporales dentro de una transacción que termina en rollback. Ejecutar como propietario en un entorno de prueba.
- Al modificar los archivos de la app, cambia BUILD en `sw.js` para actualizar la PWA.

No se han validado correos reales ni una sesión completa en navegador con un usuario real. Las pruebas automatizadas cubren roles, confirmaciones, aislamiento de demo, enlaces seguros y fechas.
