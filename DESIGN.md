---
name: Life Deco Art HUB — Inicio
description: Inicio operativo con el sistema visual preexistente HUB/CMS.
colors:
  cream: "#F5EFE5"
  white: "#FFFFFF"
  black: "#1C1A17"
  brown: "#8B795E"
  pink: "#F65091"
  cyan: "#0CC0DF"
  brown-soft: "rgba(139,121,94,.10)"
  border: "rgba(139,121,94,.28)"
  success: "#2E7D32"
  success-soft: "#E8F3E9"
  error: "#C0392B"
  error-background: "#FDECEC"
typography:
  headline:
    fontFamily: "Montserrat, Arial, sans-serif"
    fontSize: "28px"
    fontWeight: 300
    lineHeight: 1.2
  title:
    fontFamily: "Montserrat, Arial, sans-serif"
    fontSize: "18px"
    fontWeight: 500
  body:
    fontFamily: "Montserrat, Arial, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: "Montserrat, Arial, sans-serif"
    fontSize: "11px"
    fontWeight: 400
  figure:
    fontFamily: "Montserrat, Arial, sans-serif"
    fontSize: "22px"
    fontWeight: 500
    lineHeight: 1.2
rounded:
  surface: "6px"
  navigation: "4px"
  attention-list: "9px"
spacing:
  grid: "16px"
  desktop-gutter: "56px"
  compact-gutter: "24px"
  mobile-gutter: "18px"
components:
  create:
    backgroundColor: "{colors.cyan}"
    textColor: "{colors.white}"
    rounded: "{rounded.surface}"
    padding: "0 18px"
  notes:
    backgroundColor: "{colors.cyan}"
    textColor: "{colors.white}"
    rounded: "{rounded.surface}"
    padding: "0 20px"
  dashboard-card:
    backgroundColor: "{colors.white}"
    rounded: "{rounded.surface}"
    padding: "14px 18px 16px"
  navigation-active:
    backgroundColor: "{colors.pink}"
    textColor: "{colors.white}"
    rounded: "{rounded.navigation}"
---

# Design System: Life Deco Art HUB — Inicio

## Overview

**Creative North Star: "Inicio operativo del HUB/CMS"**

Inicio conserva la estructura de trabajo aprobada: saludo personal, Crear/Notas, atención prioritaria, cuatro métricas, agenda, etapas de pedidos e inventario. Su apariencia reutiliza el sistema preexistente del HUB/CMS: Montserrat, fondo crema, superficies blancas y navegación negra, con rosa para selección y cian para acciones.

La fuente de verdad es la implementación de `panel/panel.css`, `panel/app.mjs` y `panel.html`, revisada el 18 de septiembre de 2026. Esta memoria describe Inicio y su continuidad con el HUB; no ordena cambios en la web pública. La combinación de blanco sobre cian/rosa y el marrón auxiliar es una preferencia explícita aceptada por la propietaria.

**Key Characteristics:**
- Estructura operativa escaneable con datos reales.
- Continuidad visual con HUB/CMS.
- Superficies blancas planas sobre crema.
- Navegación negra, selección rosa y acciones cian.
- Vacíos explícitos y adaptación móvil.

## Colors

