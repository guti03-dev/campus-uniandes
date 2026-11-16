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

## Brújula y orientación

El botón **🧭** abre la brújula. **Activar brújula** solicita permiso cuando el navegador lo requiere; no se solicitan sensores al abrir la aplicación. Con el teléfono casi horizontal y la pantalla en vertical, se muestra hacia dónde apunta y se añade una flecha a la ubicación. **Alinear mapa** orienta el mapa una vez hacia el teléfono; **Norte arriba** lo restablece. La brújula no gira el mapa automáticamente.

Durante un recorrido, **Orientarme** permite comparar esa orientación con la dirección del tramo. Los ascensores no usan indicaciones de brújula. Las posiciones relativas sin referencia al norte, las lecturas antiguas y los datos de poca precisión no se presentan como una dirección fiable. Si el navegador no admite la brújula, se mantienen el norte y las instrucciones normales.

La orientación es aproximada y depende del sensor y su calibración. Los datos permanecen en el navegador; los sensores se suspenden al ocultar la página y se desactivan con su botón. `npm test` incluye lecturas Android/iOS simuladas, permisos, precisión, giro del mapa, lecturas caducadas y suspensión.

## Escaleras, rampas y entradas

Las rutas muestran distancia, duración y **Sin escaleras** o el conteo de escalones; las rampas se indican cuando aparecen. Los conteos que no existen en el origen se estiman con un escalón cada 0,30 m de tramo y se muestran con **≈**. **Menos escaleras** compara ese conteo; **Sin escaleras** excluye las escaleras. Los cierres y sentidos únicos se respetan. Ancho, pendiente, superficie y marcas de verificación no intervienen en estas opciones.

La [revisión de caminos y entradas](audit/README.md) documenta las tres entradas que tenían la letra J en el sector de ML y ahora pertenecen a ML. La entrada de J permanece junto al edificio J. El módulo `accessibility.js` aplica estas correcciones al cargar; `npm run audit:accessibility` reproduce el inventario y las rutas con las mismas reglas.

## Marcadores y restaurantes

Los avisos mantienen el tamaño original de 42 px y su separación de 38 px a la derecha y 36 px hacia arriba respecto al lugar. Solo se agrupan los avisos que comparten la misma ubicación. Los restaurantes cercanos se agrupan al alejar el mapa y sus símbolos cambian de 16 a 30 px según el zoom. Un grupo permite consultar sus avisos o elegir un restaurante. Los edificios conservan sus marcadores.

El directorio incluye los siete enlaces recibidos el 16 de noviembre de 2026: Starbucks City U, WingStop UniAndes, Puerto Arepa, Chick n Chips, One Burrito, Acai Bowls Colombia y One Burrito Pola. Se actualizaron Starbucks y One Burrito Pola sin duplicarlos. Los puntos usan las coordenadas del lugar en la ficha de Google Maps, que pueden diferir del centro de la vista compartida. Hay 25 lugares seleccionados y 30 fichas en total.

## Cambios posteriores

La caché conserva una versión completa. Después de modificar index.html, pwa.js, iconos o el manifiesto, cambia también `BUILD` en sw.js por un identificador nuevo. Cuando el usuario abra la versión instalada, aparecerá «Actualizar aplicación» en Ajustes si hay un service worker nuevo. Ese botón activa la versión nueva y recarga.

No se cachean mapas de Mapbox ni respuestas externas. El navegador puede eliminar la caché por falta de espacio o al borrar datos del sitio.

## Validación realizada

Pruebas automatizadas de carga del HTML sin Mapbox, cálculo de rutas sin internet, conservación de salones/restaurantes y lógica del service worker (caché por subcarpeta, actualización explícita y navegación offline). La instalación real en Android/iPhone y el comportamiento del service worker en esos dispositivos quedan por probar después de publicar.
