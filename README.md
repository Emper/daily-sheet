# Hoja diaria

Generador de hojas de ejercicios A4 para Primaria (1º–6º). Sin backend, sin base de
datos, sin cuentas. Se abre, se pulsa **Imprimir** y sale un PDF con una página por
niño.

```bash
npm install
npm run dev      # http://localhost:5180
npm run check    # audita el equilibrio del compositor sobre 120 hojas × 6 cursos
```

Al imprimir: **A4**, márgenes **predeterminados**, y desactivar encabezados y pies
del navegador. Desde ahí, "Guardar como PDF" da el fichero. El título del documento
lleva la fecha (`Hoja diaria 2026-09-18`), que es el nombre que el navegador propone
para el PDF: así los ficheros no se llaman todos igual y ordenan por fecha.

---

## 1. Decisiones técnicas

| Decisión | Por qué |
|---|---|
| **HTML + CSS `@page`** en vez de una librería de PDF | La hoja acaba en papel igualmente. Con CSS de impresión tienes tipografía real, SVG real y flexbox/grid real; con `@react-pdf/renderer` tendrías un motor de maquetación paralelo, fuentes embebidas a mano y SVG limitado. "Guardar como PDF" del navegador cubre el caso PDF. |
| **Sin estado servidor** | Las preferencias caben en `localStorage`. Lo único que hay que recordar entre días es qué ejercicios salieron, y son cinco arrays de strings. |
| **PRNG con semilla** (`src/core/rng.ts`) | La semilla es `fecha \| idNiño \| salt`. La hoja de un día es reproducible sin guardarla: si se pierde el papel, se reimprime idéntica. El botón *Regenerar* solo incrementa `salt`. |
| **Rejilla de celdas** en vez de flujo libre | Cada ejercicio declara `cols` (1 o 2) y `rows`. La hoja tiene 29×2 = 58 celdas de 6 mm. Así el compositor sabe *antes* de renderizar si algo cabe, y el paginado no depende de la suerte. |
| **Los bloques crecen para llenar la hoja** | El empaquetado a huecos exactos siempre dejaba filas sueltas que ningún bloque podía ocupar, y se veían como un agujero al final de la página. Tras colocar, los bloques crecen hacia abajo **por turnos** (así el sobrante se reparte en vez de acumularse en el primero), hasta un 50 % más de su alto declarado. El aire de más no se desperdicia: se usa para escribir. Los bloques con dibujo de tamaño fijo —sudoku, relojes— se marcan `flexible: false` y solo crecen si aún queda hueco. Resultado: **98–100 % de la hoja**, con 0,9 mm de media sin usar al pie. |
| **Empaquetado 2D explícito** (`core/packer.ts`) | Un presupuesto de *área* miente: "me quedan 12 celdas" no significa que quepa un bloque de 7 filas. Con el presupuesto de área, CSS colocaba el bloque igual, le daba filas implícitas de alto cero y **recortaba el contenido en silencio**. Ahora el compositor calcula la posición exacta de cada bloque y la hoja se pinta con coordenadas explícitas. |
| **Altos escalados por ciclo** (`rowsFor`) | El cuerpo de letra va de 12,5 pt en 1er ciclo a 10 pt en 3º. Un bloque calibrado para 6º se desborda ~25 % en 2º. `rowsFor(cycle, base, fixed)` escala el alto, y `fixed` son las filas de algo que no escala con la tipografía (la esfera de un reloj, la rejilla de un sudoku). |
| **Fuente auto-hospedada** (Nunito, OFL 1.1) | La maquetación está calibrada en milímetros contra unas métricas concretas. Con la fuente del sistema, el mismo A4 se corta en otra máquina: forzando una tipografía un 11 % más ancha, **17 de 346 bloques se salían de su caja**, hasta 12,9 mm. Va empaquetada por Vite, no desde un CDN: así no hay petición a terceros desde una página que usan niños ni dependencia de la red al imprimir. Solo el subconjunto latino (~53 KB). Se descartó Atkinson Hyperlegible, mejor en legibilidad pura, porque trae el **cero tachado** y en una hoja de cálculo de 2º eso despista. |
| **Vite 6, no 7** | Vite 7 exige Node ≥20.19 y aquí hay **Node 20.11.1**. Recomendable subir a Node 22 LTS y entonces actualizar Vite. |

