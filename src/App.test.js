import { describe, it, expect } from "vitest";
import { num, fmt, fmtDosis, sumar, calcularPaFi, calcularPPC } from "./App.jsx";

// Estos tests documentan el comportamiento ACTUAL de num/fmt/fmtDosis/sumar
// tal cual está implementado en App.jsx, incluyendo casos que puedan parecer
// poco intuitivos. No son una especificación de cómo "deberían" comportarse:
// son una red de seguridad contra cambios accidentales futuros.

describe("num", () => {
  it("entero como string", () => {
    expect(num("5")).toBe(5);
  });

  it("decimal con punto", () => {
    expect(num("5.5")).toBe(5.5);
  });

  it("decimal con coma (se convierte a punto)", () => {
    expect(num("5,5")).toBe(5.5);
  });

  it("cero", () => {
    expect(num("0")).toBe(0);
  });

  it("cero con signo negativo", () => {
    expect(num("-0")).toBe(-0);
  });

  it("negativo", () => {
    expect(num("-12,5")).toBe(-12.5);
  });

  it("string vacío -> null", () => {
    expect(num("")).toBeNull();
  });

  it("solo espacios -> null", () => {
    expect(num("   ")).toBeNull();
  });

  it("string no numérico -> null", () => {
    expect(num("abc")).toBeNull();
  });

  it("null -> null", () => {
    expect(num(null)).toBeNull();
  });

  it("undefined -> null", () => {
    expect(num(undefined)).toBeNull();
  });

  it("número ya numérico (no string) se acepta igual", () => {
    expect(num(42)).toBe(42);
  });

  it("número con coma y decimales largos", () => {
    expect(num("123,456")).toBe(123.456);
  });

  it('comportamiento actual: parseFloat es tolerante con texto final ("12abc" -> 12)', () => {
    // parseFloat corta en el primer carácter no numérico en vez de fallar
    // del todo. Se documenta tal cual está hoy, sin "corregirlo".
    expect(num("12abc")).toBe(12);
  });

  it("Infinity no es finito -> null", () => {
    expect(num("Infinity")).toBeNull();
  });
});

describe("fmt", () => {
  it("entero se muestra sin decimales", () => {
    expect(fmt(5)).toBe("5");
  });

  it("cero entero", () => {
    expect(fmt(0)).toBe("0");
  });

  it("negativo entero", () => {
    expect(fmt(-5)).toBe("-5");
  });

  it("decimal se redondea a 1 decimal (toFixed(1)) — comportamiento real de punto flotante", () => {
    // 5.55 no es representable exacto en IEEE754: el valor real almacenado
    // es 5.549999999999999822..., así que toFixed(1) da "5.5", no "5.6"
    // como sugeriría un redondeo decimal ingenuo. Se documenta tal cual.
    expect(fmt(5.55)).toBe("5.5");
  });

  it("decimal negativo a 1 decimal — mismo comportamiento de punto flotante", () => {
    expect(fmt(-5.55)).toBe("-5.5");
  });

  it("decimal con un solo decimal ya exacto", () => {
    expect(fmt(2.3)).toBe("2.3");
  });

  it("usa punto decimal, no coma (a diferencia de fmtDosis)", () => {
    expect(fmt(3.14159)).toBe("3.1");
  });
});

describe("fmtDosis", () => {
  it("entero se muestra sin decimales", () => {
    expect(fmtDosis(5)).toBe("5");
  });

  it("cero entero", () => {
    expect(fmtDosis(0)).toBe("0");
  });

  it("negativo entero", () => {
    expect(fmtDosis(-5)).toBe("-5");
  });

  it("decimal con coma (convención Argentina), sin ceros de más", () => {
    expect(fmtDosis(5.5)).toBe("5,5");
  });

  it("recorta ceros finales innecesarios", () => {
    // 5 decimales por defecto (maxDecimales=3), pero 5.10 -> "5,1", no "5,100"
    expect(fmtDosis(5.1)).toBe("5,1");
  });

  it("maxDecimales por defecto es 3", () => {
    expect(fmtDosis(1.23456)).toBe("1,235"); // toFixed(3) redondea a 1.235
  });

  it("respeta un maxDecimales distinto (2, como en Balance)", () => {
    expect(fmtDosis(1.23456, 2)).toBe("1,23");
  });

  it("respeta un maxDecimales de 0", () => {
    expect(fmtDosis(200.6, 0)).toBe("201");
  });

  it("un entero exacto en decimal (5.000) no muestra coma ni ceros", () => {
    expect(fmtDosis(5.0, 3)).toBe("5");
  });

  it("decimal negativo con coma", () => {
    expect(fmtDosis(-1.5)).toBe("-1,5");
  });

  it("número muy chico distinto de cero conserva sus decimales", () => {
    expect(fmtDosis(0.001, 3)).toBe("0,001");
  });
});

