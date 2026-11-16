# Inventario de caminos y entradas

Actualizado: 2026-11-16. La aplicación distingue escaleras, rampas, ascensores y caminos. La opción **Sin escaleras** excluye las escaleras y respeta cierres y sentidos únicos; no filtra por ancho, pendiente, superficie o marcas de accesibilidad.

## Escaleras y rampas

- 230 tramos: 30 de escaleras y 7 de rampas.
- Cuando no hay un conteo positivo de origen, se estima **un escalón cada 0,30 m**, redondeando hacia arriba y con un mínimo de uno por tramo. Se conserva la marca de estimación y la aplicación muestra «≈». Las medidas de origen no se sustituyen por datos de una visita.
- El tramo T147 tenía tipo rampa pero una nota explícita de escalera; se trata como escalera, siguiendo esa nota.
- [Inventario de tramos](tramos.csv).

## Entradas de edificios

Se compararon las 44 entradas de 37 edificios con las coordenadas de sus marcadores. Se corrigieron tres puntos que estaban a 235–258 m de J y a 10–19 m de ML: **pmwcc5qljiajcr6**, **pmwcc69o8qjlvhy** y **pmwcc79kans7wtc**. Ahora pertenecen a ML, incluido su ascensor. La entrada de **J** sigue siendo **osm-3821418227**, junto al edificio J. Las demás entradas están a menos de 37 m de su marcador y no se desplazaron.

Esta comprobación detecta asignaciones desplazadas en el mapa; no acredita una visita a cada puerta. [Entradas, coordenadas y correcciones](entradas.csv).

## Rutas entre edificios

| Opción | Disponibles | Con escaleras | Sin escaleras | Incluyen rampa | Sin conexión |
| --- | ---: | ---: | ---: | ---: | ---: |
| [Más corta](rutas-shortest.csv) | 1332 | 932 | 400 | 410 | 0 |
| [Más rápida](rutas-fast.csv) | 1332 | 870 | 462 | 368 | 0 |
| [Menos escaleras](rutas-stairs.csv) | 1332 | 508 | 824 | 388 | 0 |
| [Sin escaleras](rutas-accessible.csv) | 824 | 0 | 824 | 214 | 508 |

## Reproducir

`npm run audit:accessibility` regenera los CSV usando las mismas correcciones y reglas de la aplicación. Para conservar esta fecha: `node scripts/audit-accessibility.cjs --date=2026-11-16`.

Las correcciones se aplican al cargar `accessibility.js`; el HTML original se conserva como fuente. Huella SHA-256 de la red aplicada: `3a8414e85d9a48f13782bd35903ddbbf887efa2d2fae9cf26074eda9511c2cb0`.