### Estructura

```
src/
  core/        rng, tipos, registro, compositor, packer, packs, layout, localStorage
  content/     el banco curado (JSON): lecturas, citas, inglés, lengua
  exercises/   un módulo por asignatura; cada uno exporta un array de ExerciseType
  print/       Sheet.tsx + print.css  ← toda la geometría del A4
               checkin.tsx: el bloque de cierre (termómetro del día)
  app/         panel de control (no se imprime)
scripts/       check-balance.mts: auditoría del compositor
```

### Añadir un ejercicio nuevo

Un `ExerciseType` es un objeto con metadatos y una función `generate` pura:

```tsx
const miEjercicio: ExerciseType = {
  id: 'mates.fracciones',
  name: 'Fracciones',
  subject: 'mates',
  format: 'dibujo',          // el compositor evita 3 bloques del mismo formato
  grades: [3, 4, 5, 6],
  generate({ grade, cycle, rng }) {
    // `rows` se calibra para 3er ciclo; rowsFor lo escala para 1º y 2º.
    return { typeId: 'mates.fracciones', title: '…', subject: 'mates',
             format: 'dibujo', cols: 1, rows: rowsFor(cycle, 5), body: <…/> }
  },
}
```

Se añade al `export default [...]` de su fichero y ya entra en el sorteo. **Todo el
azar tiene que salir del `rng` recibido**: usar `Math.random()` rompe la
reproducibilidad de la hoja.

Si te pasas con `rows`, la previsualización lo avisa en pantalla con un aviso
amarillo (que nunca se imprime): `Sheet.tsx` mide dónde acaba de verdad el último
hijo de cada bloque.

### Configuración

El principio es que la herramienta decida por defecto y se abra un botón: `Variado`,
`Normal`, todas las asignaturas. El ajuste fino existe para el día que quieras
mandar tú, no para tener que decidir cada mañana.

**Packs** (`core/packs.ts`) — la forma de la sesión de hoy. Reutilizan las recetas que
ya usaba el compositor por dentro:

| Pack | Qué hace |
|---|---|
| Variado | Una hoja, receta al azar. El de siempre. |
| Repaso de mates | **Solo** matemáticas y lógica. |
| Letras y lenguas | **Solo** lengua e inglés. |
| Exprés | Media hoja, ~8 min, máx. 4 bloques **y máx. 7 filas por bloque**. |
| Fin de semana | Dos hojas. |
| Maratón | Tres hojas. |

Los packs temáticos no eligen una receta: traen su **propio reparto** (`quota`) y
además acotan el pool de relleno. Reutilizar una receta los dejaba en un 60 % de
matemáticas, y acotar solo el reparto dejaba que el relleno colara lengua para tapar
un hueco. Con las dos cosas: **100 % de bloques dentro del tema**, medido.

El tope de altura por bloque en Exprés no es un capricho. Sin él, una comprensión
lectora se comía la media hoja entera y salían hojas de un solo ejercicio (la
auditoría cazó 10 de 180).

### Una tirada no repite nada

`core/pick.ts` mantiene un registro de lo gastado que se comparte por **toda la
tirada**: todas las hojas y todos los niños. No cubre solo los tipos de ejercicio,
también el contenido concreto —la frase del día, el texto de lectura, la pregunta de
cierre, la tabla de multiplicar, el tema de vocabulario, la palabra del código
secreto—. Los generadores tiran del banco con `pickFresh`, que descarta lo ya usado y
solo vuelve a la lista entera cuando se ha gastado todo.

El compositor hace dos pasadas: la primera veta todo lo usado, y solo si aún queda
sitio en la hoja se permite repetir. Media hoja en blanco es peor que un ejercicio
repetido, pero lo segundo solo ocurre cuando la aritmética obliga.

Medido sobre tiradas de dos hermanos (grados 2 y 4):