// BUG DOCUMENTADO, TODAVÍA NO CORREGIDO — estos tests están en rojo a
// propósito. Describen el comportamiento CORRECTO que fmtDosis debería
// tener con maxDecimales=0, para poder confirmar después que un fix lo
// arregla sin tocar ningún otro camino (maxDecimales >= 1 sigue con sus
// propios tests arriba, que siguen en verde).
//
// Causa raíz: con maxDecimales=0, toFixed(0) nunca produce un punto
// decimal (ej. 70 -> "70", no "70."). El .replace(/0+$/, "") que existe
// para sacar CEROS DECIMALES sobrantes (ej. "5.10" -> "5.1") no tiene
// ningún punto que lo detenga en ese caso, así que también se come los
// ceros que son parte del número ENTERO: "70" -> "7", "300" -> "3",
// "1000" -> "1". Con maxDecimales >= 1 esto nunca pasa porque toFixed(N)
// para N>=1 siempre deja un "." en el string, que el regex respeta (no
// matchea el punto), así que la parte entera queda siempre a salvo.
describe("fmtDosis — bug de maxDecimales=0 (tests en rojo hasta el fix)", () => {
  it("70,01 con 0 decimales debería mostrar 70, no 7", () => {
    expect(fmtDosis(70.01, 0)).toBe("70");
  });

  it("199,6 con 0 decimales debería mostrar 200, no 2 (justo el corte SDRA moderado/leve de PaFi)", () => {
    expect(fmtDosis(199.6, 0)).toBe("200");
  });

  it("240,3 con 0 decimales debería mostrar 240, no 24", () => {
    expect(fmtDosis(240.3, 0)).toBe("240");
  });

  it("100,2 con 0 decimales debería mostrar 100, no 1", () => {
    expect(fmtDosis(100.2, 0)).toBe("100");
  });

  it("299,6 con 0 decimales debería mostrar 300, no 3 (mismo problema en un límite real de PaFi)", () => {
    expect(fmtDosis(299.6, 0)).toBe("300");
  });

  it("1000,4 con 0 decimales debería mostrar 1000, no 1 (varios ceros seguidos, se pierden todos)", () => {
    expect(fmtDosis(1000.4, 0)).toBe("1000");
  });

  it("0,001 con 0 decimales debería mostrar 0, no un string vacío", () => {
    expect(fmtDosis(0.001, 0)).toBe("0");
  });

  it("-70,4 con 0 decimales debería mostrar -70, no -7 (negativos con el mismo problema)", () => {
    expect(fmtDosis(-70.4, 0)).toBe("-70");
  });

  // --- Casos de control: deben seguir en verde antes Y después del fix ---
  it("[control] entero exacto con 0 decimales no pasa por el camino con bug", () => {
    expect(fmtDosis(70, 0)).toBe("70");
  });

  it("[control] 10,5 con 0 decimales ya funcionaba bien (no termina en 0)", () => {
    expect(fmtDosis(10.5, 0)).toBe("11");
  });

  it("[control] maxDecimales=2 con un valor que redondea a un entero terminado en 0 sigue funcionando", () => {
    // Mismo tipo de valor que rompe con maxDecimales=0, pero acá el punto
    // decimal de toFixed(2) protege la parte entera.
    expect(fmtDosis(100.001, 2)).toBe("100");
  });

  it("[control] maxDecimales=1 con un valor que redondea a un entero terminado en 0 sigue funcionando", () => {
    expect(fmtDosis(240.001, 1)).toBe("240");
  });
});

