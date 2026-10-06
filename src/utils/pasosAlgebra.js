// RQF30 / RQF31 / RQNF22 / RQNF42: genera los pasos de resolución de una
// ecuación lineal de una variable a partir de lo que escribe el administrador.
//
// Reglas de cantidad de pasos (RQNF22):
//   3 pasos   un solo término de variable, en un solo lado (ax + b = c)
//   4-5 pasos variable en ambos lados (4; 5 si además hay constantes en ambos)
//   6 pasos   ecuaciones con paréntesis (distribución / factorización)
//   >6        se rechaza con el mensaje de RQF31 (p. ej. paréntesis anidados
//             o demasiados grupos / términos)

const MENSAJE_LIMITE =
  'La ecuación ingresada supera el límite de 6 pasos permitidos. Por favor ingresa una ecuación de menor complejidad.';

class ErrorEcuacion extends Error {
  constructor(mensaje, { excedeLimite = false } = {}) {
    super(mensaje);
    this.excedeLimite = excedeLimite;
  }
}

const MAX_TERMINOS = 8;
const MAX_GRUPOS_PARENTESIS = 2;

function redondear(n, d = 3) {
  const f = 10 ** d;
  const r = Math.round((n + Number.EPSILON) * f) / f;
  return Object.is(r, -0) ? 0 : r;
}
const num = (n) => String(redondear(n)).replace('-', '−');
const signo = (n) => (n >= 0 ? `+ ${num(n)}` : `− ${num(Math.abs(n))}`);

function termino(coef, v) {
  if (coef === 1) return v;
  if (coef === -1) return `−${v}`;
  return `${num(coef)}${v}`;
}
// "ax + b" con sus signos, omitiendo partes en cero.
function polinomio(a, b, v) {
  if (a === 0) return num(b);
  const t = termino(a, v);
  if (b === 0) return t;
  return `${t} ${signo(b)}`;
}

// ---------- parser ----------
function tokenizar(texto) {
  const tokens = [];
  const s = texto.replace(/\s+/g, '').replace(/−/g, '-').replace(/,/g, '.');
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/[0-9.]/.test(c)) {
      let j = i;
      while (j < s.length && /[0-9.]/.test(s[j])) j++;
      const valor = Number(s.slice(i, j));
      if (Number.isNaN(valor)) throw new ErrorEcuacion('Número inválido en la ecuación');
      tokens.push({ t: 'n', v: valor });
      i = j;
    } else if (/[a-zA-Z]/.test(c)) {
      tokens.push({ t: 'v', v: c.toLowerCase() });
      i++;
    } else if ('+-*/()='.includes(c)) {
      tokens.push({ t: c });
      i++;
    } else {
      throw new ErrorEcuacion(`Carácter no permitido en la ecuación: "${c}"`);
    }
  }
  return tokens;
}

function parsear(texto) {
  const tokens = tokenizar(texto);
  let pos = 0;
  let variable = null;
  let grupos = 0;
  let profundidad = 0;
  let maxProfundidad = 0;
  let terminos = 0;
  const peek = () => tokens[pos];
  const take = () => tokens[pos++];

  const mul = (p, q) => {
    if (p.a !== 0 && q.a !== 0) throw new ErrorEcuacion('Solo se admiten ecuaciones lineales (sin x·x)');
    return { a: p.a * q.b + q.a * p.b, b: p.b * q.b };
  };

  function expr() {
    let r = termProd();
    while (peek() && (peek().t === '+' || peek().t === '-')) {
      const op = take().t;
      const q = termProd();
      r = op === '+' ? { a: r.a + q.a, b: r.b + q.b } : { a: r.a - q.a, b: r.b - q.b };
    }
    return r;
  }
  function termProd() {
    terminos++;
    let r = unario();
    while (peek() && (peek().t === '*' || peek().t === '/' || peek().t === 'n' || peek().t === 'v' || peek().t === '(')) {
      if (peek().t === '/') {
        take();
        const d = unario();
        if (d.a !== 0) throw new ErrorEcuacion('No se admite dividir entre la variable');
        if (d.b === 0) throw new ErrorEcuacion('División entre cero');
        r = { a: r.a / d.b, b: r.b / d.b };
      } else {
        if (peek().t === '*') take();
        r = mul(r, unario());
      }
    }
    return r;
  }
  function unario() {
    if (peek() && peek().t === '-') { take(); const r = unario(); return { a: -r.a, b: -r.b }; }
    if (peek() && peek().t === '+') { take(); return unario(); }
    return primario();
  }
  function primario() {
    const tk = take();
    if (!tk) throw new ErrorEcuacion('La ecuación está incompleta');
    if (tk.t === 'n') return { a: 0, b: tk.v };
    if (tk.t === 'v') {
      if (variable && variable !== tk.v) throw new ErrorEcuacion('Solo se admite una variable por ecuación');
      variable = tk.v;
      return { a: 1, b: 0 };
    }
    if (tk.t === '(') {
      grupos++;
      profundidad++;
      maxProfundidad = Math.max(maxProfundidad, profundidad);
      const r = expr();
      if (!peek() || take().t !== ')') throw new ErrorEcuacion('Paréntesis sin cerrar');
      profundidad--;
      return r;
    }
    throw new ErrorEcuacion('La ecuación no tiene un formato válido');
  }

  // Partimos por el '=' a nivel de tokens
  const idx = tokens.findIndex((tk) => tk.t === '=');
  if (idx < 0 || tokens.filter((tk) => tk.t === '=').length !== 1) {
    throw new ErrorEcuacion('La ecuación debe contener exactamente un signo "="');
  }
  const izq = tokens.slice(0, idx);
  const der = tokens.slice(idx + 1);
  if (izq.length === 0 || der.length === 0) throw new ErrorEcuacion('Ambos lados de la ecuación deben tener contenido');

  function evaluarLado(toks) {
    tokens.splice(0, tokens.length);
    tokens.push(...toks);
    pos = 0;
    const r = expr();
    if (pos < tokens.length) throw new ErrorEcuacion('La ecuación no tiene un formato válido');
    return r;
  }
  const L = evaluarLado(izq);
  const R = evaluarLado(der);
  if (!variable) throw new ErrorEcuacion('La ecuación debe contener una variable');

  return { L, R, variable, grupos, maxProfundidad, terminos, tieneParentesis: grupos > 0 };
}