```
Variado (2 pág.)           5.2 bloques/hoja · repetidos 0.1  (inevitables 0.0)
Repaso de mates (2 pág.)   5.5 bloques/hoja · repetidos 1.9  (inevitables 1.9)
Letras y lenguas (2 pág.)  5.0 bloques/hoja · repetidos 0.9  (inevitables 0.9)
Exprés (2 pág.)            3.0 bloques/hoja · repetidos 0.0  (inevitables 0.0)
Fin de semana (4 pág.)     5.2 bloques/hoja · repetidos 2.9  (inevitables 2.9)
Maratón (6 pág.)           5.3 bloques/hoja · repetidos 13.6 (inevitables 13.6)
El bloque de cierre no se repite nunca, en ningún pack.
```

"Inevitables" es el mínimo aritmético: con 34 bloques y 17 tipos disponibles hay que
repetir 17 veces sí o sí. Los packs largos están **exactamente** en ese mínimo, que es
lo mejor que se puede hacer sin ampliar el catálogo. Un pack temático tiene un mínimo
más alto porque solo puede tirar de sus asignaturas.

**Nivel por niño** (`Fácil` / `Normal` / `Reto`) — desplaza ±1 la calibración sin tocar
el curso que sale impreso en la cabecera. "4º" no significa lo mismo para cada niño.

El detalle que importa: el nivel mueve **la dificultad**, no **el tamaño**. Si el ciclo
de maquetación siguiera al nivel, un niño de 2º en modo reto recibiría bloques
calibrados para letra de 6º y se le saldría el contenido. Por eso `GenContext` lleva
dos ciclos separados: `cycle` (curso real → tipografía y alto de bloque) y
`contentCycle` (curso ajustado → qué se coge del banco). La única excepción es la
comprensión lectora, que suma una fila cuando el texto viene del ciclo siguiente
porque es más largo.

En 1º no se ofrece `Fácil` y en 6º no se ofrece `Reto`: no tienen a dónde ir, y un
control que no hace nada es peor que no tenerlo.

**Asignaturas activas** — interruptor global, plegado bajo *Ajustes*. La lista sale del
registro de ejercicios, no de una constante: `entorno` existe en el modelo de datos
pero no tiene ejercicios todavía, y ofrecerlo como filtro permitiría dejarlo solo y
generar una hoja vacía. Lista vacía significa "todas", así que el filtro se adapta
solo según crezca el catálogo.

Lo que **no** hay, a propósito: interruptores por tipo de ejercicio concreto. Es mucho
toqueteo para poca ganancia y carga de decisiones cada mañana.

---

## 2. Qué hace una hoja equilibrada

Esta es la parte que más condiciona que los niños la hagan o no. Principios que he
aplicado, y de dónde vienen:

**El eje que evita la monotonía no es la asignatura, es el canal.** Una hoja con
matemáticas, lengua e inglés puede ser igualmente aburrida si los tres bloques son
"rellena el hueco". Por eso cada ejercicio declara un `format` —`calculo`, `tabla`,
`huecos`, `texto`, `dibujo`, `copia`, `logica`— y el compositor permite como mucho
dos bloques del mismo formato. Es la restricción que más se nota.

**Duración objetivo.** 15–20 min en 1º–2º, 20–25 en 3º–4º, 25–30 en 5º–6º. Una hoja
diaria de 45 minutos se abandona en una semana. El presupuesto de 32 celdas y el
cuerpo de letra por ciclo están calibrados para eso: salen ~5 bloques por hoja.

**Tamaño de letra y renglón por edad.** Un niño de 1º necesita el doble de alto de
renglón que uno de 6º; si no le cabe la letra, el ejercicio se convierte en un
ejercicio de motricidad. Ciclo 1 va a 13 pt con renglón de 10 mm y doble pauta
(línea de apoyo a media altura); ciclo 3, a 10,5 pt y 7 mm.

**Dificultad deseable, no máxima.** El objetivo es ~80 % de aciertos esperados. Si
el niño falla la mitad, la hoja desmotiva; si acierta todo sin pensar, no entrena
nada.

**Práctica intercalada y repaso espaciado.** Veinte multiplicaciones seguidas de la
misma tabla se resuelven en piloto automático. Mejor mezclar, y volver al mismo
contenido días después. El historial de 5 hojas en `localStorage` penaliza los tipos
recientes: es un espaciado pobre pero real.