// PASO A — reproducción del bug con entradas 100% enteras y realistas de
// PaFi (no hace falta que el usuario tipee ningún decimal: PaO2/FiO2 son
// enteros, pero PaO2/(FiO2/100) casi nunca da un entero exacto). Esto
// representa exactamente lo que la pantalla mostraría hoy — combina
// calcularPaFi (ya correcta, sin bug) con fmtDosis (con el bug) para
// probar el pipeline completo de display, no solo fmtDosis aislada.
// Todos estos tests están en rojo a propósito contra el código actual.
describe("PaFi — display end-to-end (bug alcanzable con entradas enteras reales)", () => {
  it("PaO2=84, FiO2=28% (Venturi estándar) -> PaFi=300 -> debería mostrar '300'", () => {
    const resultado = calcularPaFi("84", "28");
    expect(fmtDosis(resultado.valor, 0)).toBe("300");
  });

  it("PaO2=70, FiO2=28% -> PaFi=250 -> debería mostrar '250'", () => {
    const resultado = calcularPaFi("70", "28");
    expect(fmtDosis(resultado.valor, 0)).toBe("250");
  });

  it("PaO2=98, FiO2=28% -> PaFi=350 -> debería mostrar '350'", () => {
    const resultado = calcularPaFi("98", "28");
    expect(fmtDosis(resultado.valor, 0)).toBe("350");
  });

  it("PaO2=84, FiO2=35% -> PaFi=240 -> debería mostrar '240'", () => {
    const resultado = calcularPaFi("84", "35");
    expect(fmtDosis(resultado.valor, 0)).toBe("240");
  });

  it("PaO2=65, FiO2=21% (aire ambiente) -> PaFi≈309,52 -> debería mostrar '310'", () => {
    const resultado = calcularPaFi("65", "21");
    expect(fmtDosis(resultado.valor, 0)).toBe("310");
  });
});

describe("sumar", () => {
  it("lista vacía -> 0", () => {
    expect(sumar([], "valor")).toBe(0);
  });

  it("un solo elemento", () => {
    expect(sumar([{ valor: 10 }], "valor")).toBe(10);
  });

  it("múltiples elementos", () => {
    expect(sumar([{ valor: 10 }, { valor: 20 }, { valor: 5.5 }], "valor")).toBe(35.5);
  });

  it("campo inexistente en algunos items se trata como 0 (comportamiento actual con ?? 0)", () => {
    expect(sumar([{ valor: 10 }, {}, { valor: 5 }], "valor")).toBe(15);
  });

  it("redondea a 2 decimales en cada paso (0.1 + 0.2 da exactamente 0.3, no 0.30000000000000004)", () => {
    expect(sumar([{ valor: 0.1 }, { valor: 0.2 }], "valor")).toBe(0.3);
  });

  it("acumula redondeando en cada paso, no solo al final (con su propia imprecisión de punto flotante)", () => {
    // Traza real: paso 1: 0+1.005=1.005 -> Math.round(100.499999...)/100 = 1
    // (1.005 tampoco es exacto en IEEE754, así que redondea PARA ABAJO).
    // paso 2: 1+1.005=2.005 -> redondea a 2.01. paso 3: 2.01+1.005=3.015
    // (con su propio arrastre de imprecisión) -> redondea a 3.01. El
    // resultado final NO es 3 ni 3.015: es 3.01, por cómo se acumula el
    // redondeo paso a paso. Se documenta el comportamiento real, no el
    // matemáticamente "esperable".
    expect(sumar([{ valor: 1.005 }, { valor: 1.005 }, { valor: 1.005 }], "valor")).toBe(3.01);
  });

  it("usa el campo indicado, no siempre 'valor' (ej. 'paso' en Balance Parcial)", () => {
    expect(sumar([{ paso: 100 }, { paso: 50 }], "paso")).toBe(150);
  });

  it("valores negativos se restan correctamente", () => {
    expect(sumar([{ valor: 10 }, { valor: -3 }], "valor")).toBe(7);
  });
});