Crema es el fondo de trabajo; blanco identifica tarjetas y texto de acciones. Negro sostiene títulos, cifras y barra lateral. Marrón sirve para texto auxiliar, enlaces de contenido, iconos y separadores suaves. Rosa identifica la navegación seleccionada; cian identifica Crear y Notas. Todos los iconos del contenido principal usan marrón (#8B795E), incluidos atención, métricas y Agregar actividad; los iconos de acciones cian y navegación mantienen su contexto. Agregar actividad usa icono marrón sobre `brown-soft`.

Verde y rojo expresan estados y tendencias. Advertencias informativas usan marrón. Los estados conservan etiquetas además del color. Etapas e inventario muestran cifras y etiquetas sin barras inferiores.

**The Continuity Rule.** Conservar la asignación de colores del HUB/CMS y la preferencia explícita de blanco sobre cian/rosa y marrón auxiliar; no sustituirla por una nueva paleta.

## Typography

Montserrat es la familia de toda la interfaz de Inicio. Títulos principales: 28 px y peso 300; secundarios: 18 px y peso 500; interfaz: 13 px; información técnica: 11 px. El nombre del saludo usa peso 500. Las cifras principales usan 22 px y las de categorías 19 px, ambas con números tabulares y peso 500.

En móvil de hasta 640 px, el saludo baja a 24 px y los títulos de tarjeta a 16 px. Los archivos locales declaran el archivo Montserrat 500 para los pesos 500–800; los pesos descritos son declaraciones CSS, no archivos separados por grosor. Inicio no incluye firma manuscrita lateral.

## Layout

La barra lateral mide 250 px. El encabezado tiene una altura mínima de 98 px, saludo a la izquierda y acciones a la derecha. Comparte con el contenido el margen lateral `--hub-content-gutter`; una línea inferior se alinea con ese mismo margen. El margen es 56 px, baja a 24 px hasta 1150 px y a 18 px hasta 859 px. El contenido comienza con 28 px de separación superior en escritorio.

Orden: atención prioritaria, cuatro métricas y zona inferior con agenda junto a etapas e inventario. En escritorio, la zona inferior usa `minmax(0,1.1fr) minmax(400px,1fr)` para dar más ancho a Pedidos e Inventario. Separación entre bloques: 16 px. Hasta 1250 px, las cifras pasan a dos columnas y la zona inferior se apila, con etapas e inventario emparejados. Hasta 859 px, la navegación pasa a menú móvil y esos resúmenes se apilan. Hasta 640 px, las cifras tienen una columna, las acciones admiten salto de línea y Crear abre su menú alineado a la izquierda. Las etiquetas de categorías admiten varias líneas.

## Elevation & Depth

Las tarjetas y métricas tienen fondo blanco, sin borde exterior ni sombra. La separación depende del contraste con el crema y del espacio. Los separadores internos de atención y categorías permanecen. El desplegable Crear, como capa temporal, conserva borde y sombra (`0 14px 32px var(--shadow-soft)`); esta excepción no debe trasladarse a las tarjetas. La regla global de movimiento reducido desactiva transiciones.

## Shapes

Radio base de superficies y acciones: 6 px. Navegación: 4 px. La lista interna de atención mantiene 9 px. Los iconos resumen son circulares; los círculos informativos no se presentan como botones.

Los títulos Requiere atención, Trabajo de hoy, Pedidos por etapa e Inventario aparecen sin iconos decorativos. Los iconos circulares de las cuatro métricas y el check de «Todo está al día» comparten fondo `brown-soft` y color marrón (#8B795E). Agregar actividad conserva esa misma combinación. Los iconos de las filas de atención también usan este tratamiento uniforme; el color de estado se mantiene en los textos correspondientes.

## Components

### Cabecera y navegación

El saludo es fijo: «Buenos días, Melani»; no varía según la hora ni los datos de la cuenta. No existe avatar ni inicial. Crear despliega enlaces reales de creación y Notas abre el diálogo existente. Ambos botones son cian con texto blanco; al pasar el cursor conservan el fondo y oscurecen el borde. La navegación usa fondo negro, texto blanco y selección rosa con `aria-current="page"`. Los enlaces Abrir agenda y Ver todos aparecen sin flecha.

### Atención y cifras

Atención muestra cotizaciones enviadas o vencidas, pedidos activos sin actualización durante al menos tres días y materiales controlados en el mínimo o por debajo. «Ver todo» lleva a la primera categoría presente. Sin registros relevantes, el texto aclara que no hay asuntos urgentes «con los datos registrados».

Las cuatro cifras son Ventas del mes, Cobrado, Por cobrar y Gastos. Ventas usa facturas del mes; cobros y gastos van desde el inicio del mes hasta hoy; el saldo pendiente es total. Las tendencias comparan con el mes anterior completo; una base cero produce texto sin porcentaje inventado. Verde/rojo indica subida/bajada numérica, no conveniencia económica de un gasto.

### Agenda, etapas e inventario

Trabajo de hoy muestra hasta cuatro eventos de la fecha actual. El vacío conserva Agregar actividad. Pedidos agrupa pendiente, proceso (diseño/aprobación/producción), listo para entregar y entregado. Inventario cuenta materiales controlados, no unidades: sobre mínimo, positivos en el mínimo o por debajo y sin existencia. Todos los valores proceden del estado real.

### Interacción

Los enlaces de títulos se subrayan al pasar el cursor. Los enlaces de atención usan marrón sobre fondo marrón suave y oscurecen el texto al pasar el cursor. Los campos y enlaces heredan el enfoque del HUB: borde existente o cambio de color, sin aro exterior añadido. Esta documentación registra la preferencia visual aceptada y la implementación; no afirma una certificación general de accesibilidad.

## Do's and Don'ts

### Do:
- **Do** conservar Montserrat y los roles de color del HUB/CMS.
- **Do** mantener las superficies blancas sin borde exterior ni sombra.
- **Do** alinear el encabezado, su línea y el contenido con el mismo margen lateral.
- **Do** mostrar datos reales, vacíos honestos y acciones útiles.

### Don't:
- **Don't** introducir una nueva paleta para Inicio.
- **Don't** reemplazar la preferencia aceptada de blanco sobre cian/rosa y marrón auxiliar.
- **Don't** rellenar métricas, agenda o atención con actividad ficticia.
- **Don't** añadir barras bajo etapas e inventario ni presentar las comparaciones mensuales como períodos equivalentes.