**Recuperación, no reconocimiento.** Completar de memoria fija más que copiar o
elegir entre opciones. Por eso el banco de palabras de inglés desaparece en tercer
ciclo, y en la tabla de multiplicar a partir de 3º el hueco cae a veces en el factor
(`7 × __ = 42`), que obliga a pensar la división sin llamarla división.

**Reversibilidad.** Pedir lo mismo en los dos sentidos cuesta más y enseña más:
relojes con agujas para leer la hora *y* esferas vacías para dibujarlas; vocabulario
inglés→español *y* español→inglés. Ambos ya implementados.

**Al menos un bloque de producción abierta.** Escritura libre, familia de palabras,
"explica qué te sugiere la frase". Sin eso la hoja es puro *drill* y se nota.

**Curva de esfuerzo.** Lo ideal es abrir con algo corto y de éxito garantizado (la
frase del día funciona muy bien de arranque), poner el bloque exigente en el segundo
tercio, y cerrar con algo manipulativo (sudoku, relojes, código secreto).

**Cerrar con algo que no se corrige.** La hoja termina siempre con un *check-in*: una
pregunta del día ("¿cómo te has sentido hoy en clase?", "¿cuánto cansancio tienes?")
y una escala a trazo que el niño colorea —caritas, estrellas, una pila, del 1 al 10—.
No tiene respuesta correcta. Las preguntas rotan a diario y están escritas por ciclo:
en 1º se pregunta por el recreo, en 5º-6º por si algo le ha preocupado. Algunas
añaden un renglón para escribir, que es donde de verdad sale la conversación.

### Lo que el compositor hace hoy

`src/core/composer.ts`:

1. Sortea una de **6 recetas** de reparto por asignatura (`equilibrada`, `letras`,
   `números`, `idiomas`, `mixta`, `lógica`). Es lo que hace que la hoja del martes no
   tenga la misma forma que la del lunes sin que un día salga toda de mates.
2. Un bloque como máximo **por tipo**.
3. Como máximo **dos bloques del mismo formato**, y **bonus a los formatos que aún no
   han salido**. Esto es lo que casi eliminó las hojas monótonas.
4. **Peso por tipo.** No todos los ejercicios merecen la misma probabilidad. Con ocho
   tipos de matemáticas en 2º compitiendo en igualdad, las sumas salían una de cada
   cuatro hojas: demasiado poco para lo que es práctica diaria. Las sumas y las tablas
   llevan `weight: 2`, las multiplicaciones 1,6, y el laberinto o el sudoku 0,7,
   porque son un premio, no un entrenamiento. Resultado en 2º: sumas 30 %, tablas
   30 %, multiplicaciones 20 % — cuatro de cada cinco hojas llevan cálculo básico—, y
   nada baja del 10 % (uno cada diez hojas).
5. **Penalización por recencia** sobre las últimas 5 hojas de ese niño.
6. **Tope de 8 bloques**: en 5º-6º la letra es más pequeña y cabría más, pero "cabe"
   no es "conviene" con un objetivo de 15 minutos.
7. Empaquetado 2D real; si sobran ≥5 celdas mete un relleno antes que dejar hueco.
8. El **check-in** tiene sitio reservado desde el principio, así que nunca compite con
   los ejercicios; al final sube a pegarse al último bloque para que el hueco que
   sobre quede al pie, como margen, y no como un agujero en medio.
9. Los bloques se numeran en **orden de lectura** (arriba→abajo, izquierda→derecha).
10. El historial se anota **al imprimir**, no al previsualizar.

Auditoría real (`npm run check`, 120 hojas por curso):

```
29 tipos de ejercicio
bloques/hoja: 5.1 (1º) → 5.8 (6º)     relleno: 99–100 % del A4
repeticiones día a día: 0.24–0.51/hoja, de las que solo 0.07–0.17 son "no buscadas"
ningún tipo de ejercicio queda sin salir nunca
Todo en orden.
```

El gradiente de bloques por hoja es intencionado: en 1º la letra es un 25 % mayor, así
que caben menos ejercicios y más grandes.

La auditoría distingue dos clases de repetición. Que a un niño le salgan sumas dos
días seguidos, con números distintos, **es el objetivo**; que le salga el mismo
laberinto dos días seguidos, no. Por eso solo cuenta como problema repetir un tipo con
peso ≤ 1, y el umbral está en 0,7 por hoja.

