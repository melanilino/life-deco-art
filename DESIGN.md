---
name: Life Deco Art HUB — Inicio
description: Tablero operativo cálido para la propietaria, documentado desde la implementación del 18 de septiembre de 2026.
colors:
  home-bg: "#f7f3ed"
  home-card: "#fffdfb"
  home-ink: "#211d1b"
  home-muted: "#756c67"
  home-accent: "#a9534d"
  home-accent-soft: "#f8e8e6"
  home-accent-hover: "#8f433e"
  home-line: "#e7ddd6"
  sidebar-charcoal: "#211e1b"
  white: "#ffffff"
typography:
  headline:
    fontFamily: "Montserrat, Arial, sans-serif"
    fontSize: "28px"
    fontWeight: 300
    lineHeight: 1.15
    letterSpacing: "-.02em"
  title:
    fontFamily: "Montserrat, Arial, sans-serif"
    fontSize: "18px"
    fontWeight: 600
    letterSpacing: "-.02em"
  body:
    fontFamily: "Montserrat, Arial, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.65
  figure:
    fontFamily: "Montserrat, Arial, sans-serif"
    fontSize: "22px"
    fontWeight: 500
    lineHeight: 1.2
  label:
    fontFamily: "Montserrat, Arial, sans-serif"
    fontSize: "11px"
    fontWeight: 400
rounded:
  card: "12px"
  control: "9px"
  navigation: "8px"
spacing:
  grid: "16px"
  desktop-gutter: "34px"
  mobile-gutter: "18px"
components:
  create:
    backgroundColor: "{colors.home-accent}"
    textColor: "{colors.white}"
    rounded: "{rounded.control}"
    padding: "0 18px"
  create-hover:
    backgroundColor: "{colors.home-accent-hover}"
    textColor: "{colors.white}"
  dashboard-card:
    backgroundColor: "{colors.home-card}"
    rounded: "{rounded.card}"
    padding: "14px 18px 16px"
---

# Design System: Life Deco Art HUB — Inicio

## Overview

**Creative North Star: "Tablero de trabajo cálido"**

Inicio organiza la atención de una sola propietaria con lectura rápida, cifras reales y accesos directos. La navegación carbón enmarca superficies suaves sobre crema; el terracota destaca acciones y orientación sin convertir cada bloque en una llamada principal.

Este documento describe exclusivamente la expresión implementada de Inicio (`.home-shell`, `.home-header`, `.home-main`) en `panel/panel.css` y `panel/app.mjs`. No redefine la identidad de la web pública ni cambia las otras pantallas del HUB. Los colores y controles heredados de Notas conservan su implementación actual.

**Key Characteristics:**
- Jerarquía operativa: atención, cifras y trabajo del día.
- Superficies claras, esquinas suaves e iconos lineales.
- Datos reales y vacíos explícitos, sin actividad simulada.
- Navegación lateral en escritorio y menú desplegable en móvil.

## Colors

El terracota es el acento principal de Inicio: Crear, navegación activa, títulos enlazados e iconos de sección. El crema sostiene el espacio; el blanco cálido identifica las tarjetas; la tinta oscura prioriza cifras y títulos. El gris cálido se reserva para contexto y etiquetas secundarias.

Rojo, ámbar y verde distinguen atención urgente, advertencias y ausencia de asuntos urgentes. Las cifras usan fondos suaves propios en sus iconos. Estos colores acompañan siempre texto: no sustituyen la explicación. Las barras de etapas e inventario identifican categorías, no porcentajes ni avances medidos.

## Typography

Montserrat mantiene la continuidad del HUB. El saludo combina una entrada ligera con el nombre en peso 600. Las tarjetas usan títulos compactos; las cifras tienen números tabulares. El encabezado de marca utiliza letras espaciadas. Camelia queda en la firma lateral, no en las cifras ni en los controles.

En móvil, el saludo baja a 24 px y los títulos de tarjeta a 16 px. El archivo local de Montserrat 500 se declara para pesos 500–800: los valores de peso documentados son las declaraciones CSS, no archivos independientes para cada grosor.

## Layout

La columna lateral de Inicio mide 255 px; el contenido ocupa el resto sin ancho máximo. El encabezado reúne saludo y acciones Crear/Notas. La cuadrícula principal separa bloques con el espaciado definido en los tokens.

