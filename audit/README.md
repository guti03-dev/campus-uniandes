# Auditoría digital de accesibilidad

Fecha: 2026-11-16. Fuente: la red de caminos incluida en index.html. Esta revisión analiza los datos guardados; no certifica una visita ni la accesibilidad física del campus.

## Hallazgos

- **230 tramos** y 195 puntos.
- **29 tramos ya identificados como escaleras**. Su presencia es una barrera conocida para silla de ruedas; el conteo de escalones no está registrado en esos 29 tramos. No se presentan como escaleras cuya existencia falte comprobar.
- **199 otros tramos requieren revisar sus datos**. Se detectaron 2 registros contradictorios: 1 de verificación y 1 de clasificación como rampa o escalera.
- 3 tramos tienen la marca original de verificado: 2 sin contradicción detectada y 1 con una nota que dice que no se comprobó en campo. No constan fecha ni responsables de la visita en esos registros.
- 11 tramos contienen parámetros de accesibilidad supuestos, no mediciones de campo.

**Una escalera identificada, la ausencia de escalones y la accesibilidad comprobada son datos distintos.** Se conservaron los tipos de camino, las mediciones y las marcas de verificación originales de la red; no se completó información desconocida con suposiciones.

## Qué datos faltan en los tramos sin escaleras identificadas

| Dato pendiente | Tramos |
| --- | ---: |
| tipo de camino | 21 |
| ausencia de escalones | 177 |
| pendiente | 187 |
| ancho libre | 187 |
| superficie | 187 |
| comprobación en campo | 198 |
| nota de verificación contradictoria | 1 |
| clasificación contradictoria: rampa o escalera | 1 |

Los conteos se superponen: un tramo puede necesitar varias comprobaciones.

## Opciones de ruta entre edificios

Se calcularon los dos sentidos entre los 37 edificios registrados, con pendiente máxima de 8 % y ancho mínimo de 90 cm. Son combinaciones calculadas, no recorridos realizados por personas.

| Opción | Disponibles | Con escaleras | Accesibilidad pendiente | Datos marcados verificados | Sin conexión válida |
| --- | ---: | ---: | ---: | ---: | ---: |
| [Más corta](rutas-shortest.csv) | 1332 | 882 | 450 | 0 | 0 |
| [Más rápida](rutas-fast.csv) | 1332 | 824 | 508 | 0 | 0 |
| [Menos escaleras](rutas-stairs.csv) | 1332 | 508 | 824 | 0 | 0 |
| [Sin escaleras (opción de accesibilidad)](rutas-accessible.csv) | 824 | 0 | 824 | 0 | 508 |

## Tramos pendientes con mayor presencia en las opciones sin escaleras

Esta prioridad cuenta apariciones en las opciones calculadas para los dos sentidos; no mide afluencia ni uso real. Las referencias se corresponden con el inventario CSV.

| Referencia | Ubicación aproximada | Apariciones | Qué comprobar |
| --- | --- | ---: | --- |
| T018 | Cerca de V | 396 | ausencia de escalones, pendiente, ancho libre, superficie, comprobación en campo |
| T019 | Cerca de F | 384 | ausencia de escalones, pendiente, ancho libre, superficie, comprobación en campo |
| T045 | Cerca de V | 336 | ausencia de escalones, pendiente, ancho libre, superficie, comprobación en campo |
| T216 | Cerca de S | 308 | ausencia de escalones, pendiente, ancho libre, superficie, comprobación en campo |
| T044 | Cerca de V | 284 | ausencia de escalones, pendiente, ancho libre, superficie, comprobación en campo |
| T143 | Cerca de W | 284 | ausencia de escalones, pendiente, ancho libre, superficie, comprobación en campo |
| T217 | Cerca de U | 276 | ausencia de escalones, pendiente, ancho libre, superficie, comprobación en campo |
| T193 | Cerca de W | 244 | comprobación en campo |
| T046 | Cerca de U | 240 | ausencia de escalones, pendiente, ancho libre, superficie, comprobación en campo |
| T021 | Cerca de F | 236 | ausencia de escalones, pendiente, ancho libre, superficie, comprobación en campo |
| T114 | Cerca de LL | 200 | ausencia de escalones, pendiente, ancho libre, superficie, comprobación en campo |
| T141 | Cerca de W | 200 | ausencia de escalones, pendiente, ancho libre, superficie, comprobación en campo |

## Registros contradictorios

- **T109**, Cerca de Rga: marca original «verified»; nota original: «Imported from OSM; access and accessibility not field verified». Resolver la contradicción en campo o con la persona que registró el dato.
- **T147**, Cerca de G: tipo original «ramp» y cero escalones; nota original: «Escalera interpretada de la ilustración: borde de El Bobo entre H y B. Escalones sin contar.». No se usa en la opción sin escaleras hasta resolver su clasificación. Los datos originales se conservan.

## Archivos para revisar y recorrer

- [Inventario completo de tramos y formulario de visita](tramos.csv): ubicación, enlace al mapa, atributos originales, pendientes y columnas vacías para fecha, personas revisoras, mediciones y observaciones.

Las opciones entre edificios están separadas por tipo de ruta en los enlaces de la tabla anterior; cada CSV identifica sus escaleras y sus tramos pendientes.

Los CSV usan UTF-8 y coma como separador. Una celda vacía en una medida significa que no está registrada, no que valga cero. Las referencias de cada opción están ordenadas según el recorrido.

Para la comprobación en campo, recorrer las alternativas sin escaleras con personas con movilidad reducida, confirmar los accesos reales y registrar escalones o bordillos, pendiente, ancho, superficie y funcionamiento/puertas de ascensores. Añadir fecha, responsables y observaciones antes de actualizar el mapa.

## Reproducir

`npm run audit:accessibility` regenera estos archivos a partir de la red actual. Para conservar la fecha de este informe: `node scripts/audit-accessibility.cjs --date=2026-11-16`.

Huella SHA-256 de la red analizada: `e4e47483f8bda2e74e643584dcc1563b6d53b12606b6675f7d72ca6f392498d6`.