La auditoría **avisa cuando la repetición no buscada pasa de 0,7 bloques/hoja**. Con 13
tipos avisaba en 1º, 5º y 6º; con 24 no avisa en ninguno. El caso de 1º era el más
claro y no se arreglaba con más tipos en general: solo tenía **dos** de inglés y las
recetas piden entre uno y tres huecos de inglés al día, así que repetía por fuerza.
Abrir `writing`, `fracciones` y el código secreto a 1º lo bajó de 1,30 a 0,65.

`npm run check` cubre además los packs (número de hojas, bloques por hoja, repetición
entre hojas del mismo día), los niveles (que `fácil`/`normal`/`reto` produzcan de
verdad hojas distintas) y los filtros de asignatura (que ninguna asignatura a solas
genere una hoja vacía).

### Verificación de maquetación

Lo que la auditoría no ve es si el contenido cabe de verdad en su caja, porque eso
depende del navegador. Para eso está el aviso en pantalla de la previsualización, y
un barrido que regenera decenas de veces con los seis cursos a la vez y mide dónde
acaba cada hijo de cada bloque, **por abajo y por la derecha**. Lo segundo no es
teórico: una rejilla de dos columnas con `white-space: nowrap` no desborda su propia
celda, ensancha la columna, así que el texto se sale de lado sin que ninguna medida
vertical lo note. Así apareció que "1 hora = ____ minutos" se pisaba con la columna
de al lado en primer ciclo.

Última pasada: **480 bloques, 84 hojas y los 24 tipos, sin un solo desbordamiento**,
con 0,9 mm de media sin usar al pie de la rejilla. Repetida con los seis cursos en
`Reto`, en `Fácil + Exprés`, en `Maratón` y en `Repaso de mates + Reto`.

### Reglas recomendadas que todavía **no** están

- **Ordenar por curva de esfuerzo.** El orden lo decide hoy el empaquetado, que es una
  decisión de maquetación, no pedagógica.
- **Forzar ≥1 bloque de producción abierta.** Hoy sale por estadística, no por
  construcción.
- **Espaciado por contenido, no por tipo.** Hoy evita repetir "tabla de multiplicar";
  no evita que salga la tabla del 7 dos días seguidos.

---

## 3. Catálogo de tipologías

✅ implementado · ⬜ pendiente, por orden aproximado de rentabilidad.

### Matemáticas
✅ Tablas de multiplicar (hueco en factor o en producto) · ✅ **Sumas y restas en
columna** (con decimales en 3er ciclo) · ✅ **Multiplicaciones en columna** ·
✅ **Divisiones en caja** (a la española: dividendo │ divisor, con sitio para bajar
cifras y para el cociente) · ✅ Problemas de enunciado · ✅ Relojes analógicos
bidireccionales · ✅ Unidades de medida · ✅ Comparar `< > =` · ✅ **Fracciones**
(gráfico ↔ número, en barra y en círculo) · ✅ **Monedas y billetes** (contar y dar
cambio)

Las tres de columna son tipos separados, no uno que sortea la operación: así el
compositor puede darte "sumas y restas" y "divisiones" en la misma hoja, y el
catálogo crece. La multiplicación sencilla (dos cifras por una) entra ya en 2º.

Cada operación ocupa **justo lo que miden sus cifras**, no un ancho fijo, y va a
1,25 em: con la caja fija de 28 mm el signo quedaba pegado al borde izquierdo y dejaba
un hueco enorme hasta el número. Ancho máximo medido: 18,9 mm. Las cifras van **sin separador de millares**, porque en una operación
en vertical el niño escribe una cifra por columna y el punto de los miles rompe esa
alineación; la coma decimal sí se mantiene. Rangos por curso: sumas de 2 cifras en 1º
a 6 cifras y decimales en 5º-6º; multiplicaciones de 2×1 en 3º a 5×3 en 6º; divisiones
de 2 cifras entre 1 en 3º a 5 entre 3 en 6º, casi siempre con resto.
⬜ Descomposición y valor posicional · ⬜ Geometría sobre cuadrícula (perímetro, área,
simetría) · ⬜ Cálculo mental con estrategia (doblar, compensar) · ⬜ Interpretar una
tabla o un gráfico de barras · ⬜ Redondeo y estimación · ⬜ Múltiplos, divisores y
primos · ⬜ Decimales y porcentajes · ⬜ Numeración romana · ⬜ Coordenadas

