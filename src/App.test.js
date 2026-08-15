import { describe, it, expect } from "vitest";
import { num, fmt, fmtDosis, sumar, calcularPaFi } from "./App.jsx";

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
