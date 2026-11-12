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

## Guía de recorrido

Compara rutas, elige una opción y pulsa **Iniciar recorrido**. La guía solicita permiso de ubicación para seguir tu avance y muestra la próxima acción, distancia restante y progreso. Puedes pausar el GPS y confirmar los pasos manualmente. Al mover el mapa se pausa el centrado; **Centrar en mi ubicación** lo restablece. La demostración opcional sigue disponible en `?recorrido=demo`.

Las instrucciones describen giros, escaleras, rampas, puentes y ascensores. Los pisos de los ascensores son desniveles relativos: solo se muestra «hasta el piso…» si el tramo registra `fromFloor` o `toFloor`. No se deduce un número de piso a partir del desnivel ni de un salón.

Las posiciones quedan en el navegador. Con precisión peor que ±25 m o una posición de más de 15 segundos, se pausa el avance automático. Los ascensores y la llegada siempre requieren confirmación manual; el GPS no distingue niveles interiores. Dos posiciones precisas consecutivas fuera del recorrido permiten ofrecer **Recalcular desde aquí** si existe un punto conectado a menos de 40 m. Se pide confirmar el punto y su nivel; se conservan el destino, las preferencias y el tipo de ruta. Si no hay conexión válida, se conserva el recorrido actual. El esquema y las indicaciones funcionan sin internet tras guardar la aplicación.

`npm test` incluye giros en ambos sentidos, pisos de ascensor, proyección de ubicación e instrucciones para todas las rutas disponibles entre edificios. El GPS real entre edificios y la numeración oficial de pisos requieren validación en campo.

## Cambios posteriores

La caché conserva una versión completa. Después de modificar index.html, pwa.js, iconos o el manifiesto, cambia también `BUILD` en sw.js por un identificador nuevo. Cuando el usuario abra la versión instalada, aparecerá «Actualizar aplicación» en Ajustes si hay un service worker nuevo. Ese botón activa la versión nueva y recarga.

No se cachean mapas de Mapbox ni respuestas externas. El navegador puede eliminar la caché por falta de espacio o al borrar datos del sitio.

## Validación realizada

Pruebas automatizadas de carga del HTML sin Mapbox, cálculo de rutas sin internet, conservación de salones/restaurantes y lógica del service worker (caché por subcarpeta, actualización explícita y navegación offline). La instalación real en Android/iPhone y el comportamiento del service worker en esos dispositivos quedan por probar después de publicar.