### Lengua
✅ Comprensión lectora (**45 textos**, 15 por ciclo; las preguntas mezclan a propósito
nivel literal, inferencial y léxico) · ✅ Frase del día + copia · ✅ Ortografía reglada · ✅ Ordenar palabras para
formar una frase · ✅ Familia de palabras
⬜ Sinónimos y antónimos · ⬜ Puntuar un texto sin puntuar · ⬜ Sílaba tónica y tildes
(agudas/llanas/esdrújulas) · ⬜ Análisis morfológico básico · ⬜ Conjugación verbal ·
⬜ Escritura creativa con consigna (principio dado + 3 palabras obligatorias) ·
⬜ Orden alfabético / diccionario

### Inglés
✅ Fill in the gaps (con banco de palabras hasta 4º, sin él en 5º–6º) · ✅ Irregular
verbs con columna oculta variable · ✅ Vocabulary bidireccional · ✅ Writing con
consigna · ✅ **Word search** (sopa de letras con el vocabulario por temas; → y ↓ en
1er ciclo, diagonal en 2º, también al revés en 3º) · ✅ **Numbers** (cifra ↔ letra, en
inglés británico: *three hundred and five*) · ✅ **Word order** · ✅ **Reading** con
*yes/no* en 1er ciclo y *True/False* después · ✅ **Short answers** (*Does she like
cats?* ✓ → *Yes, she does.*)
⬜ Crucigrama · ⬜ Unir palabra–dibujo · ⬜ Preposiciones de lugar sobre un dibujo

La lectura en inglés es de respuesta cerrada a propósito: en lengua extranjera, a
estas edades, lo que se comprueba es que han entendido el texto, no que sepan
redactar en inglés sobre él. Las instrucciones van en inglés pero al nivel del inglés
que lee el niño: en 1º-2º *"Put the words in order."*, no *"…start with a capital
letter and end with a full stop"*.

Con estos cinco, cada tipo de inglés sale en el 15-23 % de las hojas; antes, con
tres o cuatro tipos, cada uno salía en el 42-50 %.

### Lógica
✅ Series numéricas (aritméticas, geométricas, alternas, cuadrados, Fibonacci, paso
creciente) · ✅ Sudoku 4×4 y 6×6 **con solución única garantizada** (se cava el tablero
comprobando unicidad en cada casilla) · ✅ Código secreto · ✅ **Laberintos** (DFS con
vuelta atrás: laberinto perfecto, siempre con solución y sin atajos) ·
✅ **Secuencias de figuras** (patrón que se repite, giro constante, cuenta creciente)
⬜ Acertijos de tabla ("quién tiene qué") · ⬜ Criptoaritmética · ⬜ Completar por
simetría en cuadrícula

Dos detalles de tinta: las fracciones se sombrean con **trama diagonal**, no con
relleno macizo —se lee igual y gasta una fracción del tóner—, y el patrón SVG lleva un
id único por instancia porque en una tirada hay varias hojas en el mismo documento.

### Conocimiento del Medio — **el hueco más grande**
⬜ Mapa mudo de España (CCAA, ríos, provincias) · ⬜ Cuerpo humano · ⬜ Ciclo del agua
y estados de la materia · ⬜ Clasificar seres vivos · ⬜ Sistema solar · ⬜ Línea del
tiempo

Se ha quedado fuera de la fase 1 porque casi todo necesita SVG o ilustración, no solo
texto: es un bloque de trabajo en sí mismo. El tipo `entorno` ya existe en el modelo
de datos, solo falta contenido.

---

## 4. El banco de lecturas

Los nueve textos iniciales eran todos prosa, narrativa o expositiva. Ese es el mismo
error que el compositor ya evita con los ejercicios: variedad de asignatura sin
variedad de formato. **Un niño que solo lee cuentos no aprende a leer una receta, una
entrevista ni una noticia**, y cada tipología se lee de una manera distinta.

