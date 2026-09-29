// Generadores algorítmicos de ejercicios (Propuesta4.docx, Versión 3).
// Cada generador regresa un objeto con "tipo" que determina su forma:
//   numerico:       { tipo, enunciado, parametros, respuesta_correcta, unidad, xp }
//   opcion_multiple:{ tipo, enunciado, opciones:[{texto,es_correcta}], xp }
//   paso_a_paso:    { tipo, enunciado, ecuacion, pasos:[{numero_paso,descripcion}], xp }
//   simulacion:     { tipo, enunciado, tipo_simulacion, valores_iniciales, resultado_esperado, xp }
//
// XP fijo por tipo según RQNF21: 10 opción múltiple, 20 numérico/variable,
// 30 simulación o arrastrar elementos (paso a paso).

function entero(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function elegir(lista) {
  return lista[Math.floor(Math.random() * lista.length)];
}

function redondear(valor, decimales = 3) {
  const factor = 10 ** decimales;
  return Math.round(valor * factor) / factor;
}

function barajar(arr) {
  const copia = [...arr];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

// Genera distractores numéricos plausibles (para opción múltiple), evitando
// duplicados y valores no positivos.
function generarDistractores(correcto, cantidad = 3) {
  const factores = [0.5, 0.75, 1.25, 1.5, 2, 0.25];
  const distractores = new Set();
  let intentos = 0;
  while (distractores.size < cantidad && intentos < 30) {
    intentos++;
    const factor = elegir(factores);
    const candidato = redondear(correcto * factor, correcto < 1 ? 4 : 2);
    if (candidato > 0 && candidato !== correcto && !distractores.has(candidato)) {
      distractores.add(candidato);
    }
  }
  // Relleno de seguridad si por alguna razón no se juntaron suficientes.
  while (distractores.size < cantidad) {
    distractores.add(redondear(correcto + (distractores.size + 1) * (correcto || 1) * 0.3, 2));
  }
  return [...distractores];
}

// ============================================================================
// Álgebra / Expresiones algebraicas y operaciones (subtema 1)
// La propuesta define 4 algoritmos para este subtema: términos semejantes,
// operaciones con polinomios, factor común, y sustitución en fórmulas.
// Los primeros 3 dan como resultado una EXPRESIÓN (no un solo número), así
// que se presentan como opción múltiple con distractores de errores
// comunes reales, no numérico libre.
// ============================================================================

function signoTexto(n) {
  return n >= 0 ? `+ ${n}` : `− ${Math.abs(n)}`;
}

// "5x", "x" (coef=1), "-x" (coef=-1), "" (coef=0)
function formatearTermino(coef, variable) {
  if (coef === 0) return '';
  if (coef === 1) return variable;
  if (coef === -1) return `-${variable}`;
  return `${coef}${variable}`;
}

// Construye "5x + 3", "5x − 3", "5x" (si b=0), "3" (si a=0), evitando ceros.
function formatearBinomio(coefVar, constante, variable) {
  const parteVar = formatearTermino(coefVar, variable);
  if (constante === 0) return parteVar || '0';
  if (!parteVar) return `${constante}`;
  return `${parteVar} ${signoTexto(constante)}`;
}

// RQNF: 3 distractores únicos, siempre distintos de la correcta y nunca vacíos.
function conDistractores(correcta, generadorDistractor) {
  const set = new Set();
  let intentos = 0;
  while (set.size < 3 && intentos < 60) {
    intentos++;
    const d = generadorDistractor();
    if (d && d.trim() !== '' && d !== correcta) set.add(d);
  }

  // Malla de seguridad: si aun así no se juntaron 3 (colisiones numéricas
  // poco comunes), se generan variantes sintéticas modificando el primer
  // número de la respuesta correcta — garantiza 3 opciones siempre.
  let offset = 1;
  while (set.size < 3) {
    const numeroEncontrado = correcta.match(/-?\d+/);
    if (!numeroEncontrado) break; // sin número que perturbar, se rinde (caso extremo)
    const original = parseInt(numeroEncontrado[0], 10);
    const nuevo = original + offset * (offset % 2 === 0 ? 1 : -1);
    const candidato = correcta.replace(numeroEncontrado[0], String(nuevo));
    if (candidato !== correcta) set.add(candidato);
    offset++;
    if (offset > 10) break;
  }

  return [...set];
}

function armarOpciones(correcta, distractores) {
  return barajar([
    { texto: correcta, es_correcta: true },
    ...distractores.map((d) => ({ texto: d, es_correcta: false })),
  ]);
}

// --- Simplificación de expresiones algebraicas (términos semejantes) ---
function generarTerminosSemejantes() {
  const variante = elegir(['simple', 'mixta', 'negativos']);
  const variable = elegir(['x', 'y', 'a', 'n']);

  if (variante === 'simple') {
    const c1 = entero(1, 9);
    const c2 = entero(1, 9);
    const suma = c1 + c2;
    const enunciado = `Simplifica: ${formatearTermino(c1, variable)} + ${formatearTermino(c2, variable)}`;
    const correcta = formatearTermino(suma, variable);
    const distractores = conDistractores(correcta, () =>
      elegir([
        `${c1 * c2}${variable}`,
        `${suma}${variable}²`,
        formatearTermino(Math.abs(c1 - c2), variable),
        `${suma}${variable}${variable}`,
      ])
    );
    return { tipo: 'opcion_multiple', enunciado, opciones: armarOpciones(correcta, distractores), xp: 10 };
  }

  if (variante === 'negativos') {
    const c1 = entero(4, 9);
    const c2 = entero(1, c1 - 1); // resultado siempre positivo, evita ambigüedad de signo
    const resultado = c1 - c2;
    const enunciado = `Simplifica: ${formatearTermino(c1, variable)} − ${formatearTermino(c2, variable)}`;
    const correcta = formatearTermino(resultado, variable);
    const distractores = conDistractores(correcta, () =>
      elegir([formatearTermino(c1 + c2, variable), `${resultado}${variable}²`, formatearTermino(-resultado, variable)])
    );
    return { tipo: 'opcion_multiple', enunciado, opciones: armarOpciones(correcta, distractores), xp: 10 };
  }

  // mixta: 2x + 3y + x  ->  agrupar por variable
  const variables = ['x', 'y', 'a', 'b'];
  const [vA, vB] = barajar(variables).slice(0, 2);
  const c1 = entero(1, 9);
  const c2 = entero(1, 9);
  const c3 = entero(1, 9);
  const enunciado = `Simplifica: ${formatearTermino(c1, vA)} + ${formatearTermino(c2, vB)} + ${formatearTermino(c3, vA)}`;
  const sumaA = c1 + c3;
  const correcta = `${formatearTermino(sumaA, vA)} + ${formatearTermino(c2, vB)}`;
  const distractores = conDistractores(correcta, () =>
    elegir([
      `${formatearTermino(c1 + c2 + c3, vA)}`, // sumó todo junto, ignorando que son variables distintas
      `${formatearTermino(sumaA, vA)} + ${formatearTermino(c2 + c3, vB)}`, // agrupó mal
      `${formatearTermino(c1, vA)} + ${formatearTermino(c2 + c3, vB)}`,
    ])
  );
  return { tipo: 'opcion_multiple', enunciado, opciones: armarOpciones(correcta, distractores), xp: 10 };
}

// --- Operaciones con monomios y polinomios (suma, resta, multiplicación) ---
// NOTA: el orden de los términos no altera el resultado — el generador
// arma la expresión ya en un orden fijo, y la calificación compara contra
// el texto exacto de la opción correcta (no reordena en tiempo de respuesta).
function generarOperacionPolinomios() {
  const operacion = elegir(['suma', 'resta', 'multiplicacion']);
  const variable = elegir(['x', 'y']);

  if (operacion === 'multiplicacion') {
    const a = entero(2, 5);
    const b = entero(1, 9);
    const enunciado = `${a}${variable}(${variable} + ${b})`;
    const correcta = `${a}${variable}² + ${a * b}${variable}`;
    const distractores = conDistractores(correcta, () =>
      elegir([
        `${a}${variable}² + ${b}${variable}`, // no multiplicó b por a
        `${formatearTermino(a + b, variable)}²`, // sumó en vez de distribuir
        `${a}${variable} + ${a * b}${variable}`, // olvidó elevar al cuadrado
      ])
    );
    return { tipo: 'opcion_multiple', enunciado, opciones: armarOpciones(correcta, distractores), xp: 20 };
  }

  const a1 = entero(1, 9);
  const b1 = entero(-9, 9);
  const a2 = entero(1, 9);
  const b2 = entero(-9, 9);
  const termino1 = formatearBinomio(a1, b1, variable);
  const termino2 = formatearBinomio(a2, b2, variable);

  let enunciado, coefA, coefB;
  if (operacion === 'suma') {
    enunciado = `(${termino1}) + (${termino2})`;
    coefA = a1 + a2;
    coefB = b1 + b2;
  } else {
    enunciado = `(${termino1}) − (${termino2})`;
    coefA = a1 - a2;
    coefB = b1 - b2;
  }
  const correcta = formatearBinomio(coefA, coefB, variable);
  const distractores = conDistractores(correcta, () =>
    elegir([
      formatearBinomio(a1 + a2, b1 - b2, variable), // mezcló signos
      formatearBinomio(operacion === 'suma' ? a1 + a2 : a1 - a2, b1 + b2, variable), // no distribuyó el signo en la constante
      formatearBinomio(coefA, -coefB, variable), // signo invertido en la constante
      formatearBinomio(-coefA, -coefB, variable), // invirtió todo el resultado
      formatearBinomio(a1 + a2, b1 + b2, variable), // sumó en vez de restar (o viceversa)
      operacion === 'resta' ? formatearBinomio(a2 - a1, b2 - b1, variable) : formatearBinomio(coefA, 0, variable), // restó al revés / olvidó la constante
    ])
  );
  return { tipo: 'opcion_multiple', enunciado, opciones: armarOpciones(correcta, distractores), xp: 20 };
}

// --- Factorización básica (factor común) ---
function generarFactorComun() {
  const variante = elegir(['ax_ay', 'numero_variable', 'xy_y']);

  if (variante === 'ax_ay') {
    const c = entero(2, 9);
    const [vA, vB] = barajar(['x', 'y', 'a', 'b']).slice(0, 2);
    const enunciado = `Factoriza: ${c}${vA} + ${c}${vB}`;
    const correcta = `${c}(${vA} + ${vB})`;
    const distractores = conDistractores(correcta, () =>
      elegir([`${c}${vA}${vB}`, `${c}(${vA} − ${vB})`, `(${vA} + ${vB})`])
    );
    return { tipo: 'opcion_multiple', enunciado, opciones: armarOpciones(correcta, distractores), xp: 10 };
  }

  if (variante === 'numero_variable') {
    const c = elegir([2, 3, 4, 5]);
    const multiplo = entero(2, 9);
    const variable = elegir(['x', 'y']);
    const termIndep = c * multiplo;
    const enunciado = `Factoriza: ${c}${variable} + ${termIndep}`;
    const correcta = `${c}(${variable} + ${multiplo})`;
    const distractores = conDistractores(correcta, () =>
      elegir([`${c}(${variable} + ${termIndep})`, `${c}${variable}(${multiplo})`, `(${variable} + ${multiplo})`])
    );
    return { tipo: 'opcion_multiple', enunciado, opciones: armarOpciones(correcta, distractores), xp: 10 };
  }

  // xy_y: 2xy + 4y -> 2y(x + 2)
  const c = elegir([2, 3, 4]);
  const multiplo = entero(2, 9);
  const [vA, vB] = barajar(['x', 'y', 'a', 'b']).slice(0, 2);
  const enunciado = `Factoriza: ${c}${vA}${vB} + ${c * multiplo}${vB}`;
  const correcta = `${c}${vB}(${vA} + ${multiplo})`;
  const distractores = conDistractores(correcta, () =>
    elegir([`${c}${vA}(${vB} + ${multiplo})`, `${c}(${vA}${vB} + ${multiplo})`, `${c}${vB}(${vA} + ${c * multiplo})`])
  );
  return { tipo: 'opcion_multiple', enunciado, opciones: armarOpciones(correcta, distractores), xp: 10 };
}

// --- Uso de fórmulas algebraicas simples (sustitución) — numérico puro ---
function generarSustitucionFormula() {
  const formula = elegir(['suma_cuadrados', 'cuadrado_suma', 'dos_variables']);
  const a = entero(2, 9);
  const b = entero(2, 9);

  if (formula === 'suma_cuadrados') {
    const resultado = a * a + b * b;
    return {
      tipo: 'numerico',
      enunciado: `Si a = ${a} y b = ${b}, ¿cuánto vale a² + b²?`,
      parametros: { a, b, formula: 'a^2+b^2' },
      respuesta_correcta: resultado,
      unidad: null,
      xp: 20,
    };
  }

  if (formula === 'cuadrado_suma') {
    const resultado = (a + b) * (a + b);
    return {
      tipo: 'numerico',
      enunciado: `Si a = ${a} y b = ${b}, ¿cuánto vale (a + b)²?`,
      parametros: { a, b, formula: '(a+b)^2' },
      respuesta_correcta: resultado,
      unidad: null,
      xp: 20,
    };
  }

  // fórmula con 2+ variables: perímetro de rectángulo P = 2(a+b)
  const resultado = 2 * (a + b);
  return {
    tipo: 'numerico',
    enunciado: `Un rectángulo tiene lados a = ${a} y b = ${b}. ¿Cuál es su perímetro? (P = 2(a + b))`,
    parametros: { a, b, formula: '2(a+b)' },
    respuesta_correcta: resultado,
    unidad: null,
    xp: 20,
  };
}

function generarExpresionesAlgebraicas() {
  const generador = elegir([
    generarTerminosSemejantes,
    generarOperacionPolinomios,
    generarFactorComun,
    generarSustitucionFormula,
  ]);
  return generador();
}

// ============================================================================
// Álgebra / Ecuaciones lineales — ax + b = c
// La propuesta define 2 formatos para este subtema: "resolver" (numérico) y
// "resolución de ecuaciones paso a paso" (arrastrar pasos). Se elige uno al
// azar en cada generación.
// Validación de solvencia: a ≠ 0 (si a=0 no hay solución única).
// ============================================================================
function nucleoEcuacionLineal() {
  const valoresA = [-9, -8, -7, -6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  const a = elegir(valoresA); // nunca 0: garantiza solución única

  const solucionFraccionaria = Math.random() < 0.3;
  let x;
  if (solucionFraccionaria) {
    let numerador;
    do {
      numerador = entero(-19, 19);
    } while (numerador % 2 === 0);
    x = numerador / 2;
  } else {
    do {
      x = entero(-10, 10);
    } while (x === 0);
  }

  const b = entero(-10, 10);
  const c = redondear(a * x + b, 3);
  return { a, b, c, x };
}

function formatearEcuacion(a, b, c) {
  const coefTexto = a === 1 ? 'x' : a === -1 ? '-x' : `${a}x`;
  const signoB = b === 0 ? '' : b > 0 ? ` + ${b}` : ` − ${Math.abs(b)}`;
  return { coefTexto, signoB, textoCompleto: `${coefTexto}${signoB} = ${c}` };
}

function generarEcuacionLinealNumerico() {
  const { a, b, c, x } = nucleoEcuacionLineal();
  const { textoCompleto } = formatearEcuacion(a, b, c);

  return {
    tipo: 'numerico',
    enunciado: `Resuelve: ${textoCompleto}\n¿Cuánto vale x?`,
    parametros: { a, b, c },
    respuesta_correcta: redondear(x, 3),
    unidad: null,
    xp: 20, // RQNF21: numérico/variable
  };
}

// RQNF22: para ecuaciones de un término a un lado (ax+b=c), la secuencia
// correcta son 3 pasos: mover constantes, simplificar, despejar la variable.
function generarEcuacionLinealPasoAPaso() {
  const { a, b, c, x } = nucleoEcuacionLineal();
  const { coefTexto, signoB, textoCompleto } = formatearEcuacion(a, b, c);
  const cMenosB = redondear(c - b, 3);

  const pasos = [
    { numero_paso: 1, descripcion: `Mover constantes al lado derecho: ${coefTexto} = ${c} ${b >= 0 ? '−' : '+'} ${Math.abs(b)}` },
    { numero_paso: 2, descripcion: `Simplificar: ${coefTexto} = ${cMenosB}` },
    { numero_paso: 3, descripcion: `Despejar la variable: x = ${cMenosB} / ${a} = ${redondear(x, 3)}` },
  ];

  return {
    tipo: 'paso_a_paso',
    enunciado: `Ordena los pasos para resolver: ${textoCompleto}`,
    ecuacion: textoCompleto,
    pasos,
    xp: 30, // RQNF21: arrastrar elementos
  };
}

function generarEcuacionLineal() {
  return Math.random() < 0.5 ? generarEcuacionLinealNumerico() : generarEcuacionLinealPasoAPaso();
}

// ============================================================================
// Geometría / Teorema de Pitágoras — SOLO tipo numérico según Propuesta4
// (RQNF41e de Requerimientos V5 sí pide un formato de simulación para este
// subtema — se agregó abajo, aunque Propuesta4 no lo mencionaba).
// ============================================================================
const TERNAS_PITAGORICAS = [
  [3, 4, 5], [6, 8, 10], [5, 12, 13], [8, 15, 17], [7, 24, 25], [9, 12, 15], [12, 16, 20], [10, 24, 26], [20, 21, 29],
];

function generarPitagorasNumerico() {
  const calcularHipotenusa = Math.random() < 0.5;
  const exacto = Math.random() < 0.6;

  let catA, catB, hip;

  if (exacto) {
    const [t1, t2, t3] = elegir(TERNAS_PITAGORICAS);
    const escala = elegir([1, 1, 2, 2, 3]);
    catA = t1 * escala;
    catB = t2 * escala;
    hip = t3 * escala;
  } else {
    catA = entero(3, 17);
    catB = entero(3, 17);
    hip = redondear(Math.sqrt(catA * catA + catB * catB), 2);
  }

  const sufijoRedondeo = exacto ? '' : ' (redondea a 2 decimales)';

  if (calcularHipotenusa) {
    return {
      tipo: 'numerico',
      enunciado: `Catetos: ${catA} cm y ${catB} cm\n¿Cuánto mide la hipotenusa?${sufijoRedondeo}`,
      parametros: { cateto_a: catA, cateto_b: catB, tipo_incognita: 'hipotenusa' },
      respuesta_correcta: hip,
      unidad: 'cm',
      xp: 20,
    };
  }

  const catetoConocido = Math.random() < 0.5 ? catA : catB;
  const catetoBuscado = catetoConocido === catA ? catB : catA;

  return {
    tipo: 'numerico',
    enunciado: `Hipotenusa: ${hip} cm, un cateto: ${catetoConocido} cm\n¿Cuánto mide el otro cateto?${sufijoRedondeo}`,
    parametros: { hipotenusa: hip, cateto_conocido: catetoConocido, tipo_incognita: 'cateto' },
    respuesta_correcta: catetoBuscado,
    unidad: 'cm',
    xp: 20,
  };
}

// RQNF41e: simulación de Pitágoras — un cateto fijo (1-50cm), ajustar el
// segundo cateto para lograr una hipotenusa objetivo.
function generarPitagorasSimulacion() {
  const [t1, t2, t3] = elegir(TERNAS_PITAGORICAS);
  const escala = elegir([1, 1, 2, 3]);
  const catetoA = t1 * escala;
  const catetoBCorrecta = t2 * escala;
  const hipotenusaObjetivo = t3 * escala;

  return {
    tipo: 'simulacion',
    enunciado: `Ajusta el segundo cateto para lograr una hipotenusa de ${hipotenusaObjetivo} cm`,
    tipo_simulacion: 'pitagoras',
    valores_iniciales: {
      fijos: { cateto_a: catetoA },
      incognita: 'cateto_b',
      objetivo: { hipotenusa: hipotenusaObjetivo },
      rango: { min: 1, max: 50, paso: 1 },
    },
    resultado_esperado: catetoBCorrecta,
    xp: 30,
  };
}

function generarPitagoras() {
  return Math.random() < 0.75 ? generarPitagorasNumerico() : generarPitagorasSimulacion();
}

// ============================================================================
// Electricidad / "Aplicación de la ley de Ohm" — V = I × R
// La propuesta pide 3 formatos: opción múltiple, cálculo numérico, y
// simulación con arrastrar circuito. Se elige uno al azar cada vez.
// Usa valores realistas (RQNF19): baterías 1.5/3/6/12V y serie E12.
// ============================================================================
const VOLTAJES_COMUNES = [1.5, 3, 6, 12];
const RESISTENCIAS_E12 = [
  10, 12, 15, 18, 22, 27, 33, 39, 47, 56, 68, 82, 100, 120, 150, 180, 220, 270, 330, 390, 470, 560, 680, 820, 1000,
];

function nucleoOhm() {
  const incognita = elegir(['corriente', 'voltaje', 'resistencia']);
  const v = elegir(VOLTAJES_COMUNES);
  const r = elegir(RESISTENCIAS_E12);
  const i = redondear(v / r, 4);
  return { v, r, i, incognita };
}

function generarLeyOhmNumerico() {
  const { v, r, i, incognita } = nucleoOhm();

  if (incognita === 'corriente') {
    return {
      tipo: 'numerico',
      enunciado: `Voltaje: ${v} V, Resistencia: ${r} Ω\n¿Cuál es la corriente?`,
      parametros: { voltaje: v, resistencia: r, tipo_incognita: 'corriente' },
      respuesta_correcta: i, unidad: 'A', xp: 20,
    };
  }
  if (incognita === 'voltaje') {
    return {
      tipo: 'numerico',
      enunciado: `Corriente: ${i} A, Resistencia: ${r} Ω\n¿Cuál es el voltaje?`,
      parametros: { corriente: i, resistencia: r, tipo_incognita: 'voltaje' },
      respuesta_correcta: v, unidad: 'V', xp: 20,
    };
  }
  return {
    tipo: 'numerico',
    enunciado: `Voltaje: ${v} V, Corriente: ${i} A\n¿Cuál es la resistencia?`,
    parametros: { voltaje: v, corriente: i, tipo_incognita: 'resistencia' },
    respuesta_correcta: r, unidad: 'Ω', xp: 20,
  };
}

function generarLeyOhmOpcionMultiple() {
  const { v, r, i, incognita } = nucleoOhm();

  let enunciado, correcta, unidad;
  if (incognita === 'corriente') {
    enunciado = `Voltaje: ${v} V, Resistencia: ${r} Ω\n¿Cuál es la corriente?`;
    correcta = i; unidad = 'A';
  } else if (incognita === 'voltaje') {
    enunciado = `Corriente: ${i} A, Resistencia: ${r} Ω\n¿Cuál es el voltaje?`;
    correcta = v; unidad = 'V';
  } else {
    enunciado = `Voltaje: ${v} V, Corriente: ${i} A\n¿Cuál es la resistencia?`;
    correcta = r; unidad = 'Ω';
  }

  const distractores = generarDistractores(correcta, 3);
  const opciones = barajar([
    { texto: `${correcta} ${unidad}`, es_correcta: true },
    ...distractores.map((d) => ({ texto: `${d} ${unidad}`, es_correcta: false })),
  ]);

  return { tipo: 'opcion_multiple', enunciado, opciones, xp: 10 };
}

function generarLeyOhmSimulacion() {
  const v = elegir(VOLTAJES_COMUNES);
  const r = elegir(RESISTENCIAS_E12); // el valor correcto que el estudiante debe encontrar
  const iObjetivo = redondear(v / r, 3);

  return {
    tipo: 'simulacion',
    enunciado: `Ajusta la resistencia para que la corriente sea ${iObjetivo} A`,
    tipo_simulacion: 'ley_ohm',
    valores_iniciales: {
      fijos: { voltaje: v },
      incognita: 'resistencia',
      objetivo: { corriente: iObjetivo },
      opciones: RESISTENCIAS_E12,
    },
    resultado_esperado: r,
    xp: 30,
  };
}

// RQNF41f: Voltaje en serie — 1 a 4 baterías de 1.5/3/6V, ajustar la última
// para lograr un voltaje total objetivo.
const VOLTAJES_BATERIA = [1.5, 3, 6];

function generarVoltajeSerieSimulacion() {
  const numFijas = entero(1, 3);
  const bateriasFijas = [];
  for (let i = 0; i < numFijas; i++) bateriasFijas.push(elegir(VOLTAJES_BATERIA));
  const ultimaBateria = elegir(VOLTAJES_BATERIA);
  const sumaFijas = redondear(bateriasFijas.reduce((a, b) => a + b, 0), 2);
  const objetivoTotal = redondear(sumaFijas + ultimaBateria, 2);

  return {
    tipo: 'simulacion',
    enunciado: `Agrega la última batería para lograr un voltaje total de ${objetivoTotal} V`,
    tipo_simulacion: 'voltaje_serie',
    valores_iniciales: {
      fijos: { baterias: bateriasFijas },
      incognita: 'ultima_bateria',
      objetivo: { voltaje_total: objetivoTotal },
      opciones: VOLTAJES_BATERIA,
    },
    resultado_esperado: ultimaBateria,
    xp: 30,
  };
}

// RQNF41g: Resistencias en serie — 2 a 4 resistencias de la serie E12,
// ajustar la última para lograr una resistencia total objetivo.
function generarResistenciasSerieSimulacion() {
  const numFijas = entero(1, 3);
  const resistenciasFijas = [];
  for (let i = 0; i < numFijas; i++) resistenciasFijas.push(elegir(RESISTENCIAS_E12));
  const ultimaResistencia = elegir(RESISTENCIAS_E12);
  const sumaFijas = resistenciasFijas.reduce((a, b) => a + b, 0);
  const objetivoTotal = sumaFijas + ultimaResistencia;

  return {
    tipo: 'simulacion',
    enunciado: `Agrega la última resistencia para lograr una resistencia total de ${objetivoTotal} Ω`,
    tipo_simulacion: 'resistencias_serie',
    valores_iniciales: {
      fijos: { resistencias: resistenciasFijas },
      incognita: 'ultima_resistencia',
      objetivo: { resistencia_total: objetivoTotal },
      opciones: RESISTENCIAS_E12,
    },
    resultado_esperado: ultimaResistencia,
    xp: 30,
  };
}

function generarLeyDeOhm() {
  const formato = elegir(['numerico', 'opcion_multiple', 'simulacion', 'voltaje_serie', 'resistencias_serie']);
  if (formato === 'opcion_multiple') return generarLeyOhmOpcionMultiple();
  if (formato === 'simulacion') return generarLeyOhmSimulacion();
  if (formato === 'voltaje_serie') return generarVoltajeSerieSimulacion();
  if (formato === 'resistencias_serie') return generarResistenciasSerieSimulacion();
  return generarLeyOhmNumerico();
}

// ============================================================================
// Ecuaciones con paréntesis — a(x + b) = c  ó  a(x + b) + d = e
// RQNF22: las ecuaciones que requieren distribución generan 6 pasos.
// Validación: a ≠ 0 (garantizado por construcción, igual que ecuación lineal).
// ============================================================================
function nucleoEcuacionParentesis() {
  const valoresA = [-6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6];
  const a = elegir(valoresA);
  const b = entero(-9, 9);
  const conD = Math.random() < 0.5;
  let d = 0;
  if (conD) {
    do {
      d = entero(-9, 9);
    } while (d === 0);
  }

  let x;
  do {
    x = entero(-9, 9);
  } while (x === 0);

  const resultado = redondear(a * (x + b) + d, 3);
  return { a, b, d, conD, x, resultado };
}

function textoLadoIzquierdo(a, b, d, conD) {
  const dentroParentesis = `x ${signoTexto(b)}`;
  const base = `${a}(${dentroParentesis})`;
  return conD ? `${base} ${signoTexto(d)}` : base;
}

function generarEcuacionParentesisNumerico() {
  const { a, b, d, conD, x, resultado } = nucleoEcuacionParentesis();
  const ladoIzq = textoLadoIzquierdo(a, b, d, conD);

  return {
    tipo: 'numerico',
    enunciado: `Resuelve: ${ladoIzq} = ${resultado}\n¿Cuánto vale x?`,
    parametros: { a, b, d, conD },
    respuesta_correcta: redondear(x, 3),
    unidad: null,
    xp: 20,
  };
}

function generarEcuacionParentesisPasoAPaso() {
  const { a, b, d, conD, x, resultado } = nucleoEcuacionParentesis();
  const ladoIzq = textoLadoIzquierdo(a, b, d, conD);
  const ab = a * b;
  const constanteIzq = ab + d;
  const simplificado = redondear(resultado - constanteIzq, 3);

  const pasos = [
    { numero_paso: 1, descripcion: `Identificar términos: hay que distribuir ${a} en (x ${signoTexto(b)})` },
    { numero_paso: 2, descripcion: `Aplicar la distribución: ${formatearTermino(a, 'x')} ${signoTexto(ab)}${conD ? ` ${signoTexto(d)}` : ''} = ${resultado}` },
    { numero_paso: 3, descripcion: `Mover constantes al lado derecho: ${formatearTermino(a, 'x')} = ${resultado} ${signoTexto(-constanteIzq)}` },
    { numero_paso: 4, descripcion: `Simplificar: ${formatearTermino(a, 'x')} = ${simplificado}` },
    { numero_paso: 5, descripcion: `Despejar la variable: x = ${simplificado} / ${a} = ${redondear(x, 3)}` },
    { numero_paso: 6, descripcion: `Verificar sustituyendo: ${ladoIzq} = ${resultado} ✓` },
  ];

  return {
    tipo: 'paso_a_paso',
    enunciado: `Ordena los pasos para resolver: ${ladoIzq} = ${resultado}`,
    ecuacion: `${ladoIzq} = ${resultado}`,
    pasos,
    xp: 30,
  };
}

function generarEcuacionParentesis() {
  return Math.random() < 0.5 ? generarEcuacionParentesisNumerico() : generarEcuacionParentesisPasoAPaso();
}

// ============================================================================
// Sistemas de dos ecuaciones — a₁x + b₁y = c₁, a₂x + b₂y = c₂
// Validación de solvencia: determinante a₁b₂ − a₂b₁ ≠ 0 (si no, las rectas
// son paralelas o coincidentes y no hay solución única — nunca se genera).
// ============================================================================
function nucleoSistemaEcuaciones() {
  const fraccionaria = Math.random() < 0.25;
  const valorVariable = () => {
    if (fraccionaria) {
      let numerador;
      do {
        numerador = entero(-15, 15);
      } while (numerador % 2 === 0);
      return numerador / 2;
    }
    return entero(-8, 8);
  };
  const x = valorVariable();
  const y = valorVariable();

  const valoresCoef = [-5, -4, -3, -2, -1, 1, 2, 3, 4, 5];
  let a1, b1, a2, b2, determinante;
  do {
    a1 = elegir(valoresCoef);
    b1 = elegir(valoresCoef);
    a2 = elegir(valoresCoef);
    b2 = elegir(valoresCoef);
    determinante = a1 * b2 - a2 * b1;
  } while (determinante === 0); // evita sistemas sin solución única (RQNF16)

  const c1 = redondear(a1 * x + b1 * y, 3);
  const c2 = redondear(a2 * x + b2 * y, 3);

  return { a1, b1, c1, a2, b2, c2, x, y };
}

function formatearEcuacionLineal2Vars(a, b, c) {
  const parteX = formatearTermino(a, 'x');
  const parteY = b >= 0 ? `+ ${formatearTermino(b, 'y')}` : `− ${formatearTermino(Math.abs(b), 'y')}`;
  return `${parteX} ${parteY} = ${c}`;
}

function generarSistemaEcuaciones() {
  const { a1, b1, c1, a2, b2, c2, x, y } = nucleoSistemaEcuaciones();
  const metodo = elegir(['sustitución', 'igualación', 'reducción']);
  const pedirX = Math.random() < 0.5;

  const eq1 = formatearEcuacionLineal2Vars(a1, b1, c1);
  const eq2 = formatearEcuacionLineal2Vars(a2, b2, c2);

  return {
    tipo: 'numerico',
    enunciado: `Resuelve el sistema (método de ${metodo}):\n${eq1}\n${eq2}\n¿Cuánto vale ${pedirX ? 'x' : 'y'}?`,
    parametros: { a1, b1, c1, a2, b2, c2, incognita: pedirX ? 'x' : 'y' },
    respuesta_correcta: redondear(pedirX ? x : y, 3),
    unidad: null,
    xp: 20,
  };
}

// ============================================================================
// Geometría / Perímetro y área de figuras geométricas (subtemas 4 y 5)
// RQNF19-estilo: cada resultado se muestra con su unidad correspondiente
// (m², cm², km², etc.). Validación: los triángulos de perímetro deben
// cumplir la desigualdad triangular (nota explícita del documento).
// ============================================================================
const UNIDADES_LONGITUD = ['cm', 'm', 'km'];

function generarMedida(permitirDecimal) {
  if (permitirDecimal && Math.random() < 0.5) {
    return redondear(entero(20, 200) / 10, 1); // 2.0 – 20.0, en pasos de 0.1
  }
  return entero(2, 20);
}

function generarArea() {
  const figura = elegir(['cuadrado', 'rectangulo', 'triangulo']);
  const unidad = elegir(UNIDADES_LONGITUD);
  const permitirDecimal = Math.random() < 0.4;

  if (figura === 'cuadrado') {
    const lado = generarMedida(permitirDecimal);
    return {
      tipo: 'numerico',
      enunciado: `Un cuadrado tiene lado = ${lado} ${unidad}\n¿Cuál es su área?`,
      parametros: { figura, lado, unidad },
      respuesta_correcta: redondear(lado * lado, 2),
      unidad: `${unidad}²`,
      xp: 20,
    };
  }

  if (figura === 'rectangulo') {
    const base = generarMedida(permitirDecimal);
    const altura = generarMedida(permitirDecimal);
    return {
      tipo: 'numerico',
      enunciado: `Un rectángulo tiene base = ${base} ${unidad} y altura = ${altura} ${unidad}\n¿Cuál es su área?`,
      parametros: { figura, base, altura, unidad },
      respuesta_correcta: redondear(base * altura, 2),
      unidad: `${unidad}²`,
      xp: 20,
    };
  }

  // triángulo
  const base = generarMedida(permitirDecimal);
  const altura = generarMedida(permitirDecimal);
  return {
    tipo: 'numerico',
    enunciado: `Un triángulo tiene base = ${base} ${unidad} y altura = ${altura} ${unidad}\n¿Cuál es su área?`,
    parametros: { figura, base, altura, unidad },
    respuesta_correcta: redondear((base * altura) / 2, 2),
    unidad: `${unidad}²`,
    xp: 20,
  };
}

function cumpleDesigualdadTriangular(a, b, c) {
  return a + b > c && a + c > b && b + c > a;
}

function generarPerimetro() {
  const figura = elegir(['cuadrado', 'rectangulo', 'triangulo']);
  const unidad = elegir(UNIDADES_LONGITUD);
  const permitirDecimal = Math.random() < 0.4;

  if (figura === 'cuadrado') {
    const lado = generarMedida(permitirDecimal);
    return {
      tipo: 'numerico',
      enunciado: `Un cuadrado tiene lado = ${lado} ${unidad}\n¿Cuál es su perímetro?`,
      parametros: { figura, lado, unidad },
      respuesta_correcta: redondear(4 * lado, 2),
      unidad,
      xp: 20,
    };
  }

  if (figura === 'rectangulo') {
    const base = generarMedida(permitirDecimal);
    const altura = generarMedida(permitirDecimal);
    return {
      tipo: 'numerico',
      enunciado: `Un rectángulo tiene base = ${base} ${unidad} y altura = ${altura} ${unidad}\n¿Cuál es su perímetro?`,
      parametros: { figura, base, altura, unidad },
      respuesta_correcta: redondear(2 * (base + altura), 2),
      unidad,
      xp: 20,
    };
  }

  // triángulo: RQNF16 — valida la desigualdad triangular antes de generar
  let ladoA, ladoB, ladoC;
  do {
    ladoA = generarMedida(permitirDecimal);
    ladoB = generarMedida(permitirDecimal);
    ladoC = generarMedida(permitirDecimal);
  } while (!cumpleDesigualdadTriangular(ladoA, ladoB, ladoC));

  return {
    tipo: 'numerico',
    enunciado: `Un triángulo tiene lados ${ladoA} ${unidad}, ${ladoB} ${unidad} y ${ladoC} ${unidad}\n¿Cuál es su perímetro?`,
    parametros: { figura, ladoA, ladoB, ladoC, unidad },
    respuesta_correcta: redondear(ladoA + ladoB + ladoC, 2),
    unidad,
    xp: 20,
  };
}

// ============================================================================
// Trigonometría básica — seno, coseno, tangente en un triángulo rectángulo
// ============================================================================
function generarTrigonometria() {
  const funcion = elegir(['seno', 'coseno', 'tangente']);
  const exacto = Math.random() < 0.5;

  let opuesto, adyacente, hipotenusa;
  if (exacto) {
    const [t1, t2, t3] = elegir(TERNAS_PITAGORICAS);
    const escala = elegir([1, 1, 2, 3]);
    opuesto = t1 * escala;
    adyacente = t2 * escala;
    hipotenusa = t3 * escala;
  } else {
    opuesto = entero(3, 15);
    adyacente = entero(3, 15);
    hipotenusa = redondear(Math.sqrt(opuesto * opuesto + adyacente * adyacente), 2);
  }

  let respuesta;
  if (funcion === 'seno') respuesta = redondear(opuesto / hipotenusa, 4);
  else if (funcion === 'coseno') respuesta = redondear(adyacente / hipotenusa, 4);
  else respuesta = redondear(opuesto / adyacente, 4);

  return {
    tipo: 'numerico',
    enunciado: `En un triángulo rectángulo: cateto opuesto = ${opuesto}, cateto adyacente = ${adyacente}, hipotenusa = ${hipotenusa}\n¿Cuál es el ${funcion} del ángulo? (redondea a 4 decimales)`,
    parametros: { opuesto, adyacente, hipotenusa, funcion },
    respuesta_correcta: respuesta,
    unidad: null,
    xp: 20,
  };
}

// ============================================================================
// Física / Distancia y desplazamiento — d = v × t
// RQNF19: velocidad 1-100 m/s, tiempo 1-60 s (incrementos de 1).
// Variaciones: movimiento uniforme (calcular d, v o t) y con cambio de
// dirección (desplazamiento neto).
// ============================================================================
const UNIDADES_DISTANCIA = ['m', 'cm', 'km'];

function generarDistanciaDesplazamiento() {
  const unidad = elegir(UNIDADES_DISTANCIA);
  const uniforme = Math.random() < 0.6;

  if (uniforme) {
    const incognita = elegir(['distancia', 'velocidad', 'tiempo']);
    const v = entero(1, 100); // RQNF19: velocidad 1-100 m/s
    const t = entero(1, 60); // RQNF19: tiempo 1-60 s
    const d = v * t;

    if (incognita === 'distancia') {
      return {
        tipo: 'numerico',
        enunciado: `Un objeto viaja a ${v} ${unidad}/s durante ${t} s\n¿Qué distancia recorre?`,
        parametros: { v, t }, respuesta_correcta: d, unidad, xp: 20,
      };
    }
    if (incognita === 'velocidad') {
      const unidadVelocidad = elegir(['m', 'cm']); // evita "km/s" (poco realista)
      const dv = v * t;
      return {
        tipo: 'numerico',
        enunciado: `Un objeto recorre ${dv} ${unidadVelocidad} en ${t} s\n¿Cuál es su velocidad?`,
        parametros: { d: dv, t }, respuesta_correcta: v, unidad: `${unidadVelocidad}/s`, xp: 20,
      };
    }
    return {
      tipo: 'numerico',
      enunciado: `Un objeto viaja a ${v} ${unidad}/s y recorre ${d} ${unidad}\n¿Cuánto tiempo tardó?`,
      parametros: { v, d }, respuesta_correcta: t, unidad: 's', xp: 20,
    };
  }

  // con cambio de dirección: desplazamiento neto (RQNF19: distancia 1-500 m)
  const d1 = entero(10, 500);
  const d2 = entero(1, d1 - 1); // menor que d1, para desplazamiento neto positivo
  return {
    tipo: 'numerico',
    enunciado: `Un objeto se mueve ${d1} ${unidad} hacia el este y luego ${d2} ${unidad} hacia el oeste\n¿Cuál es su desplazamiento neto?`,
    parametros: { d1, d2 },
    respuesta_correcta: redondear(d1 - d2, 2),
    unidad,
    xp: 20,
  };
}

// ============================================================================
// Física / Velocidad promedio — v = d / t
// RQNF19: distancia 1-500 m, tiempo 1-60 s (incrementos de 1).
// ============================================================================
function generarVelocidad() {
  const d = entero(1, 500);
  const t = entero(1, 60);

  return {
    tipo: 'numerico',
    enunciado: `Un objeto recorre ${d} m en ${t} s\n¿Cuál es su velocidad promedio? (redondea a 2 decimales)`,
    parametros: { d, t },
    respuesta_correcta: redondear(d / t, 2),
    unidad: 'm/s',
    xp: 20,
  };
}

// ============================================================================
// Física / Aceleración — a = (vf − vi) / t
// RQNF19: aceleración 0.5-10 m/s² (incrementos de 0.5), velocidad 1-100 m/s,
// tiempo 1-60 s.
// ============================================================================
function generarAceleracion() {
  const a = redondear(entero(1, 20) * 0.5, 1); // 0.5 a 10.0, pasos de 0.5
  const t = entero(1, 20); // subconjunto de 1-60, para valores finales razonables
  const vi = entero(0, 50);
  const vf = redondear(vi + a * t, 2);

  return {
    tipo: 'numerico',
    enunciado: `Un objeto cambia su velocidad de ${vi} m/s a ${vf} m/s en ${t} s\n¿Cuál es su aceleración?`,
    parametros: { vi, vf, t },
    respuesta_correcta: a,
    unidad: 'm/s²',
    xp: 20,
  };
}

// ============================================================================
// Física / Fuerza — 2da Ley de Newton (F=ma) + 3ra Ley (acción-reacción)
// RQNF19: masa 1-100kg (incrementos de 1), aceleración 0.5-10 m/s²
// (incrementos de 0.5) — rangos exactos de la propuesta.
// ============================================================================
function generarSegundaLeyNewton() {
  const masa = entero(1, 100);
  const aceleracion = redondear(entero(1, 20) * 0.5, 1); // 0.5 a 10.0, pasos de 0.5
  const fuerza = redondear(masa * aceleracion, 2);
  const incognita = elegir(['fuerza', 'masa', 'aceleracion']);

  if (incognita === 'fuerza') {
    return {
      tipo: 'numerico',
      enunciado: `Masa = ${masa} kg, Aceleración = ${aceleracion} m/s²\n¿Cuál es la fuerza? (F = m × a)`,
      parametros: { masa, aceleracion }, respuesta_correcta: fuerza, unidad: 'N', xp: 20,
    };
  }
  if (incognita === 'masa') {
    return {
      tipo: 'numerico',
      enunciado: `Fuerza = ${fuerza} N, Aceleración = ${aceleracion} m/s²\n¿Cuál es la masa?`,
      parametros: { fuerza, aceleracion }, respuesta_correcta: masa, unidad: 'kg', xp: 20,
    };
  }
  return {
    tipo: 'numerico',
    enunciado: `Fuerza = ${fuerza} N, Masa = ${masa} kg\n¿Cuál es la aceleración?`,
    parametros: { fuerza, masa }, respuesta_correcta: aceleracion, unidad: 'm/s²', xp: 20,
  };
}

const CONTEXTOS_ACCION_REACCION = [
  'Un libro descansa sobre una mesa y ejerce sobre ella una fuerza de',
  'Un cohete expulsa gas hacia abajo con una fuerza de',
  'Una persona empuja una pared con una fuerza de',
  'Un nadador empuja el agua hacia atrás con una fuerza de',
];

function generarTerceraLeyNewton() {
  const fuerza = entero(5, 200);
  const contexto = elegir(CONTEXTOS_ACCION_REACCION);
  const enunciado = `${contexto} ${fuerza} N.\nSegún la 3ra Ley de Newton, ¿cuál es la magnitud de la fuerza de reacción?`;
  const correcta = `${fuerza} N`;

  const distractores = conDistractores(correcta, () =>
    elegir([`${fuerza * 2} N`, `${redondear(fuerza / 2, 1)} N`, `${fuerza + entero(5, 20)} N`, `0 N`])
  );

  return { tipo: 'opcion_multiple', enunciado, opciones: armarOpciones(correcta, distractores), xp: 10 };
}

// RQNF41c: simulación de Segunda Ley de Newton — masa fija, ajustar la
// fuerza para lograr una aceleración objetivo.
function generarSegundaLeyNewtonSimulacion() {
  const masa = entero(1, 100);
  const fuerza = redondear(entero(1, 2000) * 0.5, 1); // 0.5 a 1000, pasos de 0.5
  const aObjetivo = redondear(fuerza / masa, 3);

  return {
    tipo: 'simulacion',
    enunciado: `Ajusta la fuerza para lograr una aceleración de ${aObjetivo} m/s²`,
    tipo_simulacion: 'segunda_ley_newton',
    valores_iniciales: {
      fijos: { masa },
      incognita: 'fuerza',
      objetivo: { aceleracion: aObjetivo },
      rango: { min: 0.5, max: 1000, paso: 0.5 },
    },
    resultado_esperado: fuerza,
    xp: 30,
  };
}

function generarFuerza() {
  const formato = elegir(['segunda_ley', 'segunda_ley', 'tercera_ley', 'simulacion']);
  if (formato === 'tercera_ley') return generarTerceraLeyNewton();
  if (formato === 'simulacion') return generarSegundaLeyNewtonSimulacion();
  return generarSegundaLeyNewton();
}

// ============================================================================
// Física / Energía — cinética (Ec=½mv²) y potencial (Ep=mgh)
// ============================================================================
function generarEnergiaCinetica() {
  const masa = entero(1, 50);
  const velocidad = entero(1, 30);
  return {
    tipo: 'numerico',
    enunciado: `Masa = ${masa} kg, Velocidad = ${velocidad} m/s\n¿Cuál es la energía cinética? (Ec = ½mv²)`,
    parametros: { masa, velocidad },
    respuesta_correcta: redondear(0.5 * masa * velocidad * velocidad, 2),
    unidad: 'J',
    xp: 20,
  };
}

function generarEnergiaPotencial() {
  const masa = entero(1, 50);
  const altura = entero(1, 50);
  const g = 9.8;
  return {
    tipo: 'numerico',
    enunciado: `Masa = ${masa} kg, Altura = ${altura} m (g = 9.8 m/s²)\n¿Cuál es la energía potencial? (Ep = m·g·h)`,
    parametros: { masa, altura, g },
    respuesta_correcta: redondear(masa * g * altura, 2),
    unidad: 'J',
    xp: 20,
  };
}

// RQNF41d: simulación de energía potencial — masa fija (1-100kg), ajustar
// la altura (1-50m) para lograr una energía objetivo.
function generarEnergiaPotencialSimulacion() {
  const masa = entero(1, 100);
  const altura = entero(1, 50);
  const g = 9.8;
  const epObjetivo = redondear(masa * g * altura, 2);

  return {
    tipo: 'simulacion',
    enunciado: `Ajusta la altura para lograr una energía potencial de ${epObjetivo} J`,
    tipo_simulacion: 'energia_potencial',
    valores_iniciales: {
      fijos: { masa, g },
      incognita: 'altura',
      objetivo: { energia: epObjetivo },
      rango: { min: 1, max: 50, paso: 1 },
    },
    resultado_esperado: altura,
    xp: 30,
  };
}

function generarEnergia() {
  const formato = elegir(['cinetica', 'potencial', 'potencial', 'simulacion']);
  if (formato === 'cinetica') return generarEnergiaCinetica();
  if (formato === 'simulacion') return generarEnergiaPotencialSimulacion();
  return generarEnergiaPotencial();
}

// ============================================================================
// Física / Trabajo — W = F × d (RQF12, V5: explícitamente pide ejercicios
// numéricos de trabajo, aunque en Propuesta4 aparecía como conceptual).
// ============================================================================
function generarTrabajo() {
  const incognita = elegir(['trabajo', 'fuerza', 'distancia']);
  const fuerza = entero(5, 200);
  const distancia = entero(1, 50);
  const trabajo = redondear(fuerza * distancia, 2);

  if (incognita === 'trabajo') {
    return {
      tipo: 'numerico',
      enunciado: `Fuerza = ${fuerza} N, Distancia = ${distancia} m\n¿Cuál es el trabajo realizado? (W = F × d)`,
      parametros: { fuerza, distancia },
      respuesta_correcta: trabajo,
      unidad: 'J',
      xp: 20,
    };
  }
  if (incognita === 'fuerza') {
    return {
      tipo: 'numerico',
      enunciado: `Trabajo = ${trabajo} J, Distancia = ${distancia} m\n¿Cuál es la fuerza aplicada?`,
      parametros: { trabajo, distancia },
      respuesta_correcta: fuerza,
      unidad: 'N',
      xp: 20,
    };
  }
  return {
    tipo: 'numerico',
    enunciado: `Trabajo = ${trabajo} J, Fuerza = ${fuerza} N\n¿Cuál es la distancia recorrida?`,
    parametros: { trabajo, fuerza },
    respuesta_correcta: distancia,
    unidad: 'm',
    xp: 20,
  };
}

// ============================================================================
// Álgebra / Ecuaciones cuadráticas — ax² + bx + c = 0
// Se construye desde las raíces hacia atrás (a(x-r1)(x-r2)) — garantiza
// soluciones reales y limpias, nunca un discriminante negativo o irracional.
// Como tiene 2 raíces, no cabe en una sola respuesta numérica sin
// ambigüedad: el formato numérico pide una raíz específica (mayor o menor,
// bien definida); el de opción múltiple muestra el par completo.
// ============================================================================
function nucleoEcuacionCuadratica() {
  const a = elegir([1, 1, 1, 2, 2, 3]); // sesgado hacia a=1, el caso más simple
  let r1, r2;
  do {
    r1 = entero(-10, 10);
    r2 = entero(-10, 10);
  } while (r1 === 0 && r2 === 0); // evita el caso trivial (ambas raíces 0)

  const b = -a * (r1 + r2);
  const c = a * r1 * r2;

  return { a, b, c, mayor: Math.max(r1, r2), menor: Math.min(r1, r2) };
}

function formatearCuadratica(a, b, c) {
  const parteA = a === 1 ? 'x²' : `${a}x²`;
  const parteB = b === 0 ? '' : ` ${b > 0 ? '+' : '−'} ${formatearTermino(Math.abs(b), 'x')}`;
  const parteC = c === 0 ? '' : ` ${c > 0 ? '+' : '−'} ${Math.abs(c)}`;
  return `${parteA}${parteB}${parteC} = 0`;
}

function generarEcuacionCuadraticaNumerico() {
  const { a, b, c, mayor, menor } = nucleoEcuacionCuadratica();
  const ecuacion = formatearCuadratica(a, b, c);
  const pedirMayor = Math.random() < 0.5;

  return {
    tipo: 'numerico',
    enunciado: `Resuelve: ${ecuacion}\n¿Cuál es la raíz ${pedirMayor ? 'mayor' : 'menor'}?`,
    parametros: { a, b, c, cual: pedirMayor ? 'mayor' : 'menor' },
    respuesta_correcta: pedirMayor ? mayor : menor,
    unidad: null,
    xp: 20,
  };
}

function generarEcuacionCuadraticaOpcionMultiple() {
  const { a, b, c, mayor, menor } = nucleoEcuacionCuadratica();
  const ecuacion = formatearCuadratica(a, b, c);
  const correcta = `x = ${menor}, x = ${mayor}`;

  const distractores = conDistractores(correcta, () =>
    elegir([
      `x = ${-menor}, x = ${-mayor}`, // signo invertido
      `x = ${menor}, x = ${menor}`, // raíz doble incorrecta
      `x = ${mayor}, x = ${mayor}`,
      `x = ${menor - 1}, x = ${mayor + 1}`, // desplazadas
    ])
  );

  return { tipo: 'opcion_multiple', enunciado: `Resuelve: ${ecuacion}`, opciones: armarOpciones(correcta, distractores), xp: 10 };
}

function generarEcuacionCuadratica() {
  return Math.random() < 0.5 ? generarEcuacionCuadraticaNumerico() : generarEcuacionCuadraticaOpcionMultiple();
}

// subtema_id -> función generadora (cada una decide su propio formato/tipo).
const REGISTRO_GENERADORES = {
  1: generarExpresionesAlgebraicas,
  2: generarEcuacionLineal,
  3: generarEcuacionCuadratica,
  4: generarArea,
  5: generarPerimetro,
  6: generarPitagoras,
  7: generarVelocidad,
  8: generarAceleracion,
  9: generarFuerza,
  10: generarTrabajo,
  11: generarEnergia,
  12: generarLeyDeOhm,
  13: generarEcuacionParentesis,
  14: generarSistemaEcuaciones,
  15: generarTrigonometria,
  16: generarDistanciaDesplazamiento,
};

module.exports = {
  generarExpresionesAlgebraicas,
  generarEcuacionLineal,
  generarEcuacionCuadratica,
  generarPitagoras,
  generarLeyDeOhm,
  generarEcuacionParentesis,
  generarSistemaEcuaciones,
  generarArea,
  generarPerimetro,
  generarTrigonometria,
  generarDistanciaDesplazamiento,
  generarVelocidad,
  generarAceleracion,
  generarFuerza,
  generarTrabajo,
  generarEnergia,
  REGISTRO_GENERADORES,
};