describe("calcularPaFi", () => {
  // --- Casos normales ---
  it("caso normal: PaO2=80, FiO2=40 -> PaFi=200, moderado", () => {
    expect(calcularPaFi("80", "40")).toEqual({
      valor: 200,
      categoria: "SDRA moderado",
      colorClass: "pafi-moderado",
    });
  });

  it("caso normal: PaO2=95, FiO2=21 -> sin criterio de SDRA", () => {
    expect(calcularPaFi("95", "21")).toEqual({
      valor: 95 / 0.21,
      categoria: "Sin criterio de SDRA (oxigenación normal o casi normal)",
      colorClass: "pafi-normal",
    });
  });

  it("caso normal: PaO2=60, FiO2=60 -> PaFi=100, severo", () => {
    expect(calcularPaFi("60", "60")).toEqual({
      valor: 100,
      categoria: "SDRA severo",
      colorClass: "pafi-severo",
    });
  });

  // --- Bordes de categoría: 300, 200, 100 ---
  it("borde: PaFi=300 exacto -> leve (no 'normal', el corte es estricto por >)", () => {
    expect(calcularPaFi("300", "100")).toEqual({
      valor: 300,
      categoria: "SDRA leve",
      colorClass: "pafi-leve",
    });
  });

  it("borde: PaFi=200 exacto -> moderado", () => {
    expect(calcularPaFi("200", "100")).toEqual({
      valor: 200,
      categoria: "SDRA moderado",
      colorClass: "pafi-moderado",
    });
  });

  it("borde: PaFi=100 exacto -> severo", () => {
    expect(calcularPaFi("100", "100")).toEqual({
      valor: 100,
      categoria: "SDRA severo",
      colorClass: "pafi-severo",
    });
  });

  it("borde: PaFi=301 (justo por encima de 300) -> sin criterio de SDRA", () => {
    expect(calcularPaFi("301", "100")).toEqual({
      valor: 301,
      categoria: "Sin criterio de SDRA (oxigenación normal o casi normal)",
      colorClass: "pafi-normal",
    });
  });

  // --- Bordes de FiO2: 21, 100, 20.99, 100.01 ---
  it("borde: FiO2=21 exacto -> sin error, calcula normalmente", () => {
    expect(calcularPaFi("50", "21")).toEqual({
      valor: 50 / 0.21,
      categoria: "SDRA leve",
      colorClass: "pafi-leve",
    });
  });

  it("borde: FiO2=20,99 (justo debajo de 21) -> error de FiO2 mínima", () => {
    expect(calcularPaFi("50", "20.99")).toEqual({
      error: "La FiO₂ mínima es 21% (aire ambiente). Si tu valor es decimal (ej. 0,4), ingresalo como porcentaje (40).",
    });
  });

  it("borde: FiO2=100 exacto -> sin error, calcula normalmente", () => {
    expect(calcularPaFi("50", "100")).toEqual({
      valor: 50,
      categoria: "SDRA severo",
      colorClass: "pafi-severo",
    });
  });

  it("borde: FiO2=100,01 (justo encima de 100) -> error de FiO2 máxima", () => {
    expect(calcularPaFi("50", "100.01")).toEqual({
      error: "La FiO₂ máxima es 100% (oxígeno puro). Verificá el valor ingresado.",
    });
  });

  // --- Inválidos / vacíos ---
  it("PaO2 vacío -> null", () => {
    expect(calcularPaFi("", "40")).toBeNull();
  });

  it("FiO2 vacío -> null", () => {
    expect(calcularPaFi("80", "")).toBeNull();
  });

  it("ambos vacíos -> null", () => {
    expect(calcularPaFi("", "")).toBeNull();
  });

  it('PaO2 no numérico ("abc") -> null', () => {
    expect(calcularPaFi("abc", "40")).toBeNull();
  });

  it('PaO2="0" -> null', () => {
    expect(calcularPaFi("0", "40")).toBeNull();
  });

  it('FiO2="0" -> null', () => {
    expect(calcularPaFi("80", "0")).toBeNull();
  });

  it("PaO2 negativo -> null, sin ningún mensaje de error", () => {
    expect(calcularPaFi("-10", "40")).toBeNull();
  });

  it("FiO2 negativo -> null, NO dispara el error de 'FiO2 mínima 21%' (se corta antes)", () => {
    expect(calcularPaFi("80", "-5")).toBeNull();
  });
});

