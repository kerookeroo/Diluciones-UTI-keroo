import React, { useState, useMemo, useEffect } from "react";
import { Droplet, Activity, ChevronDown, AlertCircle, RotateCcw } from "lucide-react";

const DROGAS = [
  "Noradrenalina",
  "Dopamina",
  "Dobutamina",
  "Nitroglicerina",
  "Midazolam",
  "Fentanilo",
  "Insulina corriente",
  "Furosemida",
  "Propofol",
  "Atracurio",
  "Amiodarona",
  "Haloperidol",
  "Hidrocortisona",
  "Diclofenac",
  "Tramadol",
  "Lidocaína",
  "Heparina sódica",
  "Otra / sin nombre",
];

// Referencias de dosis máxima habitual, basadas en ficha técnica AEMPS y
// consenso de medicina crítica. No reemplazan el protocolo institucional.
// "techo" = false: drogas tituladas a efecto, sin techo diario fijo real.
const DOSIS_REFERENCIA = {
  "Noradrenalina": {
    techo: false,
    presentaciones: ["Ampolla 4 mg/4 ml (1 mg/ml)."],
    ampolla: { cantidad: 4, ml: 4 },
    unidadRef: "mcg/kg/min",
    texto: "Sin máximo absoluto fijo. Ficha técnica: 0,5–1 mcg/kg/min en shock séptico. En shock refractario se han usado dosis mayores (hasta 3 mcg/kg/min) bajo monitorización estrecha.",
  },
  "Dopamina": {
    techo: true,
    presentaciones: ["Ampolla 200 mg/5 ml (también existen 100 mg y 400 mg)."],
    ampolla: { cantidad: 200, ml: 5 },
    unidadRef: "mcg/kg/min",
    texto: "Dosis máxima recomendada: 20 mcg/kg/min. En situaciones graves se han administrado hasta 50 mcg/kg/min, vigilando diuresis de cerca.",
  },
  "Dobutamina": {
    techo: true,
    presentaciones: ["Ampolla 250 mg/20 ml (12,5 mg/ml)."],
    ampolla: { cantidad: 250, ml: 20 },
    unidadRef: "mcg/kg/min",
    texto: "Dosis máxima habitual: 20 mcg/kg/min en soporte hemodinámico. En protocolos de ecocardiografía de estrés se llega a 40-50 mcg/kg/min, pero es otro uso.",
  },
  "Nitroglicerina": {
    techo: true,
    presentaciones: ["Ampolla 25 mg/5 ml (5 mg/ml)."],
    ampolla: { cantidad: 25, ml: 5 },
    unidadRef: "mcg/min",
    texto: "Dosis usual: 10–200 mcg/min. En algunos contextos quirúrgicos se han usado 400 mcg/min o más, siempre bajo monitorización de PA.",
  },
  "Midazolam": {
    techo: false,
    presentaciones: ["Ampolla 15 mg/3 ml (5 mg/ml)."],
    ampolla: { cantidad: 15, ml: 3 },
    unidadRef: "mg/kg/h",
    texto: "Sin máximo diario fijo: se titula según escala de sedación (Ramsay/RASS). Mantenimiento habitual en UCI: 0,03–0,2 mg/kg/h.",
    notaExtraordinaria: "En sedación profunda por SDRA grave (ej. pandemia COVID-19), protocolos de cuidados críticos describieron rangos excepcionales de 0,2–1 mg/kg/h, con casos puntuales hasta 3 mg/kg/h. No es un uso habitual: requiere monitorización estrecha y justificación clínica específica.",
  },
  "Fentanilo": {
    techo: false,
    presentaciones: ["Ampolla 250 mcg/5 ml (50 mcg/ml)."],
    unidadPreparacion: "mcg",
    ampolla: { cantidad: 250, ml: 5 },
    unidadRef: "mcg/kg/h",
    texto: "Sin máximo diario establecido: se titula a la respuesta analgésica/sedante. Infusión habitual en UCI: 0,5–10 mcg/kg/h según protocolo.",
    notaExtraordinaria: "En sedación profunda por SDRA grave (ej. pandemia COVID-19), se describieron rangos excepcionales de 5–20 mcg/kg/h, con casos muy seleccionados hasta 30 mcg/kg/h. No es un uso habitual: requiere monitorización estrecha y justificación clínica específica.",
  },
  "Insulina corriente": {
    techo: false,
    presentaciones: ["Frasco-ampolla 10 ml con 100 UI/ml (1000 UI totales)."],
    unidadPreparacion: "UI",
    ampolla: { cantidad: 100, ml: 1 },
    texto: "Sin techo fijo: se titula contra glucemias horarias según protocolo institucional (ej. esquema tipo Yale). El bolo y la velocidad inicial dependen del valor de glucemia.",
  },
  "Furosemida": {
    techo: true,
    presentaciones: ["Ampolla 20 mg/2 ml."],
    ampolla: { cantidad: 20, ml: 2 },
    unidadRef: "mg/día",
    techoValor: 1500,
    texto: "Dosis máxima diaria recomendada: 1500 mg/día en adultos (ficha técnica). Velocidad de infusión: no superar 4 mg/min.",
  },
  "Propofol": {
    techo: true,
    presentaciones: ["Frasco 20 ml (200 mg) — 10 mg/ml.", "Frasco 50 ml (500 mg) — 10 mg/ml."],
    ampolla: { cantidad: 200, ml: 20 },
    unidadRef: "mg/kg/h",
    techoValor: 4,
    texto: "Dosis máxima recomendada en sedación de UCI: 4 mg/kg/h (límite de seguridad FDA por riesgo de síndrome de infusión por propofol/PRIS). Ficha técnica europea admite hasta 9 mg/kg/h, pero el consenso de seguridad en UCI es no superar 4.",
  },
  "Atracurio": {
    techo: true,
    presentaciones: ["Ampolla 50 mg/5 ml (10 mg/ml)."],
    ampolla: { cantidad: 50, ml: 5 },
    unidadRef: "mg/kg/h",
    texto: "Mantenimiento habitual en UCI: 0,3–0,6 mg/kg/h (hasta 0,65-0,78 mg/kg/h según ficha técnica). Se titula contra monitorización de bloqueo neuromuscular (TOF), no contra un techo fijo.",
  },
  "Amiodarona": {
    techo: true,
    presentaciones: ["Ampolla 150 mg/3 ml."],
    ampolla: { cantidad: 150, ml: 3 },
    unidadRef: "mg/día",
    techoValor: 1200,
    texto: "Dosis máxima diaria: 1200 mg/24h. Mantenimiento habitual 10-20 mg/kg/24h (600-800 mg/día).",
  },
  "Haloperidol": {
    techo: true,
    presentaciones: ["Ampolla 5 mg/1 ml."],
    ampolla: { cantidad: 5, ml: 1 },
    unidadRef: "mg/día",
    techoValor: 20,
    texto: "Máximo habitual en delirio de UCI: 20 mg/24h IV. En delirium refractario, bajo monitorización estrecha del QT, algunos esquemas excepcionales llegan a dosis mayores.",
  },
  "Hidrocortisona": {
    techo: true,
    presentaciones: ["Ampolla/vial 100 mg."],
    unidadRef: "mg/día",
    techoValor: 300,
    texto: "En shock séptico: dosis habitual 200 mg/día (Surviving Sepsis Campaign), con estudios que usaron hasta 300-400 mg/día. Se suele fraccionar cada 6-8h o en infusión continua.",
  },
  "Diclofenac": {
    techo: true,
    presentaciones: ["Ampolla 75 mg/3 ml."],
    ampolla: { cantidad: 75, ml: 3 },
    unidadRef: "mg/día",
    techoValor: 150,
    texto: "Dosis máxima diaria: 150 mg/día, vía IM o IV (no administrar en bolo IV directo). Período máximo recomendado de uso parenteral: 2 días, luego pasar a vía oral.",
  },
  "Tramadol": {
    techo: true,
    presentaciones: ["Ampolla 100 mg/2 ml."],
    ampolla: { cantidad: 100, ml: 2 },
    unidadRef: "mg/día",
    techoValor: 400,
    texto: "Dosis máxima diaria: 400 mg/día, salvo circunstancias clínicas especiales bajo indicación médica.",
  },
  "Lidocaína": {
    techo: true,
    presentaciones: ["Ampolla 100 mg/5 ml (2%)."],
    ampolla: { cantidad: 100, ml: 5 },
    unidadRef: "mg/min",
    texto: "Como antiarrítmico, infusión de mantenimiento: 1-4 mg/min. Máximo orientativo cercano a 300 mg/kg en un adulto de 70kg. Bolos de rescate hasta 200-300 mg en 1 hora si el efecto es insuficiente.",
  },
  "Heparina sódica": {
    techo: false,
    presentaciones: ["Frasco-ampolla 5 ml con 5000 UI/ml (25.000 UI totales)."],
    unidadPreparacion: "UI",
    ampolla: { cantidad: 25000, ml: 5 },
    texto: "No tiene un techo de UI/h fijo: se titula contra el KPTT del paciente, objetivo habitual 1,5-2 veces el valor basal. Esquema típico: bolo 80-100 UI/kg, mantenimiento 18 UI/kg/h, con ajuste según control de laboratorio.",
  },
};