Orden de Inicio: Requiere atención; cuatro indicadores; Trabajo de hoy junto a Pedidos por etapa e Inventario. En anchos superiores a 1250 px, las cifras ocupan cuatro columnas y la zona inferior reparte el espacio en proporción 1.35 a 1, con un mínimo de 360 px en la columna derecha.

A 1250 px o menos, las cifras pasan a dos columnas y la zona inferior se apila; pedidos e inventario quedan emparejados. A 859 px o menos aparece el menú móvil y los bloques laterales pasan a una columna. A 640 px o menos las cifras se apilan, el avatar desaparece, las acciones admiten salto de línea y el menú Crear se alinea por la izquierda para permanecer dentro de la pantalla. Las etiquetas de etapas pueden ocupar varias líneas.

## Elevation & Depth

Las tarjetas combinan borde tenue y sombra ambiental (`0 8px 24px rgba(84,61,49,.045)`). El desplegable Crear usa una sombra mayor (`0 14px 32px rgba(61,43,34,.14)`) para distinguir la capa temporal. No hay animación decorativa propia del tablero; se mantiene la regla global de movimiento reducido.

## Shapes

Tarjetas redondeadas, controles compactos y círculos para iconos resumen. Los separadores finos agrupan filas de atención y categorías. Las barras de categorías tienen extremos completamente redondeados. Las formas circulares no indican botones cuando su contenido es solo un icono informativo.

## Components

### Cabecera y navegación

El saludo usa el nombre disponible en la cuenta/configuración mediante `ownerName()`; no se añade una identidad ficticia. El texto implementado es «Buenos días» y no cambia automáticamente según la hora. El avatar es una inicial decorativa. Crear abre enlaces de creación; Notas abre el diálogo existente. La navegación marca la página mediante `aria-current="page"`.

### Atención prioritaria

Solo aparecen categorías con registros: cotizaciones enviadas o vencidas, pedidos activos sin actualizar durante al menos tres días y materiales controlados en su mínimo o por debajo. Cada fila ofrece una acción a su sección. «Ver todo» lleva a la primera categoría presente, no a una bandeja agregada. Si no hay categorías, se muestra «Todo está al día» con la aclaración «con los datos registrados».

### Cifras

Ventas del mes, Cobrado, Por cobrar y Gastos proceden del estado del panel. Ventas usa facturas del mes; cobros y gastos usan el período del inicio de mes hasta hoy; Por cobrar muestra el saldo pendiente total. Las tendencias comparan con el mes anterior completo. Si la base anterior es cero, se muestra texto sin inventar porcentajes. El verde/rojo de la tendencia representa subida/bajada numérica y no una evaluación de conveniencia del gasto.

### Agenda y resúmenes

Trabajo de hoy muestra hasta cuatro eventos de la fecha actual con enlaces a sus registros. Sin eventos, mantiene un vacío claro y el enlace Agregar actividad. Pedidos agrupa pendiente, proceso (diseño/aprobación/producción), listo para entregar y entregado. Inventario cuenta materiales con control de existencias, no suma unidades: sobre mínimo, positivos en mínimo o por debajo, y sin existencias.

### Estados e interacción

Los enlaces de títulos se subrayan al pasar el cursor; Crear oscurece su fondo; las acciones de atención y agenda cambian suavemente de superficie. El enfoque hereda las reglas del panel: no hay un aro adicional; enlaces cambian de color y campos usan el borde existente. Esta descripción registra lo implementado y no constituye una certificación general de accesibilidad.

## Do's and Don'ts

### Do:
- **Do** mantener la jerarquía de lectura y los accesos asociados a datos reales.
- **Do** conservar vacíos explícitos y las acciones disponibles para empezar.
- **Do** limitar este mundo visual al alcance de Inicio hasta que se apruebe extenderlo.
- **Do** verificar etiquetas largas, menú Crear y cifras en móvil después de cualquier cambio.

### Don't:
- **Don't** rellenar el tablero con clientes, importes o actividad de muestra.
- **Don't** interpretar las barras de categorías como porcentajes de avance.
- **Don't** extrapolar las métricas mensuales como proyecciones o comparaciones entre períodos equivalentes.
- **Don't** trasladar estos tokens a la web pública sin una decisión expresa.