// ---------- generador de pasos ----------
/**
 * Devuelve { ecuacion, variable, solucion, pasos:[{numero_paso,descripcion}] }
 * o lanza ErrorEcuacion (con excedeLimite=true si rebasa los 6 pasos).
 */
function generarPasos(textoEcuacion) {
  if (typeof textoEcuacion !== 'string' || textoEcuacion.trim() === '') {
    throw new ErrorEcuacion('La ecuación es obligatoria');
  }
  if (textoEcuacion.length > 100) throw new ErrorEcuacion('La ecuación es demasiado larga (máximo 100 caracteres)');

  const p = parsear(textoEcuacion);
  const v = p.variable;

  if (p.maxProfundidad > 1 || p.grupos > MAX_GRUPOS_PARENTESIS || p.terminos > MAX_TERMINOS) {
    throw new ErrorEcuacion(MENSAJE_LIMITE, { excedeLimite: true });
  }

  const { L, R } = p;
  const coefNeto = L.a - R.a;
  if (coefNeto === 0) {
    throw new ErrorEcuacion('La ecuación no tiene una solución única (la variable se cancela)');
  }
  const solucion = (R.b - L.b) / coefNeto;
  const ecuacionTxt = `${polinomio(L.a, L.b, v)} = ${polinomio(R.a, R.b, v)}`;

  const pasos = [];
  const add = (d) => pasos.push({ numero_paso: pasos.length + 1, descripcion: d });

  const ambosLadosVar = L.a !== 0 && R.a !== 0;
  const ambosLadosConst = L.b !== 0 && R.b !== 0;
  let a = L.a;
  let bIzq = L.b;
  let cDer = R.b;

  if (p.tieneParentesis) {
    add(`Identificar términos: hay que distribuir los paréntesis en ${textoEcuacion.trim().replace(/-/g, '−')}`);
    add(`Aplicar la distribución: ${ecuacionTxt}`);
    if (ambosLadosVar) {
      a = coefNeto;
      add(`Mover variables al lado izquierdo: ${polinomio(a, L.b, v)} = ${num(R.b)}`);
    }
    add(`Mover constantes al lado derecho: ${termino(a, v)} = ${num(cDer)} ${signo(-bIzq)}`);
    const rhs = cDer - bIzq;
    add(`Simplificar: ${termino(a, v)} = ${num(rhs)}`);
    add(`Despejar la variable: ${v} = ${num(rhs)} / ${num(a)} = ${num(solucion)}`);
    if (!ambosLadosVar) add(`Verificar sustituyendo: ${polinomio(L.a, L.b, v).replace(v, `(${num(solucion)})`)} = ${num(R.b)} ✓`);
  } else if (ambosLadosVar) {
    if (ambosLadosConst) add(`Identificar términos: ${ecuacionTxt}`);
    a = coefNeto;
    add(`Mover variables al lado izquierdo: ${polinomio(a, L.b, v)} = ${num(R.b)}`);
    add(`Mover constantes al lado derecho: ${termino(a, v)} = ${num(cDer)} ${signo(-bIzq)}`);
    const rhs = cDer - bIzq;
    add(`Simplificar: ${termino(a, v)} = ${num(rhs)}`);
    add(`Despejar la variable: ${v} = ${num(rhs)} / ${num(a)} = ${num(solucion)}`);
  } else {
    // Variable en un solo lado: normalizamos para que quede a la izquierda.
    let izqA = L.a, izqB = L.b, derB = R.b;
    if (L.a === 0) { izqA = R.a; izqB = R.b; derB = L.b; }
    a = izqA;
    const rhs = derB - izqB;
    if (izqB !== 0) {
      add(`Mover constantes al lado derecho: ${termino(a, v)} = ${num(derB)} ${signo(-izqB)}`);
    } else {
      add(`Identificar términos: ${termino(a, v)} = ${num(derB)}`);
    }
    add(`Simplificar: ${termino(a, v)} = ${num(rhs)}`);
    add(`Despejar la variable: ${v} = ${num(rhs)} / ${num(a)} = ${num(solucion)}`);
  }

  if (pasos.length > 6) throw new ErrorEcuacion(MENSAJE_LIMITE, { excedeLimite: true });
  if (pasos.length < 3) throw new ErrorEcuacion('La ecuación es demasiado simple para generar 3 pasos');

  return { ecuacion: ecuacionTxt, variable: v, solucion: redondear(solucion), pasos };
}

module.exports = { generarPasos, ErrorEcuacion, MENSAJE_LIMITE };