const FACTOR_GOTERO = {
  macro: 20, // gotas/ml estándar macrogotero
  micro: 60, // gotas/ml microgotero
};

function num(v) {
  const n = parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

// Resalta en negrita los valores numéricos de dosis dentro de un texto de
// referencia (ej. "0,03–0,2 mg/kg/h", "20 mcg/kg/min", "1500 mg"), para que
// las cifras clave salten a la vista igual que en la caja de equivalencia.
// Detecta: número (con coma o punto decimal) opcionalmente seguido de un
// rango ("–" o "-" y otro número) y opcionalmente una unidad clínica.
const PATRON_DOSIS = /\d+(?:[.,]\d+)?(?:\s*[–-]\s*\d+(?:[.,]\d+)?)?(?:\s*(?:mcg|mg|UI|g)(?:\/(?:kg|m2|min|h|día))*(?:\/(?:kg|min|h))?)?/g;

function resaltarDosis(texto) {
  const partes = [];
  let ultimoIndice = 0;
  let match;
  const regex = new RegExp(PATRON_DOSIS);
  while ((match = regex.exec(texto)) !== null) {
    // Evita resaltar números sueltos sin unidad ni contexto de rango que
    // probablemente no sean una dosis (ej. años, referencias).
    const esCandidatoValido = /(?:mcg|mg|UI|g\b|[–-]\s*\d)/.test(match[0]);
    if (!esCandidatoValido) continue;
    if (match.index > ultimoIndice) {
      partes.push(texto.slice(ultimoIndice, match.index));
    }
    partes.push(<strong key={match.index}>{match[0]}</strong>);
    ultimoIndice = match.index + match[0].length;
  }
  if (ultimoIndice < texto.length) {
    partes.push(texto.slice(ultimoIndice));
  }
  return partes;
}

function Field({ label, unit, value, onChange, placeholder }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <div className="field-input-wrap">
        <input
          className="field-input"
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
        {unit && <span className="field-unit">{unit}</span>}
      </div>
    </label>
  );
}

