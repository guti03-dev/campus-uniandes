# Campus Uniandes · PWA

## Instalar

- Android: abre la página en Chrome, entra en Ajustes → Instalar Campus. Si el navegador no ofrece el aviso, usa su menú → Instalar aplicación / Añadir a pantalla de inicio.
- iPhone: abre la página en Safari → Compartir → Añadir a la pantalla de inicio.
- Escritorio: usa el control de instalación del navegador compatible.

## Probar

1. Calcula una ruta y busca un salón con internet.
2. Confirma «Copia guardada» en Ajustes y cierra la aplicación.
3. Activa modo avión y vuelve a abrirla: deben funcionar el buscador y el cálculo de rutas con instrucciones.
4. El mapa 3D no está disponible sin conexión. Tampoco se actualizan horarios, se abren indicaciones externas ni se descargan fotos remotas.
5. Recupera la conexión para volver a cargar el mapa.

Los horarios incluidos son del 31 de agosto de 2026, período 202620. Actualizar Aula-Finder descarga datos para la sesión; esa descarga no reemplaza la copia offline incluida en esta versión.

## Cambios posteriores

La caché conserva una versión completa. Después de modificar index.html, pwa.js, iconos o el manifiesto, cambia también `BUILD` en sw.js por un identificador nuevo. Cuando el usuario abra la versión instalada, aparecerá «Actualizar aplicación» en Ajustes si hay un service worker nuevo. Ese botón activa la versión nueva y recarga.

No se cachean mapas de Mapbox ni respuestas externas. El navegador puede eliminar la caché por falta de espacio o al borrar datos del sitio.

## Validación realizada

Pruebas automatizadas de carga del HTML sin Mapbox, cálculo de rutas sin internet, conservación de salones/restaurantes y lógica del service worker (caché por subcarpeta, actualización explícita y navegación offline). La instalación real en Android/iPhone y el comportamiento del service worker en esos dispositivos quedan por probar después de publicar.