describe("calcularPPC", () => {
  // --- Casos normales ---
  it("caso normal: TAM=90, PIC=25 -> PPC=65, dentro del objetivo", () => {
    expect(calcularPPC("90", "25")).toEqual({
      valor: 65,
      categoria: "Dentro del objetivo (Brain Trauma Foundation)",
      colorClass: "pafi-normal",
    });
  });

  it("caso normal: TAM=100, PIC=10 -> PPC=90, por encima del objetivo", () => {
    expect(calcularPPC("100", "10")).toEqual({
      valor: 90,
      categoria: "Por encima del objetivo: riesgo de SDRA por uso de vasopresores",
      colorClass: "pafi-leve",
    });
  });

  it("caso normal: TAM=70, PIC=30 -> PPC=40, crítico", () => {
    expect(calcularPPC("70", "30")).toEqual({
      valor: 40,
      categoria: "Crítico: riesgo de isquemia cerebral",
      colorClass: "pafi-severo",
    });
  });

  // --- Bordes exactos: 49,99 / 50 / 59,99 / 60 / 70 / 70,01 ---
  it("borde: PPC=49,99 -> crítico", () => {
    expect(calcularPPC("99.99", "50")).toEqual({
      valor: 99.99 - 50,
      categoria: "Crítico: riesgo de isquemia cerebral",
      colorClass: "pafi-severo",
    });
  });

  it("borde: PPC=50 exacto -> por debajo del objetivo (no crítico)", () => {
    expect(calcularPPC("65", "15")).toEqual({
      valor: 50,
      categoria: "Por debajo del objetivo: vigilar estrechamente",
      colorClass: "pafi-moderado",
    });
  });

  it("borde: PPC=59,99 -> por debajo del objetivo", () => {
    expect(calcularPPC("74.99", "15")).toEqual({
      valor: 74.99 - 15,
      categoria: "Por debajo del objetivo: vigilar estrechamente",
      colorClass: "pafi-moderado",
    });
  });

  it("borde: PPC=60 exacto -> dentro del objetivo (no 'por debajo')", () => {
    expect(calcularPPC("75", "15")).toEqual({
      valor: 60,
      categoria: "Dentro del objetivo (Brain Trauma Foundation)",
      colorClass: "pafi-normal",
    });
  });

  it("borde: PPC=70 exacto -> dentro del objetivo (el corte <=70 es inclusive)", () => {
    expect(calcularPPC("85", "15")).toEqual({
      valor: 70,
      categoria: "Dentro del objetivo (Brain Trauma Foundation)",
      colorClass: "pafi-normal",
    });
  });

  it("borde: PPC=70,01 -> por encima del objetivo", () => {
    expect(calcularPPC("85.01", "15")).toEqual({
      valor: 85.01 - 15,
      categoria: "Por encima del objetivo: riesgo de SDRA por uso de vasopresores",
      colorClass: "pafi-leve",
    });
  });

  // --- PPC negativo (error) ---
  it("PPC negativo franco: TAM=15, PIC=85 -> error, incluye 'valor' negativo", () => {
    expect(calcularPPC("15", "85")).toEqual({
      valor: -70,
      error: "El resultado es negativo: verificá que no hayas invertido TAM y PIC. La TAM siempre debe ser mayor que la PIC.",
    });
  });

  it("PPC negativo chico: TAM=49, PIC=50 -> error", () => {
    expect(calcularPPC("49", "50")).toEqual({
      valor: -1,
      error: "El resultado es negativo: verificá que no hayas invertido TAM y PIC. La TAM siempre debe ser mayor que la PIC.",
    });
  });

  it("TAM directamente negativo (-10) con PIC positiva -> mismo mensaje de 'invertiste', aunque no sea una inversión real", () => {
    expect(calcularPPC("-10", "5")).toEqual({
      valor: -15,
      error: "El resultado es negativo: verificá que no hayas invertido TAM y PIC. La TAM siempre debe ser mayor que la PIC.",
    });
  });

  // --- Comportamiento especial de 0 (a diferencia de PaFi, acá NO se excluye) ---
  it("TAM=0 y PIC=0 -> PPC=0 -> 'Crítico', NO null (0 pasa la guarda == null)", () => {
    expect(calcularPPC("0", "0")).toEqual({
      valor: 0,
      categoria: "Crítico: riesgo de isquemia cerebral",
      colorClass: "pafi-severo",
    });
  });

  it("TAM=50, PIC=0 -> PPC=50 -> por debajo del objetivo (PIC=0 solo tampoco bloquea)", () => {
    expect(calcularPPC("50", "0")).toEqual({
      valor: 50,
      categoria: "Por debajo del objetivo: vigilar estrechamente",
      colorClass: "pafi-moderado",
    });
  });

  // --- Vacíos / inválidos ---
  it("TAM vacío -> null", () => {
    expect(calcularPPC("", "15")).toBeNull();
  });

  it("PIC vacío -> null", () => {
    expect(calcularPPC("85", "")).toBeNull();
  });

  it("ambos vacíos -> null", () => {
    expect(calcularPPC("", "")).toBeNull();
  });

  it('TAM no numérico ("abc") -> null', () => {
    expect(calcularPPC("abc", "15")).toBeNull();
  });

  it('PIC no numérico ("abc") -> null', () => {
    expect(calcularPPC("85", "abc")).toBeNull();
  });
});