Por eso cada texto declara un `kind`, y el banco cubre ocho tipologías en los tres
ciclos: narrativo, descriptivo, expositivo, instructivo, dialogado, poético, carta y
noticia, más argumentativo y biográfico en tercer ciclo. El enunciado se adapta solo:
"Lee **este diálogo** y responde", "Lee **el poema** y responde".

```
ciclo 1: 15 textos ·  28-48  palabras · 8 tipologías
ciclo 2: 15 textos ·  39-87  palabras · 8 tipologías
ciclo 3: 15 textos ·  71-154 palabras · 8 tipologías
un texto se repite cada ~50 hojas (antes: cada ~15)
los 45 textos salen; ninguno queda sin usar
```

Dos consecuencias técnicas:

**El alto del bloque se calcula del texto real.** Con textos de 28 a 154 palabras, un
alto fijo por ciclo o desborda los largos o desperdicia media hoja con los cortos.
`readingRows()` estima líneas a partir de la longitud y del cuerpo de letra del ciclo.
La estimación tira por lo alto **a propósito**: quedarse corto recorta el texto, pero
pasarse no cuesta nada, porque el reparto de espacio sobrante estira los demás bloques
igualmente. Medido sobre 34 textos distintos: entre 3 y 17 mm de holgura, nunca
negativa.

**Los renglones se dimensionan para letra manuscrita, no impresa.** Un niño de 7 años
escribe con letras de 4-5 mm: "seventeen" impreso ocupa 25 mm, escrito a mano 45. Por
eso los ejercicios de escribir palabras usan un renglón que llega hasta el borde del
bloque, y los de frase completa (ordenar palabras, en lengua y en inglés) calculan
cuántos renglones necesita la frase **escrita a mano** con `handLines()`. Antes, una
frase de diez palabras de 3er ciclo tenía un solo renglón para escribirse.

**Verso, diálogo y listas de pasos se maquetan línea a línea.** El texto se parte por
saltos de línea y, cuando hay más de uno, se deja de justificar: justificar un poema
le parte el ritmo y le abre huecos entre palabras.

El bloque de lectura va marcado `flexible: false`. Sus renglones de respuesta son
fijos, así que el espacio de más se le queda en blanco al pie; que se lo lleven antes
los ejercicios donde el niño escribe. Esto bajó su holgura media de 53 mm a 10 mm.

---

## 5. Despliegue

Es un estático puro: sin backend, sin base de datos, sin variables de entorno.

```
build:   npm run build
salida:  dist
node:    >=20.11 (.nvmrc fija 22)
```

Vercel, Netlify y Cloudflare Pages lo autodetectan como Vite y no necesitan
`vercel.json` ni reglas de *rewrite*: no hay router, es una sola página.

Dos cosas que conviene saber del despliegue:

- **Es público.** Cualquiera con la URL entra. No se sube ningún dato: los nombres y
  cursos de los niños viven en el `localStorage` del navegador y no salen de ahí.
- **Las preferencias no sincronizan** entre dispositivos, por lo mismo. Si abres la web
  en otro sitio, hay que volver a configurar los niños.

---

## 6. Limitaciones conocidas

- **Node 20.11.1** obliga a fijar Vite 6. Subir a Node 22 LTS y actualizar.
- **El catálogo ya no se queda corto, pero tampoco sobra.** Con 24 tipos y ~6 bloques
  por hoja se repite medio bloque al día. `npm run check` avisa si eso empeora.
- **Sin solucionario**, por decisión. Los generadores sí conocen la respuesta
  internamente, así que añadirlo más adelante es barato.
- **Fuente del sistema.** Para 1º–2º iría mejor una tipografía escolar (Escolar,
  Andika) con la `a` y la `g` de una sola panza.
- **No hay IA, y de momento no hace falta.** Todo el contenido está escrito a mano en
  `src/content/*.json`. Si algún día se quisiera generar por lotes, el sitio donde
  encaja es esa carpeta más la función `byCycle`, y lo sensato sería un script de
  línea de comandos que escriba el JSON para revisarlo antes de commitear, no una
  llamada en tiempo de impresión: lo que leen los niños conviene mirarlo antes.