function Diluciones() {
  const [droga, setDroga] = useState(DROGAS[0]);
  const [dosisMg, setDosisMg] = useState("");
  const [volumenMl, setVolumenMl] = useState("");
  const [pesoKg, setPesoKg] = useState("");
  const [sinDiluir, setSinDiluir] = useState(false);
  const [numAmpollas, setNumAmpollas] = useState("");

  // dirección: "dosis-a-mlh" (parto de la dosis indicada y calculo ml/h)
  //            "mlh-a-dosis" (parto de ml/h ya cargado y calculo qué dosis equivale)
  const [direccion, setDireccion] = useState("mlh-a-dosis");

  const [dosisPrescrita, setDosisPrescrita] = useState("");
  const [mlhCargado, setMlhCargado] = useState("");
  const [unidadDosis, setUnidadDosis] = useState("gamas");

  const necesitaPeso = unidadDosis === "gamas" || unidadDosis === "UI/kg/h";
  const unidadPrep = DOSIS_REFERENCIA[droga]?.unidadPreparacion || "mg";
  const esUI = unidadPrep === "UI";
  const unidadRefDroga = DOSIS_REFERENCIA[droga]?.unidadRef;
  const refNecesitaPeso = unidadRefDroga ? unidadRefDroga.includes("/kg/") : false;
  // El modo "sin diluir" solo tiene sentido clínico real para estas 4 drogas,
  // que en la práctica de UTI se ven sin dilución en escenarios puntuales
  // (restricción de líquidos, urgencia). Para el resto no se ofrece.
  const DROGAS_SIN_DILUIR = ["Propofol", "Fentanilo", "Furosemida", "Midazolam"];
  const datoAmpolla = DROGAS_SIN_DILUIR.includes(droga) ? DOSIS_REFERENCIA[droga]?.ampolla : null;

  // En modo "sin diluir" no se agrega suero: el volumen total es el volumen
  // físico de las ampollas puras, y la dosis total es la suma de su contenido.
  // Se calculan ambos a partir del número de ampollas para que el usuario no
  // tenga que hacer esa cuenta de cabeza.
  useEffect(() => {
    if (sinDiluir && datoAmpolla) {
      const n = num(numAmpollas);
      if (n && n > 0) {
        setDosisMg(String(n * datoAmpolla.cantidad));
        setVolumenMl(String(n * datoAmpolla.ml));
      } else {
        setDosisMg("");
        setVolumenMl("");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sinDiluir, numAmpollas, droga]);

  // Cuando cambia la droga a/desde una que se dosifica en UI, la unidad de
  // dosis seleccionada puede dejar de tener sentido (ej. "gamas" para
  // heparina). Se reinicia a un valor válido para el nuevo contexto.
  useEffect(() => {
    if (esUI && (unidadDosis === "gamas" || unidadDosis === "mcg/min" || unidadDosis === "mg/h")) {
      setUnidadDosis("UI/h");
    }
    if (!esUI && (unidadDosis === "UI/h" || unidadDosis === "UI/kg/h")) {
      setUnidadDosis("gamas");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [esUI]);

  const resultado = useMemo(() => {
    const cantidad = num(dosisMg);
    const vol = num(volumenMl);
    const peso = num(pesoKg);

    if (!cantidad || !vol || cantidad <= 0 || vol <= 0) return null;

    // Concentración: para UI se trabaja directamente en UI/ml. Para el resto,
    // la preparación puede estar en mg o mcg, y la concentración interna
    // siempre se expresa en mcg/ml.
    const concentracion = esUI ? cantidad / vol : unidadPrep === "mcg" ? cantidad / vol : (cantidad * 1000) / vol;

    if (esUI) {
      // Drogas en UI (insulina, heparina): la dosis se maneja directamente
      // en UI/h, sin pasar por mcg/min.
      if (direccion === "dosis-a-mlh") {
        const dosis = num(dosisPrescrita);
        if (!dosis || dosis <= 0) return { concentracionMcgMl: concentracion, mlPorHora: null };
        if (necesitaPeso && (!peso || peso <= 0)) {
          return { concentracionMcgMl: concentracion, mlPorHora: null, faltaPeso: true };
        }
        const uiPorHora = unidadDosis === "UI/kg/h" ? dosis * peso : dosis;
        const mlPorHora = uiPorHora / concentracion;
        return { concentracionMcgMl: concentracion, mlPorHora, uiPorHora, pesoUsado: peso };
      } else {
        const mlh = num(mlhCargado);
        if (!mlh || mlh <= 0) return { concentracionMcgMl: concentracion, dosisResultante: null };
        if (necesitaPeso && (!peso || peso <= 0)) {
          return { concentracionMcgMl: concentracion, dosisResultante: null, faltaPeso: true };
        }
        const uiPorHora = mlh * concentracion;
        const dosisResultante = unidadDosis === "UI/kg/h" ? uiPorHora / peso : uiPorHora;
        return { concentracionMcgMl: concentracion, dosisResultante, uiPorHora, pesoUsado: peso };
      }
    }

    const concentracionMcgMl = concentracion;

    if (direccion === "dosis-a-mlh") {
      const dosis = num(dosisPrescrita);
      if (!dosis || dosis <= 0) return { concentracionMcgMl, mlPorHora: null };

      if (necesitaPeso && (!peso || peso <= 0)) {
        return { concentracionMcgMl, mlPorHora: null, faltaPeso: true };
      }

      let mcgPorMin;
      if (unidadDosis === "gamas") mcgPorMin = dosis * peso;
      else if (unidadDosis === "mcg/min") mcgPorMin = dosis;
      else if (unidadDosis === "mg/h") mcgPorMin = (dosis * 1000) / 60;
      else mcgPorMin = dosis;

      const mlPorHora = (mcgPorMin * 60) / concentracionMcgMl;
      return { concentracionMcgMl, mlPorHora, mcgPorMin, pesoUsado: peso };
    } else {
      // mlh-a-dosis: parto de ml/h cargado y calculo la dosis resultante
      const mlh = num(mlhCargado);
      if (!mlh || mlh <= 0) return { concentracionMcgMl, dosisResultante: null };

      if (necesitaPeso && (!peso || peso <= 0)) {
        return { concentracionMcgMl, dosisResultante: null, faltaPeso: true };
      }

      const mcgPorMin = (mlh * concentracionMcgMl) / 60;

      let dosisResultante;
      if (unidadDosis === "gamas") dosisResultante = mcgPorMin / peso;
      else if (unidadDosis === "mcg/min") dosisResultante = mcgPorMin;
      else if (unidadDosis === "mg/h") dosisResultante = (mcgPorMin * 60) / 1000;
      else dosisResultante = mcgPorMin;

      return { concentracionMcgMl, dosisResultante, mcgPorMin, pesoUsado: peso };
    }
  }, [dosisMg, volumenMl, pesoKg, dosisPrescrita, mlhCargado, unidadDosis, direccion, necesitaPeso, unidadPrep, esUI]);

  const reset = () => {
    setDosisMg("");
    setVolumenMl("");
    setPesoKg("");
    setDosisPrescrita("");
    setMlhCargado("");
    setSinDiluir(false);
    setNumAmpollas("");
  };

  const cambiarDroga = (nuevaDroga) => {
    setDroga(nuevaDroga);
    // Cada droga tiene su propia preparación y dosis: no tiene sentido
    // arrastrar esos valores de una droga a otra. El peso del paciente
    // no depende de la droga, así que ese sí se conserva.
    setDosisMg("");
    setVolumenMl("");
    setDosisPrescrita("");
    setMlhCargado("");
    setNumAmpollas("");
    if (!DOSIS_REFERENCIA[nuevaDroga]?.ampolla) {
      setSinDiluir(false);
    }
  };

  const unidadCompleta = unidadDosis === "gamas" ? "gamas (mcg/kg/min)" : unidadDosis;

  // Convierte el resultado calculado (siempre disponible como mcgPorMin,
  // o uiPorHora para drogas en UI) a la unidad en que está expresado el
  // rango de referencia de la droga, para poder comparar directamente.
  const equivalenciaRef = useMemo(() => {
    const ref = DOSIS_REFERENCIA[droga];
    if (!ref || !ref.unidadRef || !resultado) return null;
    // Solo se usa el peso si el campo está realmente visible y fue
    // completado a propósito en este contexto (unidad "gamas"/"UI/kg/h").
    // Si no, podría arrastrarse un valor cargado para otra droga u otra
    // unidad, generando una equivalencia con un peso que el usuario nunca
    // ingresó para este cálculo.
    const peso = necesitaPeso ? resultado.pesoUsado : null;

    if (esUI) {
      return null; // ninguna droga en UI tiene unidadRef definida actualmente
    }

    const mcgPorMin = resultado.mcgPorMin;
    if (mcgPorMin == null) return null;

    switch (ref.unidadRef) {
      case "mcg/kg/min":
        if (!peso || peso <= 0) return null;
        return { valor: mcgPorMin / peso, unidad: "mcg/kg/min" };
      case "mcg/kg/h":
        if (!peso || peso <= 0) return null;
        return { valor: (mcgPorMin * 60) / peso, unidad: "mcg/kg/h" };
      case "mg/kg/h":
        if (!peso || peso <= 0) return null;
        return { valor: (mcgPorMin * 60) / 1000 / peso, unidad: "mg/kg/h" };
      case "mcg/min":
        return { valor: mcgPorMin, unidad: "mcg/min" };
      case "mg/min":
        return { valor: mcgPorMin / 1000, unidad: "mg/min" };
      case "mg/día":
        return { valor: (mcgPorMin * 60 * 24) / 1000, unidad: "mg/día" };
      default:
        return null;
    }
  }, [droga, resultado, esUI, necesitaPeso]);

  return (
    <div className="panel">
      <div className="panel-row">
        <label className="field">
          <span className="field-label">Droga</span>
          <div className="select-wrap">
            <select className="field-select" value={droga} onChange={(e) => cambiarDroga(e.target.value)}>
              {DROGAS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <ChevronDown size={16} className="select-chevron" />
          </div>
        </label>
      </div>

      <div className="presentacion-row">
        {DOSIS_REFERENCIA[droga] ? (
          <div className="presentacion-tags">
            {DOSIS_REFERENCIA[droga].presentaciones.map((p, i) => (
              <div className="presentacion-tag" key={i}>{p}</div>
            ))}
          </div>
        ) : <span />}
        <button className="btn-reset" onClick={reset} aria-label="Borrar valores">
          <RotateCcw size={14} />
          Borrar
        </button>
      </div>

      <div className="section-title">Preparación</div>

      {datoAmpolla && (
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={sinDiluir}
            onChange={(e) => {
              setSinDiluir(e.target.checked);
              if (!e.target.checked) {
                setNumAmpollas("");
                setDosisMg("");
                setVolumenMl("");
              }
            }}
          />
          <span>Sin diluir (ampollas puras, sin agregar suero)</span>
        </label>
      )}

      {sinDiluir && datoAmpolla ? (
        <>
          <div className="panel-row two-col">
            <Field
              label="Número de ampollas"
              unit="amp."
              value={numAmpollas}
              onChange={setNumAmpollas}
              placeholder="ej: 25"
            />
            <div className="campo-calculado">
              <span className="field-label">Volumen resultante</span>
              <div className="campo-calculado-valor">
                {volumenMl ? `${volumenMl} ml` : "—"}
              </div>
            </div>
          </div>
          {dosisMg && (
            <div className="info-nota-ampollas">
              Equivale a {dosisMg} {unidadPrep} totales en {volumenMl} ml.
            </div>
          )}
        </>
      ) : (
        <>
          <div className="panel-row two-col">
            <Field label="Dosis total de ampollas en suero/solución" unit={unidadPrep} value={dosisMg} onChange={setDosisMg} placeholder={droga === "Insulina corriente" ? "ej: 100" : droga === "Heparina sódica" ? "ej: 25000" : unidadPrep === "mcg" ? "ej: 750" : "ej: 4"} />
            <Field label="Volumen de suero" unit="ml" value={volumenMl} onChange={setVolumenMl} placeholder="ej: 250" />
          </div>
          {DOSIS_REFERENCIA[droga]?.ampolla && (() => {
            const amp = DOSIS_REFERENCIA[droga].ampolla;
            const cantidad = num(dosisMg);
            const vol = num(volumenMl);
            if (!cantidad || cantidad <= 0 || !vol) return null;
            const nAmpollas = cantidad / amp.cantidad;
            const volumenDiluido = vol + nAmpollas * amp.ml;
            return (
              <div className="volumen-diluido-block">
                <div className="volumen-diluido-label">
                  <span className="volumen-diluido-label-top">{fmtDosis(nAmpollas, 2)} ampolla{nAmpollas !== 1 ? "s" : ""} →</span>
                  <span className="volumen-diluido-label-bottom">VOLUMEN TOTAL DILUIDO:</span>
                </div>
                <div className="volumen-diluido-valor">
                  <span className="volumen-diluido-valor-num">{fmtDosis(volumenDiluido, 1)}</span>
                  <span className="volumen-diluido-valor-unit">ml</span>
                </div>
              </div>
            );
          })()}
        </>
      )}

      <div className="section-title">¿Qué querés calcular?</div>
      <div className="mode-tabs">
        <button className={`mode-tab ${direccion === "mlh-a-dosis" ? "active" : ""}`} onClick={() => setDireccion("mlh-a-dosis")}>
          ml/h → Dosis
        </button>
        <button className={`mode-tab ${direccion === "dosis-a-mlh" ? "active" : ""}`} onClick={() => setDireccion("dosis-a-mlh")}>
          Dosis → ml/h
        </button>
      </div>

      <div className="panel-row two-col">
        {direccion === "dosis-a-mlh" ? (
          <Field label="Dosis prescrita" unit={unidadDosis === "gamas" ? "gamas" : unidadDosis} value={dosisPrescrita} onChange={setDosisPrescrita} placeholder="ej: 0.1" />
        ) : (
          <Field label="Velocidad actual" unit="ml/h" value={mlhCargado} onChange={setMlhCargado} placeholder="ej: 12" />
        )}

        <label className="field">
          <span className="field-label">Unidad de dosis</span>
          <div className="select-wrap">
            <select className="field-select" value={unidadDosis} onChange={(e) => setUnidadDosis(e.target.value)}>
              {esUI ? (
                <>
                  <option value="UI/h">UI/h</option>
                  <option value="UI/kg/h">UI/kg/h</option>
                </>
              ) : (
                <>
                  <option value="mg/h">mg/h</option>
                  <option value="gamas">Gamas (mcg/kg/min)</option>
                  <option value="mcg/min">mcg/min</option>
                </>
              )}
            </select>
            <ChevronDown size={16} className="select-chevron" />
          </div>
        </label>
      </div>

      {necesitaPeso && (
        <div className="panel-row">
          <Field label="Peso del paciente" unit="kg" value={pesoKg} onChange={setPesoKg} placeholder="ej: 70" />
        </div>
      )}

      <div className="result-block">
        {!resultado && (
          <div className="result-empty">
            Completá mg totales y volumen para ver la concentración.
          </div>
        )}
        {resultado && (
          <>
            <div className="result-line">
              <span className="result-label">Concentración</span>
              <span className="result-value-sm">{fmtDosis(resultado.concentracionMcgMl, 2)} {esUI ? "UI/ml" : "mcg/ml"}</span>
            </div>
            {resultado.faltaPeso && (
              <div className="result-warning">
                <AlertCircle size={14} /> Falta el peso del paciente para calcular en {unidadCompleta}
              </div>
            )}
            {direccion === "dosis-a-mlh" && resultado.mlPorHora != null && !resultado.faltaPeso && (
              <div className="result-main">
                <span className="result-main-value">{fmtDosis(resultado.mlPorHora, 2)}</span>
                <span className="result-main-unit">ml/h</span>
              </div>
            )}
            {direccion === "mlh-a-dosis" && resultado.dosisResultante != null && !resultado.faltaPeso && (
              <div className="result-main">
                <span className="result-main-value">{fmtDosis(resultado.dosisResultante, 3)}</span>
                <span className="result-main-unit">{unidadCompleta}</span>
              </div>
            )}
          </>
        )}
      </div>

      {equivalenciaRef && (
        <div className="ref-dosis">
          <div className="ref-dosis-titulo">Equivalente en unidad de referencia</div>
          <div className="ref-dosis-texto">
            Esta velocidad equivale a <strong>{fmtDosis(equivalenciaRef.valor, 3)} {equivalenciaRef.unidad}</strong>.
          </div>
        </div>
      )}

      {!equivalenciaRef && refNecesitaPeso && resultado && !resultado.faltaPeso && (resultado.mlPorHora != null || resultado.dosisResultante != null) && (
        <div className="ref-dosis">
          <div className="ref-dosis-texto">
            Para comparación y obtención de dosis recomendada seleccioná <strong>Gamas</strong> y colocá <strong>peso</strong> de paciente.
          </div>
        </div>
      )}

      {DOSIS_REFERENCIA[droga] && resultado && !resultado.faltaPeso && (resultado.mlPorHora != null || resultado.dosisResultante != null) && (
        <div className="ref-dosis">
          <div className="ref-dosis-titulo">
            {DOSIS_REFERENCIA[droga].techo ? "Dosis máxima de referencia" : "Sobre el máximo de esta droga"}
          </div>
          <div className="ref-dosis-texto">{resaltarDosis(DOSIS_REFERENCIA[droga].texto)}</div>
        </div>
      )}

      {DOSIS_REFERENCIA[droga]?.notaExtraordinaria && resultado && !resultado.faltaPeso && (resultado.mlPorHora != null || resultado.dosisResultante != null) && (
        <div className="ref-dosis ref-dosis-extraordinaria">
          <div className="ref-dosis-titulo">Rango extraordinario (escenarios excepcionales)</div>
          <div className="ref-dosis-texto">{resaltarDosis(DOSIS_REFERENCIA[droga].notaExtraordinaria)}</div>
        </div>
      )}

      <div className="disclaimer">
        <AlertCircle size={13} />
        <span>Verificá siempre el resultado contra el protocolo de tu institución. Esta herramienta no reemplaza el juicio clínico. Las dosis de referencia se basan en ficha técnica y consenso de medicina crítica habituales, no en consulta en tiempo real al Vademécum: para una prescripción formal, verificá la presentación comercial específica.</span>
      </div>
    </div>
  );
}

function fmt(n) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

// Formato para Diluciones: usa coma decimal (convención Argentina) y evita
// mostrar decimales innecesarios en números que son enteros (ej. toFixed(3)
// sobre 5 da "5.000", que a simple vista se lee como "cinco mil").
function fmtDosis(n, maxDecimales = 3) {
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(maxDecimales).replace(/0+$/, "").replace(/\.$/, "").replace(".", ",");
}

function Goteo() {
  const [modo, setModo] = useState("mlh-a-gotas"); // mlh-a-gotas | gotas-a-mlh | volumen-tiempo
  const [tipoGotero, setTipoGotero] = useState("macro");

  const [mlh, setMlh] = useState("");
  const [gotasMin, setGotasMin] = useState("");
  const [volumenTotal, setVolumenTotal] = useState("");
  const [tiempoHoras, setTiempoHoras] = useState("");

  const factor = FACTOR_GOTERO[tipoGotero];
  const esMicro = tipoGotero === "micro";

  const labelGotas = esMicro ? "microgotas/min" : "gotas/min";

  const cambiarGotero = (tipo) => {
    setTipoGotero(tipo);
    if (tipo === "micro" && modo !== "volumen-tiempo") {
      setModo("volumen-tiempo");
    }
  };

  const resultadoConversion = useMemo(() => {
    if (modo === "mlh-a-gotas") {
      const v = num(mlh);
      if (!v) return null;
      return { value: (v * factor) / 60, label: labelGotas };
    }
    if (modo === "gotas-a-mlh") {
      const g = num(gotasMin);
      if (!g) return null;
      return { value: (g * 60) / factor, label: "ml/h" };
    }
    if (modo === "volumen-tiempo") {
      const v = num(volumenTotal);
      const t = num(tiempoHoras);
      if (!v || !t) return null;
      const mlhCalc = v / t;
      const gotasCalc = (mlhCalc * factor) / 60;
      if (esMicro) {
        return { value: mlhCalc, label: "ml/h" };
      }
      // En macrogotero, lo que el enfermero regula es el goteo:
      // gotas/min va como resultado principal, ml/h queda como
      // referencia para cuando se usa bomba de infusión (BIC).
      return { value: gotasCalc, label: labelGotas, extra: mlhCalc, extraLabel: "ml/h", extraNombre: "Equivalente BIC" };
    }
    return null;
  }, [modo, mlh, gotasMin, volumenTotal, tiempoHoras, factor, labelGotas, esMicro]);

  return (
    <div className="panel">
      <div className="seg-control" role="tablist">
        <button className={`seg-btn ${tipoGotero === "macro" ? "active" : ""}`} onClick={() => cambiarGotero("macro")}>
          Macrogotero (20 g/ml)
        </button>
        <button className={`seg-btn ${tipoGotero === "micro" ? "active" : ""}`} onClick={() => cambiarGotero("micro")}>
          Microgotero (60 g/ml)
        </button>
      </div>

      {esMicro && (
        <div className="info-note">
          Con microgotero, ml/h y microgotas/min son el mismo número: no hace falta convertir.
        </div>
      )}

      {!esMicro && (
        <div className="mode-tabs">
          <button className={`mode-tab ${modo === "mlh-a-gotas" ? "active" : ""}`} onClick={() => setModo("mlh-a-gotas")}>
            ml/h → gotas/min
          </button>
          <button className={`mode-tab ${modo === "gotas-a-mlh" ? "active" : ""}`} onClick={() => setModo("gotas-a-mlh")}>
            gotas/min → ml/h
          </button>
          <button className={`mode-tab ${modo === "volumen-tiempo" ? "active" : ""}`} onClick={() => setModo("volumen-tiempo")}>
            Volumen + tiempo
          </button>
        </div>
      )}

      {esMicro && (
        <div className="mode-tabs">
          <button className="mode-tab active">Volumen + tiempo</button>
        </div>
      )}

      <div className="panel-row">
        {modo === "mlh-a-gotas" && !esMicro && (
          <Field label="Velocidad de bomba" unit="ml/h" value={mlh} onChange={setMlh} placeholder="ej: 84" />
        )}
        {modo === "gotas-a-mlh" && !esMicro && (
          <Field label="Goteo observado" unit={labelGotas} value={gotasMin} onChange={setGotasMin} placeholder="ej: 28" />
        )}
        {modo === "volumen-tiempo" && (
          <div className="panel-row two-col" style={{ padding: 0 }}>
            <Field label="Volumen a infundir" unit="ml" value={volumenTotal} onChange={setVolumenTotal} placeholder="ej: 500" />
            <Field label="Tiempo total" unit="horas" value={tiempoHoras} onChange={setTiempoHoras} placeholder="ej: 8" />
          </div>
        )}
      </div>

      <div className="result-block">
        {!resultadoConversion && (
          <div className="result-empty">Ingresá un valor para calcular.</div>
        )}
        {resultadoConversion && (
          <>
            <div className="result-main">
              <span className="result-main-value">{fmt(resultadoConversion.value)}</span>
              <span className="result-main-unit">{resultadoConversion.label}</span>
            </div>
            {!Number.isInteger(resultadoConversion.value) && (
              <div className="result-line result-rounded">
                <span className="result-label">Valor redondeado</span>
                <span className="result-value-sm">≈ {Math.round(resultadoConversion.value)} {resultadoConversion.label}</span>
              </div>
            )}
            {resultadoConversion.extra != null && (
              <>
                <div className="result-line">
                  <span className="result-label">{resultadoConversion.extraNombre || "Equivalente"}</span>
                  <span className="result-value-sm">{fmt(resultadoConversion.extra)} {resultadoConversion.extraLabel}</span>
                </div>
                {!Number.isInteger(resultadoConversion.extra) && (
                  <div className="result-line result-rounded">
                    <span className="result-label">{resultadoConversion.extraNombre ? `${resultadoConversion.extraNombre} redondeado` : "Valor redondeado"}</span>
                    <span className="result-value-sm">≈ {Math.round(resultadoConversion.extra)} {resultadoConversion.extraLabel}</span>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {resultadoConversion && (!Number.isInteger(resultadoConversion.value) || (resultadoConversion.extra != null && !Number.isInteger(resultadoConversion.extra))) && (
        <div className="disclaimer">
          <AlertCircle size={13} />
          <span>El valor redondeado es de uso habitual en hidratación y sueros. Para antibióticos y drogas de alto riesgo, usá siempre el valor exacto.</span>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState("goteo");

  return (
    <div className="app-shell">
      <style>{`
        * { box-sizing: border-box; }
        .app-shell {
          min-height: 100vh;
          background: #0B1210;
          color: #EAF2EE;
          font-family: -apple-system, "SF Pro Text", "Inter", system-ui, sans-serif;
          display: flex;
          flex-direction: column;
          padding-bottom: 90px;
        }
        .topbar {
          padding: 28px 20px 18px;
          border-bottom: 1px solid #1B2A25;
          background: linear-gradient(180deg, #0F1B17 0%, #0B1210 100%);
        }
        .topbar-eyebrow {
          font-size: 11px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #5FA88A;
          font-weight: 600;
          margin-bottom: 4px;
        }
        .topbar-title {
          font-family: "Georgia", "Iowan Old Style", serif;
          font-size: 26px;
          font-weight: 600;
          letter-spacing: -0.01em;
          color: #F4FBF7;
        }
        .topbar-sub {
          font-size: 13px;
          color: #6F8A7F;
          margin-top: 2px;
        }
        .content {
          flex: 1;
          padding: 18px 16px;
          max-width: 480px;
          margin: 0 auto;
          width: 100%;
        }
        .panel {
          background: #101C18;
          border: 1px solid #1B2A25;
          border-radius: 16px;
          padding: 18px;
        }
        .panel-row {
          margin-bottom: 16px;
        }
        .panel-row.two-col {
          display: grid;
          grid-template-columns: 1fr 1fr;
          align-items: end;
          gap: 12px;
        }
        .checkbox-row {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: #9FB8AC;
          margin-bottom: 14px;
          cursor: pointer;
        }
        .checkbox-row input[type="checkbox"] {
          width: 17px;
          height: 17px;
          accent-color: #3DAE82;
          cursor: pointer;
        }
        .campo-calculado {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .campo-calculado-valor {
          background: #0B1512;
          border: 1px solid #1B2A25;
          border-radius: 10px;
          padding: 12px 14px;
          font-size: 17px;
          color: #9FB8AC;
          font-variant-numeric: tabular-nums;
        }
        .info-nota-ampollas {
          font-size: 12.5px;
          color: #6F8A7F;
          margin-top: -4px;
          margin-bottom: 16px;
        }
        .info-nota-ampollas strong {
          color: #9FB8AC;
          font-weight: 700;
        }
        .volumen-diluido-block {
          background: #0B1512;
          border: 1px solid #1B2A25;
          border-radius: 12px;
          padding: 18px 16px;
          margin-top: 6px;
          margin-bottom: 16px;
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 12px;
        }
        .volumen-diluido-label {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .volumen-diluido-label-top {
          font-size: 14px;
          color: #6F8A7F;
        }
        .volumen-diluido-label-bottom {
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.04em;
          color: #4FD195;
          white-space: nowrap;
        }
        .volumen-diluido-valor {
          display: flex;
          align-items: baseline;
          gap: 6px;
          flex-shrink: 0;
        }
        .volumen-diluido-valor-num {
          font-size: 44px;
          font-weight: 800;
          font-variant-numeric: tabular-nums;
          color: #4FD195;
          letter-spacing: -0.02em;
          line-height: 1;
        }
        .volumen-diluido-valor-unit {
          font-size: 18px;
          color: #4FD195;
          font-weight: 600;
        }
        .section-title {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: #5FA88A;
          font-weight: 700;
          margin: 18px 0 10px;
          padding-top: 14px;
          border-top: 1px solid #1B2A25;
        }
        .panel-row:first-child + .section-title,
        .panel > .section-title:first-of-type {
          border-top: none;
          padding-top: 0;
          margin-top: 0;
        }
        .field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .field-label {
          font-size: 12.5px;
          color: #9FB8AC;
          font-weight: 500;
        }
        .field-input-wrap, .select-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }
        .field-input, .field-select {
          width: 100%;
          background: #0B1512;
          border: 1px solid #25372F;
          border-radius: 10px;
          padding: 12px 14px;
          font-size: 17px;
          color: #F4FBF7;
          font-variant-numeric: tabular-nums;
          outline: none;
          transition: border-color 0.15s;
          appearance: none;
        }
        .field-input:focus, .field-select:focus {
          border-color: #3DAE82;
        }
        .field-unit {
          position: absolute;
          right: 14px;
          font-size: 13px;
          color: #6F8A7F;
          pointer-events: none;
        }
        .select-chevron {
          position: absolute;
          right: 12px;
          color: #6F8A7F;
          pointer-events: none;
        }
        .field-select { padding-right: 36px; cursor: pointer; }
        .btn-reset {
          background: #15120A;
          border: 1px solid #3D331A;
          color: #D9A441;
          border-radius: 10px;
          padding: 8px 14px;
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
        }
        .presentacion-tags {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .presentacion-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 16px;
        }
        .panel-row.first-row { display: flex; align-items: flex-end; gap: 10px; }
        .result-block {
          background: #0B1512;
          border: 1px solid #1B2A25;
          border-radius: 12px;
          padding: 16px;
          margin-top: 6px;
          min-height: 64px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          justify-content: center;
        }
        .result-empty {
          font-size: 13px;
          color: #5C7568;
          text-align: center;
        }
        .result-main {
          display: flex;
          align-items: baseline;
          gap: 8px;
          justify-content: center;
        }
        .result-main-value {
          font-size: 38px;
          font-weight: 700;
          font-variant-numeric: tabular-nums;
          color: #4FD195;
          letter-spacing: -0.02em;
        }
        .result-main-unit {
          font-size: 15px;
          color: #9FB8AC;
          font-weight: 500;
        }
        .result-line {
          display: flex;
          justify-content: space-between;
          font-size: 13.5px;
        }
        .result-label { color: #6F8A7F; }
        .result-value-sm { color: #DCEBE3; font-variant-numeric: tabular-nums; font-weight: 600; }
        .result-warning {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12.5px;
          color: #E0B04A;
          background: #2A2210;
          border-radius: 8px;
          padding: 8px 10px;
        }
        .result-rounded {
          padding-top: 2px;
        }
        .result-rounded .result-value-sm {
          color: #9FB8AC;
          font-weight: 600;
        }
        .ref-dosis {
          background: #15120A;
          border: 1px solid #3D331A;
          border-radius: 12px;
          padding: 12px 14px;
          margin-top: 10px;
        }
        .ref-dosis-extraordinaria {
          border-color: #5C3A1A;
          background: #1A1209;
        }
        .ref-dosis-extraordinaria .ref-dosis-titulo {
          color: #E08A3D;
        }
        .presentacion-tag {
          font-size: 12.5px;
          color: #E8DCC0;
          font-weight: 600;
          background: #15120A;
          border: 1px solid #3D331A;
          border-radius: 8px;
          padding: 8px 12px;
          display: inline-block;
        }
        .ref-dosis-titulo {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: #D9A441;
          font-weight: 700;
          margin-bottom: 4px;
        }
        .ref-dosis-texto {
          font-size: 12.5px;
          color: #C9B98E;
          line-height: 1.45;
        }
        .ref-dosis-texto strong {
          color: #F0DCA0;
          font-weight: 700;
        }
        .disclaimer {
          display: flex;
          gap: 8px;
          align-items: flex-start;
          font-size: 11.5px;
          color: #5C7568;
          margin-top: 14px;
          line-height: 1.4;
        }
        .disclaimer svg { flex-shrink: 0; margin-top: 1px; }
        .info-note {
          background: #0E2118;
          border: 1px solid #1F3D2D;
          color: #7FC9A3;
          font-size: 12.5px;
          line-height: 1.4;
          padding: 10px 12px;
          border-radius: 10px;
          margin-bottom: 14px;
        }
        .seg-control {
          display: flex;
          background: #0B1512;
          border: 1px solid #1B2A25;
          border-radius: 10px;
          padding: 3px;
          margin-bottom: 16px;
        }
        .seg-btn {
          flex: 1;
          background: transparent;
          border: none;
          color: #6F8A7F;
          font-size: 12.5px;
          font-weight: 600;
          padding: 9px 4px;
          border-radius: 8px;
          cursor: pointer;
        }
        .seg-btn.active {
          background: #1B2E26;
          color: #4FD195;
        }
        .mode-tabs {
          display: flex;
          gap: 6px;
          margin-bottom: 18px;
          overflow-x: auto;
        }
        .mode-tab {
          background: #0B1512;
          border: 1px solid #1B2A25;
          color: #9FB8AC;
          font-size: 12px;
          font-weight: 600;
          padding: 9px 12px;
          border-radius: 20px;
          white-space: nowrap;
          cursor: pointer;
        }
        .mode-tab.active {
          background: #163027;
          border-color: #2D5C49;
          color: #4FD195;
        }
        .tabbar {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: #0F1B17;
          border-top: 1px solid #1B2A25;
          display: flex;
          padding: 8px 12px calc(8px + env(safe-area-inset-bottom));
          gap: 6px;
        }
        .tab-btn {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          background: transparent;
          border: none;
          color: #5C7568;
          font-size: 11px;
          font-weight: 600;
          padding: 8px 0;
          cursor: pointer;
        }
        .tab-btn.active { color: #4FD195; }
      `}</style>

      <div className="topbar">
        <div className="topbar-eyebrow">UTI · Herramientas clínicas</div>
        <div className="topbar-title">Diluciones & Goteo</div>
        <div className="topbar-sub">Calculadora para enfermería de terapia intensiva</div>
      </div>

      <div className="content">
        {tab === "goteo" ? <Goteo /> : <Diluciones />}
      </div>

      <div className="tabbar">
        <button className={`tab-btn ${tab === "goteo" ? "active" : ""}`} onClick={() => setTab("goteo")}>
          <Droplet size={20} />
          Goteo
        </button>
        <button className={`tab-btn ${tab === "diluciones" ? "active" : ""}`} onClick={() => setTab("diluciones")}>
          <Activity size={20} />
          Diluciones
        </button>
      </div>
    </div>
  );
}
