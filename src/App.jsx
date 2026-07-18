import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Droplet, Activity, ChevronDown, AlertCircle, AlertTriangle, RotateCcw, Wind, Home, Scale, Trash2 } from "lucide-react";

// Escala global de la interfaz para el uso real en el teléfono (todo se veía
// muy chico en el PWA instalado). Subí o bajá este número para agrandar o
// achicar TODA la app de forma uniforme. 1.18 = +18%. Ver el useEffect de
// escalado de viewport más abajo para el detalle de cómo se aplica.
const ESCALA_UI = 1.08;

const DROGAS = [
  "Adrenalina",
  "Amiodarona",
  "Atracurio",
  "Dexmedetomidina",
  "Diclofenac",
  "Dobutamina",
  "Dopamina",
  "Fenilefrina",
  "Fentanilo",
  "Furosemida",
  "Haloperidol",
  "Heparina sódica",
  "Hidrocortisona",
  "Insulina corriente",
  "Ketamina",
  "Ketorolac",
  "Lidocaína",
  "Midazolam",
  "Morfina",
  "Nitroglicerina",
  "Nitroprusiato",
  "Noradrenalina",
  "Propofol",
  "Remifentanilo",
  "Tramadol",
  "Vasopresina",
  "Otra / sin nombre",
];

// Drogas vasoactivas de muy alto riesgo: un error de dosis puede comprometer
// la vida del paciente rápidamente. Se resaltan en rojo en el selector.
const DROGAS_ALTO_RIESGO = ["Adrenalina", "Noradrenalina", "Dobutamina", "Dopamina", "Nitroglicerina", "Nitroprusiato", "Amiodarona", "Vasopresina", "Fenilefrina"];
const DROGAS_OPIOIDES = ["Morfina", "Fentanilo", "Tramadol", "Remifentanilo"];
const DROGAS_BLOQUEANTES_NM = ["Atracurio"];

// Referencias de dosis máxima habitual, basadas en ficha técnica AEMPS y
// consenso de medicina crítica. No reemplazan el protocolo institucional.
// "techo" = false: drogas tituladas a efecto, sin techo diario fijo real.
const DOSIS_REFERENCIA = {
  "Noradrenalina": {
    techo: false,
    grupo: "Catecolamina · Vasopresor",
    grupoRojo: true,
    presentaciones: ["Ampolla 4 mg/4 ml."],
    ampolla: { cantidad: 4, ml: 4 },
    unidadRef: "mcg/kg/min",
    umbralAlerta: 3,
    texto: "Sin máximo absoluto fijo. Ficha técnica: 0,5–1 mcg/kg/min en shock séptico. En shock refractario se han usado dosis mayores (hasta 3 mcg/kg/min) bajo monitorización estrecha.",
    escenarios: [
      { titulo: "Infusión continua", items: ["Habitual: 0,5–1 mcg/kg/min (shock séptico)", "Excepcional: hasta 3 mcg/kg/min en shock refractario, bajo monitorización estrecha"] },
    ],
  },
  "Adrenalina": {
    techo: false,
    grupo: "Catecolamina · Vasopresor · Inotrópico",
    grupoRojo: true,
    presentaciones: ["Ampolla 1 mg/1 ml."],
    ampolla: { cantidad: 1, ml: 1 },
    unidadRef: "mcg/kg/min",
    umbralAlerta: 5,
    texto: "En PCR: 1 mg IV en bolo cada 3-5 min. En shock anafiláctico: 0,5 mg IM, repetible hasta 3 dosis. En infusión continua (shock/soporte hemodinámico): 0,1-1 mcg/kg/min, con dosis de hasta 5 mcg/kg/min en casos refractarios bajo monitorización estrecha.",
    escenarios: [
      { titulo: "PCR", items: ["1 mg IV", "cada 3–5 min"] },
      { titulo: "Shock anafiláctico", items: ["0,5 mg IM", "hasta 3 dosis"] },
      { titulo: "Infusión continua", items: ["Habitual: 0,1–1 mcg/kg/min", "Excepcional: hasta 5 mcg/kg/min, bajo monitorización estrecha"] },
    ],
  },
  "Dopamina": {
    techo: true,
    grupo: "Catecolamina · Inotrópico · Vasopresor",
    grupoRojo: true,
    presentaciones: ["Ampolla 200 mg/5 ml (también existen 100 mg y 400 mg)."],
    ampolla: { cantidad: 200, ml: 5 },
    unidadRef: "mcg/kg/min",
    techoValor: 50,
    texto: "Dosis máxima recomendada: 20 mcg/kg/min. En situaciones graves se han administrado hasta 50 mcg/kg/min, vigilando diuresis de cerca.",
    escenarios: [
      { titulo: "Infusión continua", items: ["Máximo recomendado: 20 mcg/kg/min", "Excepcional: hasta 50 mcg/kg/min en situaciones graves, vigilando diuresis de cerca"] },
    ],
  },
  "Dobutamina": {
    techo: true,
    grupo: "Inotrópico simpaticomimético",
    grupoRojo: true,
    presentaciones: ["Ampolla 250 mg/20 ml."],
    ampolla: { cantidad: 250, ml: 20 },
    unidadRef: "mcg/kg/min",
    techoValor: 20,
    texto: "Dosis máxima habitual: 20 mcg/kg/min en soporte hemodinámico. En protocolos de ecocardiografía de estrés se llega a 40-50 mcg/kg/min, pero es otro uso.",
    escenarios: [
      { titulo: "Soporte hemodinámico", items: ["Máximo habitual: 20 mcg/kg/min"] },
      { titulo: "Ecocardiografía de estrés (otro uso)", items: ["40–50 mcg/kg/min, protocolo específico"] },
    ],
  },
  "Nitroglicerina": {
    techo: true,
    grupo: "Vasodilatador periférico",
    grupoRojo: true,
    presentaciones: ["Ampolla 25 mg/5 ml."],
    ampolla: { cantidad: 25, ml: 5 },
    unidadRef: "mcg/min",
    techoValor: 400,
    texto: "Dosis usual: 10–200 mcg/min. En algunos contextos quirúrgicos se han usado 400 mcg/min o más, siempre bajo monitorización de PA.",
    escenarios: [
      { titulo: "Infusión continua", items: ["Habitual: 10–200 mcg/min", "Excepcional: hasta 400 mcg/min o más en contexto quirúrgico, bajo monitorización de PA"] },
    ],
  },
  "Nitroprusiato": {
    techo: false,
    grupo: "Vasodilatador periférico",
    grupoRojo: true,
    presentaciones: ["Frasco-ampolla 50 mg (liofilizado, a reconstituir)."],
    ampolla: { cantidad: 50, ml: 2 },
    unidadRef: "mcg/kg/min",
    umbralAlerta: 10,
    texto: "Dosis usual: 0,3–3 mcg/kg/min, titulando según respuesta de PA. Umbral de alerta: 10 mcg/kg/min — dosis máxima admitida solo por períodos muy breves (no más de 10 min), por riesgo de toxicidad por cianuro/tiocianato. Uso prolongado (>72h) o a dosis altas requiere monitorización de niveles de tiocianato, especialmente en insuficiencia renal/hepática. Proteger de la luz durante la infusión.",
    escenarios: [
      { titulo: "Infusión continua", items: ["Habitual: 0,3–3 mcg/kg/min, titulando según PA", "Umbral de alerta: 10 mcg/kg/min, solo por períodos muy breves (no más de 10 min)"] },
      { titulo: "Riesgo de toxicidad", items: ["Por cianuro/tiocianato si se sostiene dosis alta", "Uso prolongado (>72h) requiere monitorización de tiocianato, sobre todo en insuficiencia renal/hepática"] },
      { titulo: "Cuidado en la administración", items: ["Proteger de la luz durante toda la infusión"] },
    ],
  },
  "Midazolam": {
    techo: false,
    grupo: "Benzodiacepina · Sedante-Hipnótico · Amnésico · Ansiolítico · Anticonvulsivante",
    presentaciones: ["Ampolla 15 mg/3 ml."],
    ampolla: { cantidad: 15, ml: 3 },
    unidadRef: "mg/kg/h",
    umbralAlerta: 3,
    texto: "Sin máximo diario fijo: se titula según escala de sedación (Ramsay/RASS). Mantenimiento habitual en UCI: 0,03–0,2 mg/kg/h.",
    notaExtraordinaria: "En sedación profunda por SDRA grave (ej. pandemia COVID-19), protocolos de cuidados críticos describieron rangos excepcionales de 0,2–1 mg/kg/h, con casos puntuales hasta 3 mg/kg/h. No es un uso habitual: requiere monitorización estrecha y justificación clínica específica.",
  },
  "Morfina": {
    techo: false,
    grupo: "Opioide fuerte",
    grupoVioleta: true,
    presentaciones: ["Ampolla 10 mg/1 ml."],
    ampolla: { cantidad: 10, ml: 1 },
    unidadRef: "mg/h",
    umbralAlerta: 10,
    texto: "Sin máximo diario fijo establecido: se titula a la respuesta analgésica. Infusión continua: ritmo inicial habitual 0,8–10 mg/h, ajustando según respuesta. En dolor especialmente intenso se han reportado velocidades mayores bajo monitorización estrecha.",
  },
  "Fentanilo": {
    techo: false,
    grupo: "Opioide fuerte",
    grupoVioleta: true,
    presentaciones: ["Ampolla 250 mcg/5 ml."],
    unidadPreparacion: "mcg",
    ampolla: { cantidad: 250, ml: 5 },
    unidadRef: "mcg/kg/h",
    umbralAlerta: 30,
    texto: "Sin máximo diario establecido: se titula a la respuesta analgésica/sedante. Infusión habitual en UCI: 0,5–10 mcg/kg/h según protocolo.",
    notaExtraordinaria: "En sedación profunda por SDRA grave (ej. pandemia COVID-19), se describieron rangos excepcionales de 5–20 mcg/kg/h, con casos muy seleccionados hasta 30 mcg/kg/h. No es un uso habitual: requiere monitorización estrecha y justificación clínica específica.",
  },
  "Insulina corriente": {
    techo: false,
    grupo: "Hipoglucemiante · Hormona",
    presentaciones: ["Frasco-ampolla 1000 UI/10 ml."],
    unidadPreparacion: "UI",
    ampolla: { cantidad: 100, ml: 1 },
    texto: "Sin techo fijo: se titula contra glucemias horarias según protocolo institucional (ej. esquema tipo Yale). El bolo y la velocidad inicial dependen del valor de glucemia.",
  },
  "Furosemida": {
    techo: true,
    grupo: "Diurético de asa",
    presentaciones: ["Ampolla 20 mg/2 ml."],
    ampolla: { cantidad: 20, ml: 2 },
    unidadRef: "mg/día",
    techoValor: 1500,
    texto: "Dosis máxima diaria recomendada: 1500 mg/día en adultos (ficha técnica). Velocidad de infusión: no superar 4 mg/min.",
  },
  "Propofol": {
    techo: true,
    grupo: "Hipnótico · Sedante",
    presentaciones: ["Frasco 200 mg/20 ml.", "Frasco 500 mg/50 ml."],
    ampolla: { cantidad: 200, ml: 20 },
    unidadRef: "mg/kg/h",
    techoValor: 4,
    texto: "Dosis máxima recomendada en sedación de UCI: 4 mg/kg/h (límite de seguridad FDA por riesgo de síndrome de infusión por propofol/PRIS). Ficha técnica europea admite hasta 9 mg/kg/h, pero el consenso de seguridad en UCI es no superar 4.",
  },
  "Atracurio": {
    techo: true,
    grupo: "Bloqueante neuromuscular",
    presentaciones: ["Ampolla 50 mg/5 ml."],
    ampolla: { cantidad: 50, ml: 5 },
    unidadRef: "mg/kg/h",
    techoValor: 0.78,
    texto: "Mantenimiento habitual en UCI: 0,3–0,6 mg/kg/h (hasta 0,65-0,78 mg/kg/h según ficha técnica). Se titula contra monitorización de bloqueo neuromuscular (TOF), no contra un techo fijo.",
  },
  "Amiodarona": {
    techo: true,
    grupo: "Antiarrítmico",
    grupoRojo: true,
    presentaciones: ["Ampolla 150 mg/3 ml."],
    ampolla: { cantidad: 150, ml: 3 },
    unidadRef: "mg/día",
    techoValor: 1200,
    texto: "Dosis máxima diaria: 1200 mg/24h. Mantenimiento habitual 10-20 mg/kg/24h (600-800 mg/día). Protocolo de infusión habitual (arritmia/FA): carga 150 mg IV en 10 min, seguida de infusión 1 mg/min durante 6h y luego 0,5 mg/min durante 18h.",
    escenarios: [
      { titulo: "Infusión rápida (primeras 6h)", items: ["1 mg/min (equivale a 60 mg/h)"] },
      { titulo: "Infusión de mantenimiento (18h siguientes)", items: ["0,5 mg/min (equivale a 30 mg/h)"] },
      { titulo: "Techo diario", items: ["Máximo 1200 mg/24h", "Mantenimiento habitual: 600-800 mg/día"] },
    ],
  },
  "Haloperidol": {
    techo: true,
    grupo: "Antipsicótico",
    presentaciones: ["Ampolla 5 mg/1 ml."],
    ampolla: { cantidad: 5, ml: 1 },
    unidadRef: "mg/día",
    techoValor: 20,
    texto: "Máximo habitual en delirio de UCI: 20 mg/24h IV. En delirium refractario, bajo monitorización estrecha del QT, algunos esquemas excepcionales llegan a dosis mayores.",
  },
  "Hidrocortisona": {
    techo: true,
    grupo: "Corticoide",
    presentaciones: ["Ampolla/vial 100 mg."],
    unidadRef: "mg/día",
    techoValor: 1000,
    usaFrecuencia: true,
    texto: "En shock séptico: dosis habitual 200 mg/día (Surviving Sepsis Campaign). Ficha técnica AEMPS: dosis inicial 100-500 mg, repetible cada 2-4-6h según respuesta, sin superar 6 g/día (uso general). En la práctica de UTI, dosis de 500-1000 mg/día pueden emplearse durante 24-72h en situaciones específicas bajo monitoreo intensivo, sin ser una dosis máxima fija.",
  },
  "Diclofenac": {
    techo: true,
    grupo: "AINE",
    grupoVioleta: true,
    presentaciones: ["Ampolla 75 mg/3 ml."],
    ampolla: { cantidad: 75, ml: 3 },
    unidadRef: "mg/día",
    techoValor: 150,
    tieneAmbosModos: true,
    texto: "Dosis máxima diaria: 150 mg/día. Dolor postoperatorio: 75 mg en infusión durante 30-120 min, pudiendo repetirse a las 4-6h. También se ha usado en infusión continua de mantenimiento ~5 mg/h tras la dosis de carga. No administrar en bolo IV directo; período máximo de uso parenteral: 2 días, luego pasar a vía oral.",
  },
  "Ketorolac": {
    techo: true,
    grupo: "AINE",
    grupoVioleta: true,
    presentaciones: ["Ampolla 30 mg/1 ml."],
    ampolla: { cantidad: 30, ml: 1 },
    unidadRef: "mg/día",
    techoValor: 120,
    tieneAmbosModos: true,
    texto: "Dosis máxima diaria: 120 mg/día (60 mg/día en adultos mayores o insuficiencia renal). Bolo: 30 mg cada 6h. Infusión continua: 30 mg en bolo seguido de hasta 5 mg/h. Tratamiento no debe exceder los 2-4 días.",
  },
  "Tramadol": {
    techo: true,
    grupo: "Opioide débil",
    grupoVioleta: true,
    presentaciones: ["Ampolla 100 mg/2 ml."],
    ampolla: { cantidad: 100, ml: 2 },
    unidadRef: "mg/día",
    techoValor: 400,
    tieneAmbosModos: true,
    texto: "Dosis máxima diaria: 400 mg/día. Se usa tanto en bolos (50-100 mg cada 6-8h) como en infusión continua de mantenimiento, con esquemas reportados desde 12-15 mg/h hasta dosis de carga de 100mg seguida de 12-24 mg/h, sin superar el máximo diario.",
  },
  "Lidocaína": {
    techo: true,
    grupo: "Anestésico local · Antiarrítmico",
    grupoRojo: true,
    presentaciones: ["Ampolla 100 mg/5 ml (2%)."],
    ampolla: { cantidad: 100, ml: 5 },
    unidadRef: "mg/min",
    umbralAlerta: 4,
    texto: "Como antiarrítmico, infusión de mantenimiento: 1-4 mg/min. Máximo orientativo cercano a 300 mg/kg en un adulto de 70kg. Bolos de rescate hasta 200-300 mg en 1 hora si el efecto es insuficiente.",
  },
  "Heparina sódica": {
    techo: false,
    grupo: "Anticoagulante",
    presentaciones: ["Frasco-ampolla 25.000 UI/5 ml."],
    unidadPreparacion: "UI",
    ampolla: { cantidad: 25000, ml: 5 },
    texto: "No tiene un techo de UI/h fijo: se titula contra el KPTT del paciente, objetivo habitual 1,5-2 veces el valor basal. Esquema típico: bolo 80-100 UI/kg, mantenimiento 18 UI/kg/h, con ajuste según control de laboratorio.",
  },
  "Fenilefrina": {
    techo: true,
    grupo: "Vasopresor alfa-1 puro",
    grupoRojo: true,
    presentaciones: ["Ampolla 10 mg/1 ml."],
    ampolla: { cantidad: 10, ml: 1 },
    unidadRef: "mcg/min",
    techoValor: 180,
    texto: "Ficha técnica AEMPS: perfusión continua inicial 25-50 mcg/min, rango efectivo habitual 25-100 mcg/min, titulando según PA sistólica. Vademecum cita una velocidad máxima orientativa de 180 mcg/min, reduciendo según respuesta a 30-60 mcg/min. No es de primera línea en shock séptico (SSC prioriza noradrenalina); su uso principal es como rescate cuando hay arritmias asociadas a noradrenalina o gasto cardíaco alto con hipotensión.",
    escenarios: [
      { titulo: "Infusión continua", items: ["Inicial: 25-50 mcg/min", "Habitual: 25-100 mcg/min", "Máximo orientativo: 180 mcg/min"] },
    ],
  },
  "Vasopresina": {
    techo: true,
    grupo: "Vasopresor · Hormona antidiurética",
    grupoRojo: true,
    presentaciones: ["Ampolla/concentrado 20 UI/1 ml (ej. Empressin)."],
    unidadPreparacion: "UI",
    ampolla: { cantidad: 20, ml: 1 },
    unidadRef: "UI/min",
    techoValor: 0.04,
    texto: "Ficha técnica AEMPS y ensayo VASST: en shock séptico se usa a dosis baja y fija, 0,01-0,03 UI/min, sin necesidad de titular según PAM como los demás vasopresores (a diferencia de noradrenalina/adrenalina). Dosis por encima de este rango no han mostrado mayor beneficio hemodinámico y sí más riesgo de isquemia. Uso exclusivo por vía central.",
    escenarios: [
      { titulo: "Infusión continua (shock séptico)", items: ["Dosis fija habitual: 0,01-0,03 UI/min", "No se titula por PAM como los demás vasopresores"] },
    ],
  },
  "Remifentanilo": {
    techo: false,
    grupo: "Opioide fuerte de acción ultracorta",
    grupoVioleta: true,
    presentaciones: ["Vial 2 mg polvo para reconstituir (concentrado para perfusión)."],
    ampolla: { cantidad: 2, ml: 1 },
    unidadRef: "mcg/kg/min",
    umbralAlerta: 0.2,
    texto: "Ficha técnica AEMPS (sedoanalgesia en UCI con ventilación mecánica): velocidad inicial 0,1-0,15 mcg/kg/min, ajustando en incrementos de 0,025 mcg/kg/min cada 5 min como mínimo. Si se alcanza 0,2 mcg/kg/min sin sedación adecuada, la ficha técnica recomienda sumar un sedante en vez de seguir escalando. Su vida media ultracorta (5-10 min) hace que no quede actividad opioide residual al suspenderlo.",
    escenarios: [
      { titulo: "Infusión continua (UCI, ventilación mecánica)", items: ["Inicial: 0,1-0,15 mcg/kg/min", "Ajuste: incrementos de 0,025 mcg/kg/min cada ≥5 min", "Umbral: 0,2 mcg/kg/min (agregar sedante en vez de seguir escalando)"] },
    ],
  },
  "Dexmedetomidina": {
    techo: true,
    grupo: "Sedante alfa-2 agonista",
    presentaciones: ["Ampolla/vial 200 mcg/2 ml."],
    unidadPreparacion: "mcg",
    ampolla: { cantidad: 200, ml: 2 },
    unidadRef: "mcg/kg/h",
    techoValor: 1.4,
    texto: "Ficha técnica AEMPS (sedación UCI, RASS 0 a -3): velocidad inicial 0,7 mcg/kg/h, ajuste dentro del rango 0,2-1,4 mcg/kg/h según respuesta. Dosis máxima formal: 1,4 mcg/kg/h; si no se logra sedación adecuada a dosis máxima, cambiar a otro sedante. No se recomienda dosis de carga en UCI (se asocia a más efectos adversos).",
    escenarios: [
      { titulo: "Infusión continua", items: ["Inicial: 0,7 mcg/kg/h", "Rango de ajuste: 0,2-1,4 mcg/kg/h", "Máximo: 1,4 mcg/kg/h"] },
    ],
  },
  "Ketamina": {
    techo: true,
    grupo: "Anestésico disociativo · Analgésico adyuvante",
    presentaciones: ["Ampolla 500 mg/10 ml."],
    ampolla: { cantidad: 500, ml: 10 },
    unidadRef: "mg/kg/h",
    techoValor: 0.4,
    texto: "Como analgésico adyuvante en UCI de adultos (revisión Clínica Las Condes): dosis inicial 0,1-0,5 mg/kg IV, seguida de infusión continua 0,05-0,4 mg/kg/h.",
    notaExtraordinaria: "En protocolos de sedoanalgesia combinada con propofol (uso más frecuente en series pediátricas/UCIP), se han descrito dosis de inicio de 1 mg/kg/h con máximos de hasta 1,5-2 mg/kg/h bajo monitorización estrecha. No es la dosis habitual del uso analgésico adyuvante en adultos: requiere protocolo específico y justificación clínica.",
    escenarios: [
      { titulo: "Uso analgésico adyuvante (adultos)", items: ["Inicial: 0,1-0,5 mg/kg en bolo", "Mantenimiento: 0,05-0,4 mg/kg/h"] },
    ],
  },
};

// Unidades de dosis seleccionables por droga en el calculador de infusión
// continua (Diluciones). El primer elemento de cada array es el default que
// se fija automáticamente al elegir la droga (cambiarDroga). El resto son
// alternativas válidas que el usuario puede elegir manualmente (ej. algunas
// instituciones prescriben Amiodarona en mg/h en vez de mg/min).
// "gamas" es el código interno para mcg/kg/min (nombre clínico coloquial).
// Drogas que no aparecen acá (bolo/frecuencia como Hidrocortisona, o las que
// usan tieneAmbosModos) resuelven su propio flujo por fuera de este mapa.
const UNIDADES_POR_DROGA = {
  "Noradrenalina": ["gamas"],
  "Adrenalina": ["gamas"],
  "Dobutamina": ["gamas"],
  "Dopamina": ["gamas"],
  "Nitroprusiato": ["gamas"],
  "Nitroglicerina": ["mcg/min"],
  "Fenilefrina": ["mcg/min", "gamas"],
  "Vasopresina": ["UI/min", "UI/h"],
  "Amiodarona": ["mg/min", "mg/h"],
  "Lidocaína": ["mg/min"],
  "Morfina": ["mg/h"],
  "Fentanilo": ["mcg/kg/h", "mcg/h"],
  "Remifentanilo": ["gamas"],
  "Midazolam": ["mg/kg/h", "mg/h"],
  "Propofol": ["mg/kg/h"],
  "Dexmedetomidina": ["mcg/kg/h"],
  "Ketamina": ["mg/kg/h"],
  "Atracurio": ["mg/kg/h"],
  "Insulina corriente": ["UI/h"],
  "Heparina sódica": ["UI/kg/h", "UI/h"],
  // Bolo por defecto (modoAdmin="bolo"); si el usuario pasa a "Infusión",
  // mg/h es la unidad con la que se describe su uso continuo en la práctica.
  "Diclofenac": ["mg/h"],
  "Ketorolac": ["mg/h"],
  "Tramadol": ["mg/h"],
};

// Etiquetas legibles para cada código de unidad en el selector.
const ETIQUETA_UNIDAD = {
  "gamas": "Gamas (mcg/kg/min)",
  "mcg/min": "mcg/min",
  "mcg/h": "mcg/h",
  "mg/h": "mg/h",
  "mg/min": "mg/min",
  "mg/kg/h": "mg/kg/h",
  "mcg/kg/h": "mcg/kg/h",
  "UI/h": "UI/h",
  "UI/kg/h": "UI/kg/h",
  "UI/min": "UI/min",
};

// Unidades que son "por kg": obligan a pedir y usar el peso del paciente.
const UNIDADES_QUE_REQUIEREN_PESO = ["gamas", "UI/kg/h", "mg/kg/h", "mcg/kg/h"];

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

const Field = React.forwardRef(function Field({ label, unit, value, onChange, onBlur, onKeyDown, enterKeyHint }, ref) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <div className="field-input-wrap">
        <input
          ref={ref}
          className="field-input"
          type="text"
          inputMode="decimal"
          enterKeyHint={enterKeyHint}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
        />
        {unit && <span className="field-unit">{unit}</span>}
      </div>
    </label>
  );
});

function Inicio({ tema, toggleTheme, setTab }) {
  const esOscuro = tema === "dark";
  return (
    <div className="panel inicio-panel">
      <div className="inicio-saludo">
        <div className="inicio-saludo-titulo">¡Hola, colega! 👋</div>
        <div className="inicio-saludo-sub">¿Qué herramientas necesitás hoy?</div>
      </div>

      <div className="inicio-seccion">
        <div className="inicio-seccion-titulo">ACCESOS DIRECTOS</div>
        <button type="button" className="inicio-row" onClick={() => setTab("diluciones")}>
          <span className="inicio-row-icon">💉</span>
          <span className="inicio-row-label">Calculadora de Diluciones</span>
          <ChevronDown size={16} className="inicio-row-chevron" />
        </button>
        <button type="button" className="inicio-row" onClick={() => setTab("balance")}>
          <span className="inicio-row-icon">⚖️</span>
          <span className="inicio-row-label">Calculadora Balance Hídrico</span>
          <ChevronDown size={16} className="inicio-row-chevron" />
        </button>
        <button type="button" className="inicio-row" onClick={() => setTab("pafi")}>
          <span className="inicio-row-icon">🫁</span>
          <span className="inicio-row-label">Calculadora PAFI (Berlín 2012)</span>
          <ChevronDown size={16} className="inicio-row-chevron" />
        </button>
        <button type="button" className="inicio-row" onClick={() => setTab("goteo")}>
          <span className="inicio-row-icon">💧</span>
          <span className="inicio-row-label">Cálculo de Goteo / Tiempo</span>
          <ChevronDown size={16} className="inicio-row-chevron" />
        </button>
      </div>

      <div className="inicio-seccion">
        <div className="inicio-seccion-titulo">INTERFAZ Y CONFIGURACIÓN</div>
        <div className="inicio-row inicio-row-switch">
          <span className="inicio-row-icon">{esOscuro ? "🌙" : "☀️"}</span>
          <span className="inicio-row-label">Activar modo noche</span>
          <button
            type="button"
            onClick={toggleTheme}
            className={`theme-switch-btn ${esOscuro ? "is-dark" : "is-light"}`}
            aria-label="Cambiar entre modo claro y oscuro"
          >
            <div className="theme-switch-knob" />
          </button>
        </div>
      </div>

      <div className="inicio-footer">
        Calculadora Clínica v2.0<br />
        Desarrollada por Reparaciones Keroo PC
        <div className="inicio-footer-links">
          <a href="https://instagram.com/keroo_reparacionespc" target="_blank" rel="noopener noreferrer" className="inicio-footer-link">
            Instagram
          </a>
          <span className="inicio-footer-sep">·</span>
          <a href="mailto:reparacioneskeroo@outlook.com" className="inicio-footer-link">
            Correo
          </a>
        </div>
      </div>
    </div>
  );
}

function PaFi() {
  const [pao2, setPao2] = useState("");
  const [fio2Pct, setFio2Pct] = useState("");

  const resultado = useMemo(() => {
    const pao2Val = num(pao2);
    const fio2PctVal = num(fio2Pct);
    if (!pao2Val || pao2Val <= 0 || !fio2PctVal || fio2PctVal <= 0) return null;
    // FiO2 se ingresa en % (ej. 40) y se convierte a decimal (0.4) para
    // la fórmula clásica PaFi = PaO2 / FiO2(decimal). FiO2 nunca debería
    // superar 100% (aire ambiente = 21%, oxígeno puro = 100%).
    const fio2Decimal = Math.min(fio2PctVal, 100) / 100;
    const pafi = pao2Val / fio2Decimal;

    let categoria, colorClass;
    if (pafi > 300) {
      categoria = "Sin criterio de SDRA (oxigenación normal o casi normal)";
      colorClass = "pafi-normal";
    } else if (pafi > 200) {
      categoria = "SDRA leve";
      colorClass = "pafi-leve";
    } else if (pafi > 100) {
      categoria = "SDRA moderado";
      colorClass = "pafi-moderado";
    } else {
      categoria = "SDRA severo";
      colorClass = "pafi-severo";
    }

    return { valor: pafi, categoria, colorClass };
  }, [pao2, fio2Pct]);

  return (
    <div className="panel">
      <div className="panel-row">
        <Field label="PaO₂ (gasometría arterial)" unit="mmHg" value={pao2} onChange={setPao2} placeholder="ej: 80" />
      </div>
      <div className="panel-row">
        <Field label="FiO₂" unit="%" value={fio2Pct} onChange={setFio2Pct} placeholder="ej: 40" />
      </div>

      {resultado ? (
        <>
          <div className="result-main">
            <span className="result-main-value">{fmtDosis(resultado.valor, 0)}</span>
            <span className="result-main-unit">PaO₂/FiO₂</span>
          </div>
          <div className={`pafi-categoria ${resultado.colorClass}`}>
            {resultado.categoria}
          </div>
        </>
      ) : (
        <div className="result-empty">
          Completá PaO₂ y FiO₂ para calcular la relación PaFi.
        </div>
      )}

      <div className="ref-dosis">
        <div className="ref-dosis-titulo">Clasificación de gravedad (Definición de Berlín, 2012)</div>
        <div className="ref-dosis-escenarios">
          <div className="ref-dosis-escenario">
            <ul className="ref-dosis-escenario-lista">
              <li>PaFi &gt; 300: sin criterio de SDRA</li>
              <li>PaFi 201–300: <strong>SDRA leve</strong></li>
              <li>PaFi 101–200: <strong>SDRA moderado</strong></li>
              <li>PaFi ≤ 100: <strong>SDRA severo</strong></li>
            </ul>
          </div>
        </div>
        <div className="ref-dosis-texto" style={{ marginTop: 8 }}>
          Esta clasificación asume ventilación con PEEP/CPAP ≥ 5 cmH₂O. Fuente: ARDS Definition Task Force, JAMA 2012 (Definición de Berlín).
        </div>
      </div>
    </div>
  );
}

function Diluciones() {
  const [droga, setDroga] = useState(DROGAS[0]);
  const [dropdownDrogaAbierto, setDropdownDrogaAbierto] = useState(false);
  const dropdownDrogaRef = useRef(null);
  const dropdownScrollRef = useRef(null);
  const resultadoRef = useRef(null);

  useEffect(() => {
    if (dropdownDrogaAbierto && dropdownScrollRef.current) {
      const activo = dropdownScrollRef.current.querySelector(".dropdown-custom-item-activo");
      if (activo) {
        activo.scrollIntoView({ block: "center" });
      }
    }
  }, [dropdownDrogaAbierto]);

  // Al cerrar el teclado (blur del campo de peso), Safari/iOS no reajusta
  // el scroll automáticamente: la página queda en la posición que tenía
  // con el teclado abierto, dejando el resultado fuera de vista arriba.
  // Usamos un delay más largo (450ms) para esperar a que la animación de
  // cierre del teclado termine y el viewport real se redimensione, y
  // calculamos la posición manualmente en vez de depender de scrollIntoView,
  // que puede medir mal mientras el layout todavía está en transición.
  const handleBlurPeso = () => {
    setTimeout(() => {
      if (resultadoRef.current) {
        const rect = resultadoRef.current.getBoundingClientRect();
        const offsetDestino = window.scrollY + rect.top - 90;
        window.scrollTo({ top: offsetDestino, behavior: "smooth" });
      }
    }, 450);
  };

  useEffect(() => {
    if (!dropdownDrogaAbierto) return;
    const handleClickFuera = (e) => {
      if (dropdownDrogaRef.current && !dropdownDrogaRef.current.contains(e.target)) {
        setDropdownDrogaAbierto(false);
      }
    };
    document.addEventListener("mousedown", handleClickFuera);
    document.addEventListener("touchstart", handleClickFuera);
    return () => {
      document.removeEventListener("mousedown", handleClickFuera);
      document.removeEventListener("touchstart", handleClickFuera);
    };
  }, [dropdownDrogaAbierto]);

  const [dosisMg, setDosisMg] = useState("");
  const [volumenMl, setVolumenMl] = useState("100");
  const [pesoKg, setPesoKg] = useState("");
  const [sinDiluir, setSinDiluir] = useState(false);
  const [numAmpollas, setNumAmpollas] = useState("");

  // dirección: "dosis-a-mlh" (parto de la dosis indicada y calculo ml/h)
  //            "mlh-a-dosis" (parto de ml/h ya cargado y calculo qué dosis equivale)
  const [direccion, setDireccion] = useState("mlh-a-dosis");

  const [dosisPrescrita, setDosisPrescrita] = useState("");
  const [mlhCargado, setMlhCargado] = useState("");
  const [unidadDosis, setUnidadDosis] = useState("gamas");

  const necesitaPeso = UNIDADES_QUE_REQUIEREN_PESO.includes(unidadDosis);
  const unidadPrep = DOSIS_REFERENCIA[droga]?.unidadPreparacion || "mg";
  const esUI = unidadPrep === "UI";
  const unidadRefDroga = DOSIS_REFERENCIA[droga]?.unidadRef;
  const refNecesitaPeso = unidadRefDroga ? unidadRefDroga.includes("/kg/") : false;
  // Drogas que clínicamente se administran en bolos intermitentes (no en
  // infusión continua titulada): para estas no tiene sentido calcular ml/h,
  // se calcula en su lugar la dosis diaria total a partir de dosis por toma
  // + frecuencia.
  const tieneAmbosModos = !!DOSIS_REFERENCIA[droga]?.tieneAmbosModos;
  const [modoAdmin, setModoAdmin] = useState("bolo");
  const usaFrecuencia = !!DOSIS_REFERENCIA[droga]?.usaFrecuencia || (tieneAmbosModos && modoAdmin === "bolo");
  const [dosisPorToma, setDosisPorToma] = useState("");
  const [frecuencia, setFrecuencia] = useState("cada-8h");
  const [presetSuero, setPresetSuero] = useState("100");
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

  // Nota: antes había un useEffect([esUI]) que reconciliaba unidadDosis al
  // cambiar entre drogas UI y no-UI, pero solo cubría esa transición (dejaba
  // una unidad vieja "pegada" al cambiar entre dos drogas del mismo tipo,
  // ej. Noradrenalina -> Dobutamina). Ahora cambiarDroga fija explícitamente
  // la unidad correcta para CADA droga (ver UNIDADES_POR_DROGA), así que ese
  // efecto ya no hace falta y se retira.

  const resultado = useMemo(() => {
    const cantidad = num(dosisMg);
    const volSuero = num(volumenMl);
    const peso = num(pesoKg);

    if (!cantidad || !volSuero || cantidad <= 0 || volSuero <= 0) return null;

    // Volumen real de la mezcla para calcular la concentración: el volumen
    // de suero (diluyente) cargado, MÁS el volumen físico que agregan las
    // propias ampollas del fármaco. En "sin diluir" no se suma (ahí
    // volumenMl ya es el volumen puro de las ampollas, sin diluyente
    // aparte, y sumarlo de nuevo lo contaría dos veces).
    //
    // Bug real encontrado y confirmado con Irvin (caso Atracurio: 500mg en
    // "100 ml" de suero + 10 ampollas de 5 ml = 50 ml de droga -> el volumen
    // real en la bolsa es 150 ml, no 100 ml). Antes el cálculo de ml/h
    // usaba solo el volumen de suero tipeado, ignorando el volumen que
    // agregan las ampollas -> concentración calculada más alta que la real
    // -> ml/h resultante por debajo de lo necesario para la dosis indicada
    // (con 0,786 mg/kg/h en 70kg: daba 11 ml/h en vez de los 16,5 ml/h
    // correctos). El cartel "Volumen total diluido" que ya se mostraba en
    // pantalla SÍ hacía esta cuenta bien; ahora el cálculo usa lo mismo.
    const ampInfo = DOSIS_REFERENCIA[droga]?.ampolla;
    const vol = (!sinDiluir && ampInfo)
      ? volSuero + (cantidad / ampInfo.cantidad) * ampInfo.ml
      : volSuero;

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
        const uiPorHora = unidadDosis === "UI/kg/h" ? dosis * peso : unidadDosis === "UI/min" ? dosis * 60 : dosis;
        const mlPorHora = uiPorHora / concentracion;
        return { concentracionMcgMl: concentracion, mlPorHora, uiPorHora, pesoUsado: peso };
      } else {
        const mlh = num(mlhCargado);
        if (!mlh || mlh <= 0) return { concentracionMcgMl: concentracion, dosisResultante: null };
        if (necesitaPeso && (!peso || peso <= 0)) {
          return { concentracionMcgMl: concentracion, dosisResultante: null, faltaPeso: true };
        }
        const uiPorHora = mlh * concentracion;
        const dosisResultante = unidadDosis === "UI/kg/h" ? uiPorHora / peso : unidadDosis === "UI/min" ? uiPorHora / 60 : uiPorHora;
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
      else if (unidadDosis === "mg/kg/h") mcgPorMin = (dosis * peso * 1000) / 60;
      else if (unidadDosis === "mcg/kg/h") mcgPorMin = (dosis * peso) / 60;
      else if (unidadDosis === "mg/min") mcgPorMin = dosis * 1000;
      else if (unidadDosis === "mcg/h") mcgPorMin = dosis / 60;
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
      else if (unidadDosis === "mg/kg/h") dosisResultante = (mcgPorMin * 60) / 1000 / peso;
      else if (unidadDosis === "mcg/kg/h") dosisResultante = (mcgPorMin * 60) / peso;
      else if (unidadDosis === "mg/min") dosisResultante = mcgPorMin / 1000;
      else if (unidadDosis === "mcg/h") dosisResultante = mcgPorMin * 60;
      else dosisResultante = mcgPorMin;

      return { concentracionMcgMl, dosisResultante, mcgPorMin, pesoUsado: peso };
    }
  }, [dosisMg, volumenMl, pesoKg, dosisPrescrita, mlhCargado, unidadDosis, direccion, necesitaPeso, unidadPrep, esUI, droga, sinDiluir]);

  const reset = () => {
    setDosisMg("");
    setVolumenMl("100");
    setPresetSuero("100");
    setPesoKg("");
    setDosisPrescrita("");
    setMlhCargado("");
    setSinDiluir(false);
    setNumAmpollas("");
    setDosisPorToma("");
  };

  const cambiarDroga = (nuevaDroga) => {
    setDroga(nuevaDroga);
    // Cada droga tiene su propia preparación y dosis: no tiene sentido
    // arrastrar esos valores de una droga a otra. El peso del paciente
    // no depende de la droga, así que ese sí se conserva.
    setDosisMg("");
    setVolumenMl("100");
    setPresetSuero("100");
    setDosisPrescrita("");
    setMlhCargado("");
    setNumAmpollas("");
    setDosisPorToma("");
    setModoAdmin("bolo");
    // Antes se apagaba "sin diluir" solo si la droga nueva no tenía datos de
    // ampolla (DOSIS_REFERENCIA[...].ampolla) — pero ese campo existe para casi
    // todas las drogas (se usa también para el cartel de presentación), no solo
    // para las 4 que admiten "sin diluir". Eso podía dejar el casillero marcado
    // sin que el usuario lo tildara al volver a una droga de la lista. Ahora se
    // apaga correctamente salvo que la droga nueva esté en DROGAS_SIN_DILUIR.
    if (!DROGAS_SIN_DILUIR.includes(nuevaDroga)) {
      setSinDiluir(false);
    }
    // Auto-configuración al elegir droga: la app arranca directamente en
    // "Dosis → ml/h" (el flujo real de uso: el médico/enfermero ya sabe qué
    // dosis necesita el paciente y quiere el ml/h para cargar en la bomba),
    // con la unidad de dosis correcta pre-seleccionada según la droga. Antes
    // esto se reconciliaba a medias con un useEffect frágil que solo cubría
    // la transición UI/no-UI; ahora queda resuelto acá, para cualquier droga.
    setDireccion("dosis-a-mlh");
    const unidadesDisponibles = UNIDADES_POR_DROGA[nuevaDroga];
    if (unidadesDisponibles && unidadesDisponibles.length > 0) {
      setUnidadDosis(unidadesDisponibles[0]);
    }
  };

  // Al cambiar el sentido del cálculo (ml/h<->Dosis), lleva el resultado que
  // la app YA calculó al campo del otro modo, en vez de dejarlo vacío y
  // obligar a retipear/recordar el número (pedido de Irvin, con capturas de
  // ejemplo: Amiodarona 11 ml/h <-> 0,267 mg/min). No es un cambio de
  // fórmula: usa el mismo valor que ya está en pantalla, solo evita perder
  // la cuenta ya hecha al tocar el toggle. Si falta el peso (resultado
  // null/faltaPeso), no hay nada que transferir y el campo queda como está.
  const cambiarDireccion = (nuevaDireccion) => {
    if (nuevaDireccion === direccion) return;
    if (nuevaDireccion === "dosis-a-mlh" && resultado?.dosisResultante != null) {
      setDosisPrescrita(fmtDosis(resultado.dosisResultante, 3));
    } else if (nuevaDireccion === "mlh-a-dosis" && resultado?.mlPorHora != null) {
      setMlhCargado(fmtDosis(resultado.mlPorHora, 2));
    }
    setDireccion(nuevaDireccion);
  };


  const unidadCompleta = unidadDosis === "gamas" ? "gamas (mcg/kg/min)" : unidadDosis;

  // Traduce el valor interno de unidadDosis a la unidad "semántica" real,
  // para poder compararla contra equivalenciaRef.unidad. "gamas" es el
  // nombre clínico coloquial de mcg/kg/min, no una unidad distinta.
  const unidadDosisSemantica = unidadDosis === "gamas" ? "mcg/kg/min" : unidadDosis;

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
      // Solo entran acá las drogas UI que además tienen un unidadRef propio
      // definido (hoy: Vasopresina, con su rango fijo 0,01-0,03 UI/min según
      // AEMPS/VASST). Insulina y Heparina deliberadamente NO tienen
      // unidadRef -> ya cortaron en el chequeo de arriba (!ref.unidadRef) y
      // nunca llegan a este punto, así que siguen sin techo fijo, como
      // corresponde: se titulan contra laboratorio (glucemia, KPTT), no
      // contra un límite farmacológico absoluto.
      const uiPorHora = resultado.uiPorHora;
      if (uiPorHora == null) return null;
      switch (ref.unidadRef) {
        case "UI/min":
          return { valor: uiPorHora / 60, unidad: "UI/min" };
        case "UI/h":
          return { valor: uiPorHora, unidad: "UI/h" };
        case "UI/kg/h":
          if (!peso || peso <= 0) return null;
          return { valor: uiPorHora / peso, unidad: "UI/kg/h" };
        default:
          return null;
      }
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
      case "mg/h":
        return { valor: (mcgPorMin * 60) / 1000, unidad: "mg/h" };
      case "mg/día":
        return { valor: (mcgPorMin * 60 * 24) / 1000, unidad: "mg/día" };
      default:
        return null;
    }
  }, [droga, resultado, esUI, necesitaPeso]);

  return (
    <div className="panel">
      <div className="panel-row">
        <div className="field">
          <span className="field-label">Droga</span>
          <div className="dropdown-custom-wrap" ref={dropdownDrogaRef}>
            <button
              type="button"
              className={`field-select dropdown-custom-trigger ${DROGAS_ALTO_RIESGO.includes(droga) ? "field-select-riesgo" : ""}`}
              onClick={() => setDropdownDrogaAbierto((v) => !v)}
            >
              <span>{droga}</span>
              {DROGAS_ALTO_RIESGO.includes(droga) && <AlertTriangle size={18} className="dropdown-custom-warn" strokeWidth={2} />}
            </button>
            {dropdownDrogaAbierto && (
              <div className="dropdown-custom-list">
                <div className="dropdown-custom-scroll" ref={dropdownScrollRef}>
                  {DROGAS.map((d) => {
                    const esRiesgo = DROGAS_ALTO_RIESGO.includes(d);
                    const esOpioide = DROGAS_OPIOIDES.includes(d);
                    const esBloqueanteNM = DROGAS_BLOQUEANTES_NM.includes(d);
                    return (
                      <button
                        type="button"
                        key={d}
                        className={`dropdown-custom-item ${esRiesgo ? "dropdown-custom-item-riesgo" : ""} ${esOpioide ? "dropdown-custom-item-opioide" : ""} ${esBloqueanteNM ? "dropdown-custom-item-bloqueante" : ""} ${d === droga ? "dropdown-custom-item-activo" : ""}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setDropdownDrogaAbierto(false);
                          cambiarDroga(d);
                        }}
                      >
                        <span>{d}</span>
                        {esRiesgo && <AlertTriangle size={18} className="dropdown-custom-warn" strokeWidth={2} />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {DOSIS_REFERENCIA[droga]?.grupo && (
        <div className={`grupo-farmacologico ${DOSIS_REFERENCIA[droga].grupoRojo ? "grupo-farmacologico-rojo" : ""} ${DOSIS_REFERENCIA[droga].grupoVioleta ? "grupo-farmacologico-violeta" : ""}`}>
          {DOSIS_REFERENCIA[droga].grupo.split(" · ").join(" | ").toUpperCase()}
        </div>
      )}

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

      {tieneAmbosModos && (
        <>
          <div className="section-title">Modo de administración</div>
          <div className="mode-tabs">
            <button className={`mode-tab ${modoAdmin === "bolo" ? "active" : ""}`} onClick={() => setModoAdmin("bolo")}>
              Bolo / dosis reglada
            </button>
            <button className={`mode-tab ${modoAdmin === "infusion" ? "active" : ""}`} onClick={() => setModoAdmin("infusion")}>
              Infusión continua
            </button>
          </div>
        </>
      )}

      {!usaFrecuencia && <div className="section-title">Preparación</div>}

      {!usaFrecuencia && datoAmpolla && (
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

      {!usaFrecuencia && (sinDiluir && datoAmpolla ? (
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
            <Field label="Dosis total" unit={unidadPrep} value={dosisMg} onChange={setDosisMg} placeholder={droga === "Insulina corriente" ? "ej: 100" : droga === "Heparina sódica" ? "ej: 25000" : unidadPrep === "mcg" ? "ej: 750" : "ej: 4"} />
            <label className="field">
              <span className="field-label">Volumen de suero</span>
              <div className="select-wrap">
                <select
                  className="field-select"
                  value={presetSuero}
                  onChange={(e) => {
                    const v = e.target.value;
                    setPresetSuero(v);
                    if (v !== "otro") setVolumenMl(v);
                    else setVolumenMl("");
                  }}
                >
                  <option value="100">100 ml</option>
                  <option value="250">250 ml</option>
                  <option value="500">500 ml</option>
                  <option value="otro">Otro</option>
                </select>
                <ChevronDown size={16} className="select-chevron" />
              </div>
            </label>
          </div>
          {presetSuero === "otro" && (
            <div className="panel-row">
              <Field label="Volumen de suero (manual)" unit="ml" value={volumenMl} onChange={setVolumenMl} placeholder="ej: 220" />
            </div>
          )}
          {(() => {
            const faltaMg = !num(dosisMg) || num(dosisMg) <= 0;
            const faltaVol = !num(volumenMl) || num(volumenMl) <= 0;
            if (!faltaMg && !faltaVol) return null;
            let mensaje;
            if (faltaMg && faltaVol) mensaje = `Falta completar: dosis en ${unidadPrep} y volumen de suero.`;
            else if (faltaMg) mensaje = `Falta completar: dosis en ${unidadPrep}.`;
            else mensaje = "Falta completar: volumen de suero.";
            return <div className="aviso-falta-campo">{mensaje}</div>;
          })()}
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
      ))}

      {usaFrecuencia ? (
        <>
          <div className="section-title">Dosis por toma y frecuencia</div>
          <div className="panel-row two-col">
            <Field label="Dosis por toma" unit={unidadPrep} value={dosisPorToma} onChange={setDosisPorToma} placeholder="ej: 50" />
            <label className="field">
              <span className="field-label">Frecuencia</span>
              <div className="select-wrap">
                <select className="field-select" value={frecuencia} onChange={(e) => setFrecuencia(e.target.value)}>
                  <option value="unica">Dosis única</option>
                  <option value="cada-6h">Cada 6 h</option>
                  <option value="cada-8h">Cada 8 h</option>
                  <option value="cada-12h">Cada 12 h</option>
                  <option value="cada-24h">Cada 24 h</option>
                </select>
                <ChevronDown size={16} className="select-chevron" />
              </div>
            </label>
          </div>

          <div className="result-block">
            {(() => {
              const dosis = num(dosisPorToma);
              if (!dosis || dosis <= 0) {
                return <div className="result-empty">Completá la dosis por toma para ver el total diario.</div>;
              }
              const tomasPorDia = { unica: 1, "cada-6h": 4, "cada-8h": 3, "cada-12h": 2, "cada-24h": 1 }[frecuencia];
              const totalDiario = dosis * tomasPorDia;
              return (
                <>
                  <div className="result-main">
                    <span className="result-main-value">{fmtDosis(totalDiario, 2)}</span>
                    <span className="result-main-unit">{unidadPrep}/día</span>
                  </div>
                  {frecuencia !== "unica" && (
                    <div className="result-line">
                      <span className="result-label">Cálculo</span>
                      <span className="result-value-sm">{fmtDosis(dosis, 2)} {unidadPrep} × {tomasPorDia} tomas/día</span>
                    </div>
                  )}
                </>
              );
            })()}
          </div>

          {(() => {
            // Faltaba esta rama: la alerta de sobredosis de acá abajo ya
            // existía, pero nunca se agregó su contraparte positiva. Reusa
            // exactamente la misma comparación (mismo totalDiario, mismo
            // techo), solo con la condición invertida — no es un cálculo
            // nuevo, es la mitad que faltaba del que ya estaba.
            const dosis = num(dosisPorToma);
            const techo = DOSIS_REFERENCIA[droga]?.techoValor;
            if (!dosis || dosis <= 0 || !techo) return null;
            const tomasPorDia = { unica: 1, "cada-6h": 4, "cada-8h": 3, "cada-12h": 2, "cada-24h": 1 }[frecuencia];
            const totalDiario = dosis * tomasPorDia;
            if (totalDiario > techo) return null;
            return (
              <div className="aviso-rango-ok">
                ✓ Dentro de valores recomendados
              </div>
            );
          })()}

          {(() => {
            const dosis = num(dosisPorToma);
            const techo = DOSIS_REFERENCIA[droga]?.techoValor;
            if (!dosis || dosis <= 0 || !techo) return null;
            const tomasPorDia = { unica: 1, "cada-6h": 4, "cada-8h": 3, "cada-12h": 2, "cada-24h": 1 }[frecuencia];
            const totalDiario = dosis * tomasPorDia;
            if (totalDiario <= techo) return null;
            return (
              <div className="alerta-sobredosis">
                <AlertCircle size={20} />
                <div>
                  <div className="alerta-sobredosis-titulo">⚠ DOSIS SUPERA EL MÁXIMO RECOMENDADO</div>
                  <div className="alerta-sobredosis-texto">
                    {fmtDosis(totalDiario, 2)} {unidadPrep}/día supera el máximo de referencia ({techo} {unidadPrep}/día). Verificá la indicación: puede asociarse a toxicidad grave.
                  </div>
                </div>
              </div>
            );
          })()}
        </>
      ) : (
        <>
          <div className="section-title">¿Qué querés calcular?</div>
          <div className="mode-tabs">
            <button className={`mode-tab ${direccion === "mlh-a-dosis" ? "active" : ""}`} onClick={() => cambiarDireccion("mlh-a-dosis")}>
              ml/h → Dosis
            </button>
            <button className={`mode-tab ${direccion === "dosis-a-mlh" ? "active" : ""}`} onClick={() => cambiarDireccion("dosis-a-mlh")}>
              Dosis → ml/h
            </button>
          </div>

          <div className="panel-row two-col">
            {direccion === "dosis-a-mlh" ? (
              <Field label="Dosis requerida" unit={unidadDosis === "gamas" ? "gamas" : unidadDosis} value={dosisPrescrita} onChange={setDosisPrescrita} placeholder="ej: 0.1" />
            ) : (
              <Field label="Velocidad actual" unit="ml/h" value={mlhCargado} onChange={setMlhCargado} placeholder="ej: 12" />
            )}

            <label className="field">
              <span className="field-label">
                {direccion === "dosis-a-mlh" ? "Unidad de dosis requerida" : "Unidad del resultado"}
              </span>
              <div className="select-wrap">
                <select className="field-select" value={unidadDosis} onChange={(e) => setUnidadDosis(e.target.value)}>
                  {(esUI
                    ? UNIDADES_POR_DROGA[droga] || ["UI/h", "UI/kg/h"]
                    : UNIDADES_POR_DROGA[droga] || ["mg/h", "gamas", "mcg/min"]
                  ).map((u) => (
                    <option key={u} value={u}>{ETIQUETA_UNIDAD[u] || u}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="select-chevron" />
              </div>
            </label>
          </div>

          {necesitaPeso && (
            <div className="panel-row">
              <Field label="Peso del paciente" unit="kg" value={pesoKg} onChange={setPesoKg} placeholder="ej: 70" onBlur={handleBlurPeso} />
            </div>
          )}

          <div className="result-block" ref={resultadoRef}>
            {!resultado && (
              <div className="result-empty">
                Completá los datos de preparación para ver la concentración.
              </div>
            )}
            {resultado && (
              <>
                {equivalenciaRef && equivalenciaRef.unidad !== unidadDosisSemantica && (
                  <div className="result-line result-line-equivalencia">
                    <span className="result-label">Equivalente a</span>
                    <span className="result-value-sm result-value-equivalencia">{fmtDosis(equivalenciaRef.valor, 3)} {equivalenciaRef.unidad}</span>
                  </div>
                )}
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

          {equivalenciaRef && (() => {
            const ref = DOSIS_REFERENCIA[droga];
            const limite = ref?.techoValor ?? ref?.umbralAlerta;
            const dentroDeRango = limite && equivalenciaRef.valor <= limite;
            if (!dentroDeRango) return null;
            return (
              <div className="aviso-rango-ok">
                ✓ Dentro de valores recomendados
              </div>
            );
          })()}

          {equivalenciaRef && (() => {
            const ref = DOSIS_REFERENCIA[droga];
            const limite = ref?.techoValor ?? ref?.umbralAlerta;
            if (!limite || equivalenciaRef.valor <= limite) return null;
            const esTechoFormal = ref?.techoValor != null;
            return (
              <div className="alerta-sobredosis">
                <AlertCircle size={20} />
                <div>
                  <div className="alerta-sobredosis-titulo">
                    {esTechoFormal ? "⚠ DOSIS SUPERA EL MÁXIMO RECOMENDADO" : "⚠ DOSIS MUY POR ENCIMA DEL RANGO HABITUAL"}
                  </div>
                  <div className="alerta-sobredosis-texto">
                    {fmtDosis(equivalenciaRef.valor, 3)} {equivalenciaRef.unidad} {esTechoFormal ? "supera el máximo de referencia" : "supera el rango de referencia (incluso el extraordinario)"} ({fmtDosis(limite, 2)} {equivalenciaRef.unidad}). Verificá la indicación: puede asociarse a toxicidad grave.
                  </div>
                </div>
              </div>
            );
          })()}

          {!equivalenciaRef && refNecesitaPeso && resultado && !resultado.faltaPeso && (resultado.mlPorHora != null || resultado.dosisResultante != null) && (
            <div className="ref-dosis">
              <div className="ref-dosis-texto">
                Para comparación y obtención de dosis recomendada seleccioná <strong>Gamas</strong> y colocá <strong>peso</strong> de paciente.
              </div>
            </div>
          )}
        </>
      )}

      {DOSIS_REFERENCIA[droga] && (
        <div className="ref-dosis">
          <div className="ref-dosis-titulo">
            {DOSIS_REFERENCIA[droga].techo ? "Dosis máxima recomendada" : "Sobre el máximo de esta droga"}
          </div>
          {DOSIS_REFERENCIA[droga].escenarios ? (
            <div className="ref-dosis-escenarios">
              {DOSIS_REFERENCIA[droga].escenarios.map((esc, i) => (
                <div className="ref-dosis-escenario" key={i}>
                  <div className="ref-dosis-escenario-titulo">{esc.titulo}</div>
                  <ul className="ref-dosis-escenario-lista">
                    {esc.items.map((item, j) => (
                      <li key={j}>{resaltarDosis(item)}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <div className="ref-dosis-texto">{resaltarDosis(DOSIS_REFERENCIA[droga].texto)}</div>
          )}
        </div>
      )}

      {DOSIS_REFERENCIA[droga]?.notaExtraordinaria && (
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
  const [modo, setModo] = useState("volumen-tiempo"); // mlh-a-gotas | gotas-a-mlh | volumen-tiempo
  const [tipoGotero, setTipoGotero] = useState("micro");

  const [mlh, setMlh] = useState("");
  const [gotasMin, setGotasMin] = useState("");
  const [volumenTotal, setVolumenTotal] = useState("");
  const [tiempoHoras, setTiempoHoras] = useState("");
  const [usaMinutos, setUsaMinutos] = useState(false);
  const [tiempoMinutos, setTiempoMinutos] = useState("");

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
      const horas = num(tiempoHoras) || 0;
      const minutos = usaMinutos ? num(tiempoMinutos) || 0 : 0;
      const t = horas + minutos / 60;
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
  }, [modo, mlh, gotasMin, volumenTotal, tiempoHoras, tiempoMinutos, usaMinutos, factor, labelGotas, esMicro]);

  return (
    <div className="panel">
      <div className="seg-control" role="tablist">
        <button className={`seg-btn ${tipoGotero === "micro" ? "active" : ""}`} onClick={() => cambiarGotero("micro")}>
          Microgotero (60 g/ml)
        </button>
        <button className={`seg-btn ${tipoGotero === "macro" ? "active" : ""}`} onClick={() => cambiarGotero("macro")}>
          Macrogotero (20 g/ml)
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
          <>
            <div className="panel-row two-col" style={{ padding: 0 }}>
              <Field label="Volumen a infundir" unit="ml" value={volumenTotal} onChange={setVolumenTotal} placeholder="ej: 500" />
              <Field label="Tiempo total" unit="horas" value={tiempoHoras} onChange={setTiempoHoras} placeholder="ej: 8" />
            </div>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={usaMinutos}
                onChange={(e) => {
                  setUsaMinutos(e.target.checked);
                  if (!e.target.checked) setTiempoMinutos("");
                }}
              />
              <span>Agregar minutos</span>
            </label>
            {usaMinutos && (
              <div className="panel-row" style={{ padding: 0 }}>
                <Field label="Minutos adicionales" unit="min" value={tiempoMinutos} onChange={setTiempoMinutos} placeholder="ej: 30" />
              </div>
            )}
          </>
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

// Claves de localStorage para Balance. Mismo mecanismo ya probado que usa
// esta app para persistir el tema (ver toggleTheme más abajo): así lo
// cargado en Balance sobrevive a que el usuario cambie de pestaña, minimice
// la app, o incluso a que el sistema operativo mate la pestaña en segundo
// plano por falta de memoria durante un turno largo — cosas que pueden
// pasar sin aviso y que hoy borrarían todo, ya que nada se guardaba en
// ningún lado más que en la memoria RAM del momento.
const LS_KEY_INGRESOS = "diluciones-uti-balance-ingresos";
const LS_KEY_EGRESOS = "diluciones-uti-balance-egresos";
const LS_KEY_INGRESOS_PARCIAL = "diluciones-uti-balance-ingresos-parcial";
const LS_KEY_EGRESOS_PARCIAL = "diluciones-uti-balance-egresos-parcial";
const LS_KEY_TRANSFERENCIAS = "diluciones-uti-balance-transferencias";

// Lectura segura: si localStorage no está disponible (modo privado de
// Safari, por ejemplo) o el dato guardado está corrupto/con otra forma,
// arranca vacío en vez de romper la app.
function leerListaGuardada(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function leerObjetoGuardado(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function guardarEnStorage(key, valor) {
  try {
    localStorage.setItem(key, JSON.stringify(valor));
  } catch {
    // Almacenamiento lleno o no disponible: la app se sigue pudiendo usar
    // con normalidad, simplemente no persiste esta vez.
  }
}

// Mayor id ya usado en una o más listas guardadas, para que el contador de
// ids nuevos arranque después y nunca choque con uno restaurado.
function mayorIdGuardado(...listas) {
  let mayor = -1;
  for (const lista of listas) {
    for (const it of lista) {
      if (typeof it.id === "number" && it.id > mayor) mayor = it.id;
    }
  }
  return mayor;
}

// Calculadora de Balance de Ingresos y Egresos. A pedido explícito: sin
// etiquetas ni categorías, solo el número y a qué columna va (Ingreso o
// Egreso) — la idea es cargar rápido durante el turno, no documentar qué
// era cada volumen. Aritmética pura (suma/resta); la app no interpreta ni
// opina si el balance resultante es clínicamente adecuado, eso queda a
// criterio del profesional.
function Balance({ activo }) {
  const [vista, setVista] = useState("parcial"); // "total" | "parcial"

  // Balance queda siempre montado en memoria (para el swipe entre pestañas),
  // así que sin esto el estado de "parcial/total" se quedaría pegado en lo
  // último que elegiste, incluso yendo y viniendo de otras pestañas. Este
  // efecto detecta el momento exacto en que se ENTRA a la pestaña Balance
  // (activo pasa de false a true) y ahí sí arranca en "Parcial" — mientras
  // estés adentro, podés cambiar a "Total" libremente sin que se resetee
  // solo, y arranca desde Parcial siempre que la vuelvas a abrir.
  useEffect(() => {
    if (activo) setVista("parcial");
  }, [activo]);

  // --- Balance Total (sin cambios respecto a como ya funcionaba) ---
  const [ingresos, setIngresos] = useState(() => leerListaGuardada(LS_KEY_INGRESOS)); // [{ id, valor }]
  const [egresos, setEgresos] = useState(() => leerListaGuardada(LS_KEY_EGRESOS));
  const [tipo, setTipo] = useState("ingreso"); // "ingreso" | "egreso"
  const [valor, setValor] = useState("");
  const idRef = useRef(mayorIdGuardado(leerListaGuardada(LS_KEY_INGRESOS), leerListaGuardada(LS_KEY_EGRESOS)) + 1);

  useEffect(() => { guardarEnStorage(LS_KEY_INGRESOS, ingresos); }, [ingresos]);
  useEffect(() => { guardarEnStorage(LS_KEY_EGRESOS, egresos); }, [egresos]);

  const agregar = () => {
    const n = num(valor);
    if (!n || n <= 0) return;
    const item = { id: idRef.current++, valor: n };
    if (tipo === "ingreso") setIngresos((arr) => [...arr, item]);
    else setEgresos((arr) => [...arr, item]);
    setValor("");
  };

  const eliminar = (lista, id) => {
    if (lista === "ingreso") setIngresos((arr) => arr.filter((it) => it.id !== id));
    else setEgresos((arr) => arr.filter((it) => it.id !== id));
  };

  const reiniciar = () => {
    setIngresos([]);
    setEgresos([]);
  };

  // Suma con acumulador redondeado a 2 decimales en cada paso para evitar
  // que errores de redondeo flotante de JS (ej. 0.1 + 0.2) se acumulen a lo
  // largo de una lista larga de valores durante un turno de 12h.
  const sumar = (lista, campo) => lista.reduce((acc, it) => Math.round((acc + (it[campo] ?? 0)) * 100) / 100, 0);

  const totalIngresos = useMemo(() => sumar(ingresos, "valor"), [ingresos]);
  const totalEgresos = useMemo(() => sumar(egresos, "valor"), [egresos]);
  const balance = Math.round((totalIngresos - totalEgresos) * 100) / 100;

  // --- Balance Parcial (nuevo) ---
  // Pensado para trackear sueros/planes activos durante UN turno: cada fila
  // guarda Total / Pasó / Quedó, atados por Total = Pasó + Quedó. El único
  // número que importa para el balance del turno es la suma de "Pasó" (lo
  // que efectivamente se infundió); "Quedó" es la referencia que se le pasa
  // al turno siguiente, no se sube a ningún total.
  const [ingresosParcial, setIngresosParcial] = useState(() => leerListaGuardada(LS_KEY_INGRESOS_PARCIAL)); // [{ id, total, paso, quedo }]
  const [egresosParcial, setEgresosParcial] = useState(() => leerListaGuardada(LS_KEY_EGRESOS_PARCIAL)); // [{ id, valor }] — igual que Balance Total
  const [campoTotal, setCampoTotal] = useState("");
  const [campoPaso, setCampoPaso] = useState("");
  const [campoQuedo, setCampoQuedo] = useState("");
  const [valorEgresoParcial, setValorEgresoParcial] = useState("");
  const idParcialRef = useRef(mayorIdGuardado(leerListaGuardada(LS_KEY_INGRESOS_PARCIAL), leerListaGuardada(LS_KEY_EGRESOS_PARCIAL)) + 1);
  const campoTotalRef = useRef(null);
  const campoPasoRef = useRef(null);
  const campoQuedoRef = useRef(null);

  useEffect(() => { guardarEnStorage(LS_KEY_INGRESOS_PARCIAL, ingresosParcial); }, [ingresosParcial]);
  useEffect(() => { guardarEnStorage(LS_KEY_EGRESOS_PARCIAL, egresosParcial); }, [egresosParcial]);

  // Orden de edición de los 3 campos (más reciente primero). Cada vez que se
  // tipea uno, se recalcula el que quedó último en esta lista — así "los dos
  // que sepas" resuelven al tercero, sin importar cuáles dos sean.
  const ordenCamposRef = useRef(["total", "paso", "quedo"]);

  const actualizarCampoParcial = (campo, valorStr) => {
    const valorAnterior = { total: campoTotal, paso: campoPaso, quedo: campoQuedo };
    valorAnterior[campo] = valorStr;
    ({ total: setCampoTotal, paso: setCampoPaso, quedo: setCampoQuedo }[campo])(valorStr);

    const nuevoOrden = [campo, ...ordenCamposRef.current.filter((c) => c !== campo)];
    ordenCamposRef.current = nuevoOrden;
    const campoAutomatico = nuevoOrden[2]; // el que quedó menos reciente de los tres

    const nTotal = num(valorAnterior.total);
    const nPaso = num(valorAnterior.paso);
    const nQuedo = num(valorAnterior.quedo);

    if (campoAutomatico === "total" && nPaso != null && nQuedo != null) {
      setCampoTotal(fmtDosis(nPaso + nQuedo, 2));
    } else if (campoAutomatico === "paso" && nTotal != null && nQuedo != null) {
      setCampoPaso(fmtDosis(nTotal - nQuedo, 2));
    } else if (campoAutomatico === "quedo" && nTotal != null && nPaso != null) {
      setCampoQuedo(fmtDosis(nTotal - nPaso, 2));
    }
  };

  const agregarIngresoParcial = () => {
    const nTotal = num(campoTotal);
    if (nTotal == null) return;
    // Pasó y Quedó ahora son opcionales al cargar: si al recibir el turno ya
    // sabés cuánto trae cada suero (Total) pero todavía no cuánto pasó/quedó
    // (eso se sabe recién al cerrar el turno), se puede agregar la fila solo
    // con el Total y completar el resto más tarde tocando la celda en la
    // tabla. Si ya se sabían 2 de los 3 (por el resolver de arriba), quedan
    // guardados de una.
    const nPaso = num(campoPaso);
    const nQuedo = num(campoQuedo);
    const item = { id: idParcialRef.current++, total: nTotal, paso: nPaso, quedo: nQuedo };
    setIngresosParcial((arr) => [...arr, item]);
    setCampoTotal("");
    setCampoPaso("");
    setCampoQuedo("");
    ordenCamposRef.current = ["total", "paso", "quedo"];
    // Foco automático en "Vol. Total" para cargar el siguiente suero/plan sin
    // tener que tocar el campo a mano cada vez.
    campoTotalRef.current?.focus();
  };

  // Navegación con el botón "Siguiente"/"Ir" del teclado nativo (atributo
  // enterKeyHint — a diferencia del teclado numérico en sí, esto SÍ lo puede
  // controlar la web, tanto en iOS como Android): Vol. Total -> Pasó ->
  // Quedó -> Agregar, sin soltar el teclado en ningún momento.
  const irAPaso = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      campoPasoRef.current?.focus();
    }
  };
  const irAQuedo = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      campoQuedoRef.current?.focus();
    }
  };
  const irAAgregar = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      agregarIngresoParcial();
    }
  };

  // Edición de celda directamente en la tabla: tocás "Pasó" o "Quedó" de una
  // fila ya cargada (estén vacías o con un valor previo) y aparece un input
  // ahí mismo. Al confirmar, esa fila recalcula el otro campo (el que no se
  // tocó) usando Total = Pasó + Quedó, así la fila queda siempre consistente
  // matemáticamente, sin importar el orden en que se complete.
  const [celdaEditando, setCeldaEditando] = useState(null); // { id, campo: "paso"|"quedo" } | null
  const [valorCeldaEditando, setValorCeldaEditando] = useState("");

  const iniciarEdicionCelda = (id, campo, valorActual) => {
    setCeldaEditando({ id, campo });
    setValorCeldaEditando(valorActual != null ? fmtDosis(valorActual, 2) : "");
  };

  const confirmarEdicionCelda = () => {
    if (!celdaEditando) return;
    const { id, campo } = celdaEditando;
    const n = num(valorCeldaEditando);
    setIngresosParcial((arr) =>
      arr.map((it) => {
        if (it.id !== id) return it;
        const otroCampo = campo === "paso" ? "quedo" : "paso";
        const actualizado = { ...it, [campo]: n };
        if (n != null && actualizado.total != null) {
          actualizado[otroCampo] = Math.round((actualizado.total - n) * 100) / 100;
        }
        return actualizado;
      })
    );
    setCeldaEditando(null);
    setValorCeldaEditando("");
  };

  const agregarEgresoParcial = () => {
    const n = num(valorEgresoParcial);
    if (!n || n <= 0) return;
    setEgresosParcial((arr) => [...arr, { id: idParcialRef.current++, valor: n }]);
    setValorEgresoParcial("");
  };

  const eliminarParcial = (lista, id) => {
    if (lista === "ingreso") setIngresosParcial((arr) => arr.filter((it) => it.id !== id));
    else setEgresosParcial((arr) => arr.filter((it) => it.id !== id));
  };

  const reiniciarParcial = () => {
    setIngresosParcial([]);
    setEgresosParcial([]);
  };

  const totalPasoParcial = useMemo(() => sumar(ingresosParcial, "paso"), [ingresosParcial]);
  const totalEgresosParcial = useMemo(() => sumar(egresosParcial, "valor"), [egresosParcial]);
  const balanceParcial = Math.round((totalPasoParcial - totalEgresosParcial) * 100) / 100;

  // "Enviar a Balance Total": la primera vez crea una entrada nueva en
  // Ingresos/Egresos de Balance Total; si se vuelve a apretar, ACTUALIZA esa
  // misma entrada con el nuevo total en vez de duplicarla (para no ir
  // acumulando envíos repetidos del mismo turno). Si el usuario borró esa
  // entrada a mano en Balance Total, se detecta y se crea una nueva. El
  // botón se deshabilita mientras el subtotal no cambie desde el último
  // envío, y se reactiva solo si se agrega/quita un ítem de la lista (o si
  // la entrada enviada ya no existe en Balance Total).
  const [idTransferidoIngreso, setIdTransferidoIngreso] = useState(() => leerObjetoGuardado(LS_KEY_TRANSFERENCIAS).idTransferidoIngreso ?? null);
  const [idTransferidoEgreso, setIdTransferidoEgreso] = useState(() => leerObjetoGuardado(LS_KEY_TRANSFERENCIAS).idTransferidoEgreso ?? null);
  const [ultimoPasoEnviado, setUltimoPasoEnviado] = useState(() => leerObjetoGuardado(LS_KEY_TRANSFERENCIAS).ultimoPasoEnviado ?? null);
  const [ultimoEgresoEnviado, setUltimoEgresoEnviado] = useState(() => leerObjetoGuardado(LS_KEY_TRANSFERENCIAS).ultimoEgresoEnviado ?? null);

  useEffect(() => {
    guardarEnStorage(LS_KEY_TRANSFERENCIAS, {
      idTransferidoIngreso,
      idTransferidoEgreso,
      ultimoPasoEnviado,
      ultimoEgresoEnviado,
    });
  }, [idTransferidoIngreso, idTransferidoEgreso, ultimoPasoEnviado, ultimoEgresoEnviado]);

  const existeIngresoTransferido = idTransferidoIngreso != null && ingresos.some((it) => it.id === idTransferidoIngreso);
  const existeEgresoTransferido = idTransferidoEgreso != null && egresos.some((it) => it.id === idTransferidoEgreso);
  const botonPasoDeshabilitado = totalPasoParcial <= 0 || (existeIngresoTransferido && ultimoPasoEnviado === totalPasoParcial);
  const botonEgresoParcialDeshabilitado = totalEgresosParcial <= 0 || (existeEgresoTransferido && ultimoEgresoEnviado === totalEgresosParcial);

  const enviarPasoATotal = () => {
    if (totalPasoParcial <= 0) return;
    if (existeIngresoTransferido) {
      setIngresos((arr) => arr.map((it) => (it.id === idTransferidoIngreso ? { ...it, valor: totalPasoParcial } : it)));
    } else {
      const nuevoId = idRef.current++;
      setIngresos((arr) => [...arr, { id: nuevoId, valor: totalPasoParcial }]);
      setIdTransferidoIngreso(nuevoId);
    }
    setUltimoPasoEnviado(totalPasoParcial);
  };

  const enviarEgresoATotal = () => {
    if (totalEgresosParcial <= 0) return;
    if (existeEgresoTransferido) {
      setEgresos((arr) => arr.map((it) => (it.id === idTransferidoEgreso ? { ...it, valor: totalEgresosParcial } : it)));
    } else {
      const nuevoId = idRef.current++;
      setEgresos((arr) => [...arr, { id: nuevoId, valor: totalEgresosParcial }]);
      setIdTransferidoEgreso(nuevoId);
    }
    setUltimoEgresoEnviado(totalEgresosParcial);
  };

  return (
    <div className="panel balance-panel-relative">
      {vista === "total" && (ingresos.length > 0 || egresos.length > 0) && (
        <button type="button" className="balance-reiniciar-flotante" onClick={reiniciar}>
          <RotateCcw size={14} /> Reiniciar
        </button>
      )}
      {vista === "parcial" && (ingresosParcial.length > 0 || egresosParcial.length > 0) && (
        <button type="button" className="balance-reiniciar-flotante" onClick={reiniciarParcial}>
          <RotateCcw size={14} /> Reiniciar
        </button>
      )}
      <div className="balance-toggle-row">
        <div className="mode-tabs">
          <button className={`mode-tab ${vista === "parcial" ? "active" : ""}`} onClick={() => setVista("parcial")}>
            Balance Parcial
          </button>
          <button className={`mode-tab ${vista === "total" ? "active" : ""}`} onClick={() => setVista("total")}>
            Balance Total de 24hs
          </button>
        </div>
      </div>

      {vista === "total" && (
        <>
          <div className="panel-row two-col balance-columnas">
            <div
              role="button"
              tabIndex={0}
              className={`balance-columna balance-columna-clickable ${tipo === "ingreso" ? "balance-columna-activa-ingreso" : ""}`}
              onClick={() => setTipo("ingreso")}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setTipo("ingreso"); }}
            >
              <div className="balance-columna-titulo balance-columna-titulo-ingreso">INGRESOS</div>
              {ingresos.length === 0 ? (
                <div className="balance-vacio">Sin ingresos cargados.</div>
              ) : (
                <div className="balance-lista">
                  {ingresos.map((it) => (
                    <div className="balance-item" key={it.id}>
                      <span>{fmtDosis(it.valor, 2)} ml</span>
                      <button
                        type="button"
                        className="balance-item-borrar"
                        onClick={(e) => { e.stopPropagation(); eliminar("ingreso", it.id); }}
                        aria-label="Quitar"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="balance-subtotal">Subtotal: {fmtDosis(totalIngresos, 2)} ml</div>
            </div>

            <div
              role="button"
              tabIndex={0}
              className={`balance-columna balance-columna-clickable ${tipo === "egreso" ? "balance-columna-activa-egreso" : ""}`}
              onClick={() => setTipo("egreso")}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setTipo("egreso"); }}
            >
              <div className="balance-columna-titulo balance-columna-titulo-egreso">EGRESOS</div>
              {egresos.length === 0 ? (
                <div className="balance-vacio">Sin egresos cargados.</div>
              ) : (
                <div className="balance-lista">
                  {egresos.map((it) => (
                    <div className="balance-item" key={it.id}>
                      <span>{fmtDosis(it.valor, 2)} ml</span>
                      <button
                        type="button"
                        className="balance-item-borrar"
                        onClick={(e) => { e.stopPropagation(); eliminar("egreso", it.id); }}
                        aria-label="Quitar"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="balance-subtotal">Subtotal: {fmtDosis(totalEgresos, 2)} ml</div>
            </div>
          </div>

          <div className={`panel-row balance-agregar-row ${tipo === "egreso" ? "balance-agregar-row-egreso" : ""}`}>
            <Field
              label={tipo === "ingreso" ? "Volumen a ingresar" : "Agregar egreso"}
              unit="ml"
              value={valor}
              onChange={setValor}
            />
            <button
              type="button"
              className={`balance-agregar-btn ${tipo === "egreso" ? "balance-agregar-btn-egreso" : ""}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={agregar}
              aria-label="Agregar volumen"
            >
              +
            </button>
          </div>

          <div className="result-block">
            <div className="result-main">
              <span className={`result-main-value ${balance < 0 ? "balance-resultado-negativo" : ""}`}>{balance > 0 ? "+" : ""}{fmtDosis(balance, 2)}</span>
              <span className="result-main-unit">ml</span>
            </div>
          </div>

          <div className="disclaimer">
            <AlertCircle size={13} />
            <span>Esta calculadora solo suma y resta los volúmenes cargados. No estima pérdidas insensibles ni evalúa si el balance resultante es adecuado para el paciente: esa interpretación queda a criterio clínico.</span>
          </div>
        </>
      )}

      {vista === "parcial" && (
        <>
          <div className="section-title balance-titulo-sin-margen balance-titulo-destacado balance-titulo-ingreso">Ingresos del turno</div>
          {ingresosParcial.length === 0 ? (
            <div className="balance-vacio balance-vacio-parcial">Sin planes cargados todavía.</div>
          ) : (
            <div className="balance-tabla-parcial">
              <div className="balance-tabla-header">
                <div>Volumen total (ml)</div>
                <div className="balance-tabla-th-grande">Pasó</div>
                <div className="balance-tabla-th-grande">Quedó</div>
                <div></div>
              </div>
              {ingresosParcial.map((it) => (
                <div className="balance-tabla-fila" key={it.id}>
                  <div>{fmtDosis(it.total, 2)}</div>

                  {celdaEditando?.id === it.id && celdaEditando?.campo === "paso" ? (
                    <input
                      className="balance-tabla-input"
                      type="text"
                      inputMode="decimal"
                      autoFocus
                      value={valorCeldaEditando}
                      onChange={(e) => setValorCeldaEditando(e.target.value)}
                      onBlur={confirmarEdicionCelda}
                      onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
                    />
                  ) : (
                    <div
                      role="button"
                      tabIndex={0}
                      className={`balance-tabla-col-paso ${it.paso == null ? "balance-tabla-col-vacia" : ""}`}
                      onClick={() => iniciarEdicionCelda(it.id, "paso", it.paso)}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") iniciarEdicionCelda(it.id, "paso", it.paso); }}
                    >
                      {it.paso != null ? fmtDosis(it.paso, 2) : "—"}
                    </div>
                  )}

                  {celdaEditando?.id === it.id && celdaEditando?.campo === "quedo" ? (
                    <input
                      className="balance-tabla-input"
                      type="text"
                      inputMode="decimal"
                      autoFocus
                      value={valorCeldaEditando}
                      onChange={(e) => setValorCeldaEditando(e.target.value)}
                      onBlur={confirmarEdicionCelda}
                      onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
                    />
                  ) : (
                    <div
                      role="button"
                      tabIndex={0}
                      className={`balance-tabla-col-quedo ${it.quedo == null ? "balance-tabla-col-vacia" : ""}`}
                      onClick={() => iniciarEdicionCelda(it.id, "quedo", it.quedo)}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") iniciarEdicionCelda(it.id, "quedo", it.quedo); }}
                    >
                      {it.quedo != null ? fmtDosis(it.quedo, 2) : "—"}
                    </div>
                  )}

                  <div>
                    <button
                      type="button"
                      className="balance-item-borrar"
                      onClick={() => eliminarParcial("ingreso", it.id)}
                      aria-label="Quitar"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="section-title">Suero infundiendo/infundido</div>
          <div className="balance-parcial-form">
            <Field ref={campoTotalRef} label="Vol. Total" unit="ml" value={campoTotal} onChange={(v) => actualizarCampoParcial("total", v)} enterKeyHint="next" onKeyDown={irAPaso} />
            <Field ref={campoPasoRef} label="Pasó" unit="ml" value={campoPaso} onChange={(v) => actualizarCampoParcial("paso", v)} enterKeyHint="next" onKeyDown={irAQuedo} />
            <Field ref={campoQuedoRef} label="Quedó" unit="ml" value={campoQuedo} onChange={(v) => actualizarCampoParcial("quedo", v)} enterKeyHint="send" onKeyDown={irAAgregar} />
          </div>
          <button
            type="button"
            className="balance-agregar-parcial-btn"
            onMouseDown={(e) => e.preventDefault()}
            onClick={agregarIngresoParcial}
          >
            Agregar a Ingresos
          </button>

          <div className="balance-subtotal-parcial-row">
            <div className="balance-subtotal-parcial-texto balance-texto-ingreso">
              Total Ingresos: <strong>{fmtDosis(totalPasoParcial, 2)} ml</strong>
            </div>
            <button type="button" className="balance-enviar-btn balance-enviar-btn-ingreso" onClick={enviarPasoATotal} disabled={botonPasoDeshabilitado}>
              Agregar a Balance Total
            </button>
          </div>

          <div className="section-title balance-titulo-destacado balance-titulo-egreso">Egresos del turno</div>
          {egresosParcial.length === 0 ? (
            <div className="balance-vacio balance-vacio-parcial">Sin egresos cargados.</div>
          ) : (
            <div className="balance-lista">
              {egresosParcial.map((it) => (
                <div className="balance-item" key={it.id}>
                  <span>{fmtDosis(it.valor, 2)} ml</span>
                  <button
                    type="button"
                    className="balance-item-borrar"
                    onClick={() => eliminarParcial("egreso", it.id)}
                    aria-label="Quitar"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="panel-row balance-agregar-row balance-agregar-row-egreso">
            <Field
              label="Agregar egreso"
              unit="ml"
              value={valorEgresoParcial}
              onChange={setValorEgresoParcial}
            />
            <button
              type="button"
              className="balance-agregar-btn balance-agregar-btn-egreso"
              onMouseDown={(e) => e.preventDefault()}
              onClick={agregarEgresoParcial}
              aria-label="Agregar egreso"
            >
              +
            </button>
          </div>
          {egresosParcial.length > 0 && (
            <div className="balance-subtotal-parcial-row">
              <div className="balance-subtotal-parcial-texto balance-texto-egreso">
                Total Egresos: <strong>{fmtDosis(totalEgresosParcial, 2)} ml</strong>
              </div>
              <button type="button" className="balance-enviar-btn balance-enviar-btn-egreso" onClick={enviarEgresoATotal} disabled={botonEgresoParcialDeshabilitado}>
                Agregar a Balance Total
              </button>
            </div>
          )}

          <div className="result-block">
            <div className="balance-resultado-titulo">Total balance parcial</div>
            <div className="result-main">
              <span className={`result-main-value ${balanceParcial < 0 ? "balance-resultado-negativo" : ""}`}>{balanceParcial > 0 ? "+" : ""}{fmtDosis(balanceParcial, 2)}</span>
              <span className="result-main-unit">ml</span>
            </div>
          </div>

          <div className="disclaimer">
            <AlertCircle size={13} />
            <span>"Pasó" es lo que se sumó del suero/plan durante el turno; "Quedó" es la referencia para el turno siguiente y no se suma a ningún total. Esta calculadora no reemplaza el registro formal de enfermería.</span>
          </div>
        </>
      )}
    </div>
  );
}

const ORDEN_TABS = ["inicio", "diluciones", "balance", "pafi", "goteo"];

// Versiones memoizadas de los paneles. Los 4 están siempre montados (para el
// swipe), así que sin memo se re-renderizaban TODOS cada vez que App cambiaba
// de estado (abrir teclado, cambiar de tab, etc.), causando el lag al tocar en
// iPhone. Diluciones/Goteo/PaFi no reciben props => con memo no se re-renderizan
// nunca por culpa del padre (su estado interno sigue funcionando igual). Inicio
// solo se re-renderiza si cambia `tema` (sus callbacks van con useCallback).
// No se toca nada de la lógica de cálculo: es puramente de renderizado.
const InicioMemo = React.memo(Inicio);
const DilucionesMemo = React.memo(Diluciones);
const GoteoMemo = React.memo(Goteo);
const PaFiMemo = React.memo(PaFi);
const BalanceMemo = React.memo(Balance);

export default function App() {
  const [tab, setTab] = useState("inicio");
  const [scrolled, setScrolled] = useState(false);
  const [tema, setTema] = useState(() => {
    try {
      return localStorage.getItem("diluciones-uti-tema") || "light";
    } catch {
      return "light";
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("diluciones-uti-tema", tema);
    } catch {
      // localStorage puede no estar disponible (modo privado, etc.);
      // el tema simplemente no persiste entre sesiones en ese caso.
    }
  }, [tema]);

  const toggleTheme = useCallback(() => setTema((t) => (t === "dark" ? "light" : "dark")), []);
  const esOscuro = tema === "dark";

  useEffect(() => {
    const onScroll = () => setScrolled(getScrollY() > 16);

    function getScrollY() {
      return (
        window.scrollY ||
        document.documentElement.scrollTop ||
        document.body.scrollTop ||
        0
      );
    }

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("scroll", onScroll);
    };
  }, []);

  // Safari iOS ancla position:fixed al "layout viewport" (el tamaño
  // completo de la página), no al "visual viewport" (lo que realmente
  // se ve cuando el teclado está abierto). Esto hace que un header fixed
  // pueda terminar mal posicionado o "tapado" mientras el teclado está
  // abierto o en transición de cierre. Detectamos esa diferencia de
  // tamaño y, mientras exista, cambiamos el header de fixed a absolute,
  // que sí respeta el flujo normal del documento sin esa ambigüedad.
  const [tecladoAbierto, setTecladoAbierto] = useState(false);

  useEffect(() => {
    if (!window.visualViewport) return;
    const vv = window.visualViewport;
    const checkViewport = () => {
      const diff = window.innerHeight - vv.height;
      setTecladoAbierto(diff > 80);
    };
    checkViewport();
    vv.addEventListener("resize", checkViewport);
    return () => vv.removeEventListener("resize", checkViewport);
  }, []);

  // Escalado global de la UI (reemplazo definitivo del viejo zoom).
  // En vez de `zoom` (congelaba el scroll en Android) o `transform: scale`
  // (pantalla blanca en iOS con overflow), achicamos el ancho del viewport
  // dividiéndolo por ESCALA_UI: el navegador entonces estira ese layout más
  // angosto para llenar la pantalla, agrandando TODO (texto, botones,
  // padding, íconos) de forma uniforme y sin ningún bug de renderizado.
  // Se recalcula al rotar. Como es px puro (no rem), este es el único punto
  // real donde se controla el tamaño general de la app.
  useEffect(() => {
    let meta = document.querySelector('meta[name="viewport"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "viewport");
      document.head.appendChild(meta);
    }
    const aplicarEscala = () => {
      // Ancho de referencia estable (lado corto = ancho en vertical), para
      // que el factor sea consistente en cualquier iPhone/Android.
      const anchoBase =
        Math.min(window.screen.width, window.screen.height) ||
        window.innerWidth ||
        390;
      const ancho = Math.round(anchoBase / ESCALA_UI);
      meta.setAttribute("content", `width=${ancho}, viewport-fit=cover`);
    };
    aplicarEscala();
    window.addEventListener("orientationchange", aplicarEscala);
    return () => window.removeEventListener("orientationchange", aplicarEscala);
  }, []);

  const headerColapsado = scrolled || tab !== "inicio";

  const touchStartRef = useRef(null);
  const trackRef = useRef(null);
  const tabRef = useRef(tab);
  useEffect(() => { tabRef.current = tab; }, [tab]);

  // Al montar, posiciona el track sin animación en el tab inicial
  useEffect(() => {
    setTrack(getOffset(tab), false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getOffset = (t) => -ORDEN_TABS.indexOf(t) * 100;

  const setTrack = (pct, animated) => {
    const el = trackRef.current;
    if (!el) return;
    el.classList.toggle("no-transition", !animated);
    el.style.transform = `translateX(${pct}%)`;
  };

  // Muestra/oculta el divisor de la costura entre paneles. Se enciende al
  // iniciar un swipe o una transición y se apaga cuando el track se asienta,
  // así en reposo la pantalla queda limpia (full-bleed) sin línea ni sombra.
  const seamTimerRef = useRef(null);
  const showSeam = () => {
    if (seamTimerRef.current) { clearTimeout(seamTimerRef.current); seamTimerRef.current = null; }
    trackRef.current?.classList.add("seam-on");
  };
  const hideSeam = (delay = 300) => {
    if (seamTimerRef.current) clearTimeout(seamTimerRef.current);
    seamTimerRef.current = setTimeout(() => {
      trackRef.current?.classList.remove("seam-on");
      seamTimerRef.current = null;
    }, delay);
  };

  const handleTouchStart = (e) => {
    // Las pastillas de modo (.mode-tabs, ej. Goteo: "ml/h → gotas/min" /
    // "gotas/min → ml/h" / "Volumen + tiempo") tienen su propio scroll
    // horizontal nativo cuando no entran todas en el ancho de pantalla. Si
    // dejamos que este handler también las trackee, compiten por el mismo
    // gesto: el scroll interno se mueve Y el track de pestañas también,
    // terminando en un cambio de pestaña no buscado. Si el toque arranca
    // ahí adentro, no lo trackeamos: que el scroll nativo del navegador lo
    // resuelva solo, sin interferencia del swipe entre pestañas.
    if (e.target.closest(".mode-tabs")) {
      touchStartRef.current = null;
      return;
    }
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, locked: false };
    setTrack(getOffset(tabRef.current), false);
    showSeam();
  };

  const handleTouchMove = (e) => {
    const s = touchStartRef.current;
    if (!s || s.locked) return;
    const dx = e.touches[0].clientX - s.x;
    const dy = e.touches[0].clientY - s.y;
    if (Math.abs(dy) > Math.abs(dx) * 1.3 && Math.abs(dy) > 8) { s.locked = true; hideSeam(0); return; }
    const idx = ORDEN_TABS.indexOf(tabRef.current);
    const resist = (idx === 0 && dx > 0) || (idx === ORDEN_TABS.length - 1 && dx < 0) ? 0.2 : 1;
    setTrack(getOffset(tabRef.current) + (dx / window.innerWidth) * 100 * resist, false);
  };

  const handleTouchEnd = (e) => {
    const s = touchStartRef.current;
    touchStartRef.current = null;
    hideSeam(300);
    if (!s || s.locked) { setTrack(getOffset(tabRef.current), true); return; }
    const dx = e.changedTouches[0].clientX - s.x;
    const idx = ORDEN_TABS.indexOf(tabRef.current);
    if (dx < -50 && idx < ORDEN_TABS.length - 1) {
      const next = ORDEN_TABS[idx + 1];
      setTrack(getOffset(next), true);
      setTimeout(() => setTab(next), 280);
    } else if (dx > 50 && idx > 0) {
      const prev = ORDEN_TABS[idx - 1];
      setTrack(getOffset(prev), true);
      setTimeout(() => setTab(prev), 280);
    } else {
      setTrack(getOffset(tabRef.current), true);
    }
  };

  const cambiarTab = useCallback((nuevoTab) => {
    const idxActual = ORDEN_TABS.indexOf(tabRef.current);
    const idxNuevo = ORDEN_TABS.indexOf(nuevoTab);
    if (idxNuevo === idxActual) return;
    showSeam();
    setTrack(getOffset(nuevoTab), true);
    setTimeout(() => setTab(nuevoTab), 280);
    hideSeam(320);
  }, []);

  return (
    <div className="app-shell" data-theme={tema}>
      <style>{`
        * { box-sizing: border-box; }
        :root {
          /* Fondos */
          --bg-app: #0B1210;
          --bg-app-grad-top: #0F1B17;
          --bg-panel: #101C18;
          --bg-panel-alt: #0B1512;
          --border-panel: #1B2A25;
          /* Costura entre paneles al hacer swipe (hairline + sombra difuminada) */
          --seam-line: rgba(255, 255, 255, 0.09);
          --seam-shadow: rgba(0, 0, 0, 0.55);
          --dropdown-bg: linear-gradient(165deg, rgba(22, 38, 32, 0.96) 0%, rgba(9, 18, 15, 0.94) 40%, rgba(9, 18, 15, 0.96) 100%);
          --dropdown-border: rgba(255, 255, 255, 0.14);
          --dropdown-item-active: rgba(255, 255, 255, 0.10);

          /* Texto */
          --text-primary: #EAF2EE;
          --text-heading: #F4FBF7;
          --text-secondary: #9FB8AC;
          --text-tertiary: #6F8A7F;
          --text-quaternary: #5C7568;
          --text-quinary: #C7D6CE;
          --text-dim: #8FB3A3;

          /* Acentos */
          --accent-green: #4FD195;
          --accent-green-soft: #3DAE82;
          --accent-green-pale: #7FC9A3;
          --accent-green-deep: #5FA88A;
          --accent-green-border: #2D5C49;
          --accent-red: #FF453A;
          --accent-red-soft: #FF6B6B;
          --accent-red-softer: #FF8A8A;
          --accent-red-pale: #F4C7C7;
          --accent-red-border: #D14242;
          --accent-violet: #BF5AF2;
          --accent-orange: #FF9F0A;
          --accent-orange-deep: #E08A3D;
          --accent-yellow: #FFD60A;
          --accent-yellow-soft: #F0C04D;
          --accent-gold: #D9A441;
          --accent-gold-pale: #F0DCA0;
          --accent-tan: #C9B98E;
          --accent-tan-pale: #E8DCC0;

          /* Cajas de alerta / nota (fondo + borde por tono) */
          --box-amber-bg: #15120A;
          --box-amber-border: #3D331A;
          --box-amber-border-soft: #5C3A1A;
          --box-amber-border-deep: #1A1209;
          --box-red-bg: #2A0E0E;
          --box-red-bg-soft: #2A2210;
          --box-blue-bg: #0C1A22;
          --box-blue-border: #2A4A5C;
          --box-green-bg: #0E2118;
          --box-green-border: #1F3D2D;
          --box-green-border-soft: #163027;
          --box-green-bg-soft: #1B2E26;
          --box-neutral-border: #25372F;

          /* Otros */
          --value-muted: #DCEBE3;
          --accent-select: #3DAE82;
        }
        [data-theme="light"] {
          --bg-app: #EEF3EF;
          --bg-app-grad-top: #F7FAF7;
          --bg-panel: #FBFDFB;
          --bg-panel-alt: #F4F8F5;
          --border-panel: #DCE6E0;
          --seam-line: rgba(15, 33, 28, 0.14);
          --seam-shadow: rgba(15, 33, 28, 0.12);
          --dropdown-bg: linear-gradient(165deg, rgba(255, 255, 255, 0.32) 0%, rgba(247, 250, 248, 0.28) 40%, rgba(241, 246, 243, 0.32) 100%);
          --dropdown-border: rgba(15, 33, 28, 0.12);
          --dropdown-item-active: rgba(15, 33, 28, 0.07);

          --text-primary: #15211C;
          --text-heading: #0E1714;
          --text-secondary: #4A6359;
          --text-tertiary: #6E8579;
          --text-quaternary: #88998F;
          --text-quinary: #3C4F47;
          --text-dim: #5C7568;

          --accent-green: #1F9E63;
          --accent-green-soft: #2E9C6F;
          --accent-green-pale: #3E8F6B;
          --accent-green-deep: #2C7A5C;
          --accent-green-border: #A6D9C2;
          --accent-red: #D6332A;
          --accent-red-soft: #C44A42;
          --accent-red-softer: #B85C56;
          --accent-red-pale: #7A2A26;
          --accent-red-border: #D14242;
          --accent-violet: #8A3FC4;
          --accent-orange: #C97200;
          --accent-orange-deep: #A8631F;
          --accent-yellow: #9C7E00;
          --accent-yellow-soft: #8A6A1A;
          --accent-gold: #92681E;
          --accent-gold-pale: #6B4E14;
          --accent-tan: #6B5A38;
          --accent-tan-pale: #4F4128;

          --box-amber-bg: #FBF3E2;
          --box-amber-border: #E4CE9C;
          --box-amber-border-soft: #D8BB7A;
          --box-amber-border-deep: #C9A65C;
          --box-red-bg: #FBE9E8;
          --box-red-bg-soft: #FBEFE0;
          --box-blue-bg: #E7F0F5;
          --box-blue-border: #B9D2E0;
          --box-green-bg: #E7F5EE;
          --box-green-border: #B9E0CC;
          --box-green-border-soft: #CFE9DC;
          --box-green-bg-soft: #DCF0E5;
          --box-neutral-border: #D7E2DC;

          --value-muted: #3C4F47;
          --accent-select: #1F9E63;
        }
        html, body {
          overscroll-behavior-y: none;
        }
        html {
          /* El agrandado global lo maneja el viewport (ver ESCALA_UI y su
             useEffect). Base normal de 16px: evita agrandar de más el texto
             que hereda tamaño y previene el auto-zoom de iOS al enfocar inputs. */
          font-size: 16px;
        }
        .app-shell {
          min-height: 100vh;
          height: 100vh;
          height: 100dvh;
          background: var(--bg-app);
          color: var(--text-primary);
          font-family: -apple-system, "SF Pro Text", "Inter", system-ui, sans-serif;
          display: flex;
          flex-direction: column;
          padding-bottom: 90px;
          position: relative;
          /* Elimina el retardo de ~300ms que iOS Safari agrega en cada tap
             esperando un posible doble-tap-para-zoom (reintroducido al usar un
             viewport de ancho fijo para el escalado). 'manipulation' desactiva
             solo el doble-tap-zoom; el pinch-zoom, el scroll y el swipe siguen
             funcionando. Aplicado en el ancestro, cubre inputs, botones y tabs. */
          touch-action: manipulation;
        }
        .topbar {
          padding: 28px 20px 18px;
          border-bottom: 1px solid var(--border-panel);
          background: linear-gradient(180deg, var(--bg-app-grad-top) 0%, var(--bg-app) 100%);
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 40;
          transition: padding 0.25s ease;
        }
        .topbar-inner {
          max-width: 480px;
          margin: 0 auto;
        }
        .topbar.topbar-collapsed {
          padding: 12px 20px 10px;
        }
        .topbar.topbar-teclado-abierto {
          position: absolute;
        }
        .topbar-eyebrow-row {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 4px;
          max-height: 20px;
          overflow: hidden;
          opacity: 1;
          transition: max-height 0.22s ease, opacity 0.18s ease, margin-bottom 0.22s ease;
        }
        .topbar.topbar-collapsed .topbar-eyebrow-row {
          max-height: 0;
          opacity: 0;
          margin-bottom: 0;
        }
        .topbar-eyebrow {
          font-size: 11px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--accent-green-deep);
          font-weight: 600;
        }
        .topbar-by {
          font-size: 11.5px;
          font-style: italic;
          color: var(--text-dim);
          white-space: nowrap;
        }
        .topbar-title {
          font-family: "Georgia", "Iowan Old Style", serif;
          font-size: 26px;
          font-weight: 600;
          letter-spacing: -0.01em;
          color: var(--text-heading);
          transition: font-size 0.25s ease;
        }
        .topbar.topbar-collapsed .topbar-title {
          font-size: 18px;
        }
        .topbar-sub {
          font-size: 13px;
          color: var(--text-tertiary);
          margin-top: 2px;
          max-height: 20px;
          overflow: hidden;
          opacity: 1;
          transition: max-height 0.22s ease, opacity 0.18s ease, margin-top 0.22s ease;
        }
        .topbar.topbar-collapsed .topbar-sub {
          max-height: 0;
          opacity: 0;
          margin-top: 0;
        }
        .topbar-inner {
          max-width: 480px;
          margin: 0 auto;
        }
        .topbar-spacer {
          height: 108px;
          transition: height 0.25s ease;
        }
        .topbar.topbar-collapsed + .topbar-spacer {
          height: 36px;
        }
        .content-scale-wrap {
          flex: 1;
          min-height: 0;
          overflow: hidden;
          position: relative;
        }
        .tab-track {
          display: flex;
          height: 100%;
          will-change: transform;
          transition: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .tab-track.no-transition {
          transition: none;
        }
        .tab-panel {
          min-width: 100%;
          height: 100%;
          position: relative;
          overflow: hidden;
        }
        /* El scroll vive acá, no en .tab-panel. Así el divisor (::after sobre
           .tab-panel) se mide contra la altura completa del panel y no contra
           la del contenido — evita el bug de iOS donde la línea cortaba corto
           en tabs con poco contenido (ej. Goteo). */
        .tab-panel-scroll {
          height: 100%;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
        }
        /* Divisor en la costura entre paneles: hairline central + sombra
           difuminada simétrica. Solo visible mientras se hace swipe o hay
           transición (clase .seam-on en el track); en reposo desaparece. */
        .tab-panel::after {
          content: "";
          position: absolute;
          top: 0;
          bottom: 0;
          right: 0;
          width: 1px;
          background: var(--seam-line);
          box-shadow: 0 0 20px 7px var(--seam-shadow);
          opacity: 0;
          transition: opacity 0.2s ease;
          pointer-events: none;
          z-index: 5;
        }
        .tab-track.seam-on .tab-panel::after {
          opacity: 1;
        }
        .tab-panel-inner {
          padding: 18px 16px;
          max-width: 480px;
          margin: 0 auto;
          width: 100%;
        }
        .tab-panel-inner.content-centrado {
          display: flex;
          flex-direction: column;
          justify-content: center;
          min-height: 100%;
        }
        .content {
          padding: 18px 16px;
          max-width: 480px;
          margin: 0 auto;
          width: 100%;
        }
        .content-centrado {
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .panel {
          background: var(--bg-panel);
          border: 1px solid var(--border-panel);
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
          color: var(--text-secondary);
          margin-bottom: 14px;
          cursor: pointer;
        }
        .checkbox-row input[type="checkbox"] {
          width: 17px;
          height: 17px;
          accent-color: var(--accent-green-soft);
          cursor: pointer;
        }
        .campo-calculado {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .campo-calculado-valor {
          background: var(--bg-panel-alt);
          border: 1px solid var(--border-panel);
          border-radius: 10px;
          padding: 12px 14px;
          font-size: 17px;
          color: var(--text-secondary);
          font-variant-numeric: tabular-nums;
        }
        .info-nota-ampollas {
          font-size: 12.5px;
          color: var(--text-tertiary);
          margin-top: -4px;
          margin-bottom: 16px;
        }
        .info-nota-ampollas strong {
          color: var(--text-secondary);
          font-weight: 700;
        }
        .volumen-diluido-block {
          background: var(--bg-panel-alt);
          border: 1px solid var(--border-panel);
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
          color: var(--accent-orange);
        }
        .volumen-diluido-label-bottom {
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.04em;
          color: var(--accent-green);
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
          color: var(--accent-green);
          letter-spacing: -0.02em;
          line-height: 1;
        }
        .volumen-diluido-valor-unit {
          font-size: 18px;
          color: var(--accent-green);
          font-weight: 600;
        }
        .section-title {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--accent-green-deep);
          font-weight: 700;
          margin: 12px 0 10px;
          padding-top: 10px;
          border-top: 1px solid var(--border-panel);
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
          color: var(--text-secondary);
          font-weight: 500;
        }
        .field-input-wrap, .select-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }
        .field-input, .field-select {
          width: 100%;
          background: var(--bg-panel-alt);
          border: 1px solid var(--box-neutral-border);
          border-radius: 10px;
          padding: 12px 14px;
          font-size: 17px;
          color: var(--text-heading);
          font-variant-numeric: tabular-nums;
          outline: none;
          transition: border-color 0.15s;
          appearance: none;
        }
        .field-input:focus, .field-select:focus {
          border-color: var(--accent-green-soft);
        }
        .field-unit {
          position: absolute;
          right: 14px;
          font-size: 13px;
          color: var(--text-tertiary);
          pointer-events: none;
        }
        .select-chevron {
          position: absolute;
          right: 12px;
          color: var(--text-tertiary);
          pointer-events: none;
        }
        .field-select { padding-right: 36px; cursor: pointer; }
        .field-select-riesgo {
          border-color: var(--accent-red-border) !important;
          color: var(--accent-red-softer) !important;
          font-weight: 400;
          box-shadow: 0 0 0 1px rgba(209, 66, 66, 0.25);
        }
        .dropdown-custom-wrap {
          position: relative;
          z-index: 46;
        }
        .dropdown-custom-trigger {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          text-align: left;
          background: var(--bg-panel-alt);
          font-family: inherit;
        }
        .dropdown-custom-warn {
          flex-shrink: 0;
          margin-left: 8px;
          color: var(--accent-orange);
        }
        .dropdown-custom-overlay {
          position: fixed;
          inset: 0;
          z-index: 45;
          background: transparent;
        }
        .dropdown-custom-list {
          position: absolute;
          top: calc(100% + 6px);
          left: 0;
          right: 0;
          border: 1px solid var(--dropdown-border);
          border-radius: 14px;
          box-shadow:
            0 16px 40px rgba(0, 0, 0, 0.55),
            inset 0 1px 0 rgba(255, 255, 255, 0.12),
            inset 0 0 24px rgba(255, 255, 255, 0.04);
          z-index: 50;
          overflow: hidden;
          background: var(--dropdown-bg);
          backdrop-filter: blur(10px) saturate(1.5);
          -webkit-backdrop-filter: blur(10px) saturate(1.5);
        }
        .dropdown-custom-scroll {
          max-height: 340px;
          overflow-y: auto;
          padding: 6px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .dropdown-custom-item {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          background: transparent;
          border: none;
          color: var(--text-primary);
          font-size: 16px;
          font-family: inherit;
          text-align: left;
          padding: 8px 12px;
          border-radius: 8px;
          cursor: pointer;
        }
        .dropdown-custom-item:active {
          background: var(--dropdown-item-active);
        }
        .dropdown-custom-item-riesgo {
          color: var(--text-primary);
          font-weight: 400;
          font-size: 15px;
          border-left: 4px solid var(--accent-red);
          padding-left: 12px;
          border-top-left-radius: 0;
          border-bottom-left-radius: 0;
        }
        .dropdown-custom-item-opioide {
          color: var(--text-primary);
          font-weight: 400;
          border-left: 4px solid var(--accent-violet);
          padding-left: 12px;
          border-top-left-radius: 0;
          border-bottom-left-radius: 0;
        }
        .dropdown-custom-item-bloqueante {
          color: var(--text-primary);
          font-weight: 400;
          border-left: 4px solid rgba(138, 154, 91, 0.75);
          padding-left: 12px;
          border-top-left-radius: 0;
          border-bottom-left-radius: 0;
        }
        .dropdown-custom-item-activo {
          background: linear-gradient(165deg, rgba(74, 222, 128, 0.22) 0%, rgba(74, 222, 128, 0.10) 60%, rgba(74, 222, 128, 0.07) 100%);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.16),
            inset 0 0 0 1px rgba(74, 222, 128, 0.30),
            inset 0 0 16px rgba(74, 222, 128, 0.08);
        }
        .dropdown-custom-item-riesgo.dropdown-custom-item-activo {
          background: linear-gradient(165deg, rgba(255, 69, 58, 0.20) 0%, rgba(255, 69, 58, 0.09) 60%, rgba(255, 69, 58, 0.06) 100%);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.14),
            inset 0 0 0 1px rgba(255, 69, 58, 0.32),
            inset 0 0 16px rgba(255, 69, 58, 0.08);
        }
        .dropdown-custom-item-bloqueante.dropdown-custom-item-activo {
          background: linear-gradient(165deg, rgba(138, 154, 91, 0.18) 0%, rgba(138, 154, 91, 0.08) 60%, rgba(138, 154, 91, 0.05) 100%);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.14),
            inset 0 0 0 1px rgba(138, 154, 91, 0.30),
            inset 0 0 16px rgba(138, 154, 91, 0.07);
        }
        .dropdown-custom-item-opioide.dropdown-custom-item-activo {
          background: linear-gradient(165deg, rgba(191, 90, 242, 0.20) 0%, rgba(191, 90, 242, 0.09) 60%, rgba(191, 90, 242, 0.06) 100%);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.14),
            inset 0 0 0 1px rgba(191, 90, 242, 0.32),
            inset 0 0 16px rgba(191, 90, 242, 0.08);
        }
        .btn-reset {
          background: var(--box-amber-bg);
          border: 1px solid var(--box-amber-border);
          color: var(--accent-gold);
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
        .grupo-farmacologico {
          text-align: center;
          font-size: 10.5px;
          font-weight: 500;
          letter-spacing: 0.08em;
          color: var(--text-quinary);
          border: 1px solid rgba(199, 214, 206, 0.30);
          border-radius: 10px;
          background: rgba(199, 214, 206, 0.06);
          padding: 8px 12px;
          margin-top: 2px;
          margin-bottom: 14px;
        }
        .grupo-farmacologico-rojo {
          color: var(--accent-red);
          font-weight: 400;
          border-color: rgba(255, 69, 58, 0.45);
          background: rgba(255, 69, 58, 0.08);
        }
        .grupo-farmacologico-violeta {
          color: var(--accent-violet);
          font-weight: 400;
          border-color: rgba(191, 90, 242, 0.45);
          background: rgba(191, 90, 242, 0.08);
        }
        .presentacion-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 14px;
        }
        .panel-row.first-row { display: flex; align-items: flex-end; gap: 10px; }
        .result-block {
          background: var(--bg-panel-alt);
          border: 1px solid var(--border-panel);
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
          color: var(--text-quaternary);
          text-align: center;
        }
        .pafi-categoria {
          text-align: center;
          font-size: 13px;
          font-weight: 700;
          padding: 10px 14px;
          border-radius: 12px;
          margin-top: 4px;
          margin-bottom: 14px;
        }
        .pafi-normal {
          color: var(--accent-green);
          background: rgba(74, 222, 128, 0.10);
          border: 1px solid rgba(74, 222, 128, 0.30);
        }
        .pafi-leve {
          color: var(--accent-yellow);
          background: rgba(255, 214, 10, 0.10);
          border: 1px solid rgba(255, 214, 10, 0.30);
        }
        .pafi-moderado {
          color: var(--accent-orange);
          background: rgba(255, 159, 10, 0.10);
          border: 1px solid rgba(255, 159, 10, 0.30);
        }
        .pafi-severo {
          color: var(--accent-red);
          background: rgba(255, 69, 58, 0.10);
          border: 1px solid rgba(255, 69, 58, 0.30);
        }
        .aviso-falta-campo {
          font-size: 12px;
          font-weight: 600;
          color: var(--accent-yellow-soft);
          margin-top: -6px;
          margin-bottom: 4px;
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
          color: var(--accent-green);
          letter-spacing: -0.02em;
        }
        .result-main-value.balance-resultado-negativo {
          color: var(--accent-orange);
        }
        .result-main-unit {
          font-size: 15px;
          color: var(--text-secondary);
          font-weight: 500;
        }
        .result-line {
          display: flex;
          justify-content: space-between;
          font-size: 13.5px;
        }
        .result-label { color: var(--text-tertiary); }
        .result-value-sm { color: var(--value-muted); font-variant-numeric: tabular-nums; font-weight: 600; }
        .result-line-equivalencia {
          padding-bottom: 6px;
          margin-bottom: 4px;
          border-bottom: 1px solid var(--border-panel);
        }
        .result-line-equivalencia .result-label {
          color: var(--text-secondary);
          font-weight: 600;
        }
        .result-value-equivalencia {
          color: var(--accent-green) !important;
          font-size: 16px;
          font-weight: 700;
        }
        .result-warning {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12.5px;
          color: var(--accent-orange);
          background: var(--box-red-bg-soft);
          border-radius: 8px;
          padding: 8px 10px;
        }
        .result-rounded {
          padding-top: 2px;
        }
        .result-rounded .result-value-sm {
          color: var(--text-secondary);
          font-weight: 600;
        }
        .ref-dosis {
          background: var(--box-amber-bg);
          border: 1px solid var(--box-amber-border);
          border-radius: 12px;
          padding: 12px 14px;
          margin-top: 10px;
        }
        .aviso-rango-ok {
          background: var(--box-blue-bg);
          border: 1px solid var(--box-blue-border);
          border-radius: 12px;
          padding: 10px 14px;
          margin-top: 10px;
          font-size: 10.5px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-primary);
          font-weight: 700;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .ref-dosis-extraordinaria {
          border-color: var(--box-amber-border-soft);
          background: var(--box-amber-border-deep);
        }
        .ref-dosis-extraordinaria .ref-dosis-titulo {
          color: var(--accent-orange-deep);
        }
        .presentacion-tag {
          font-size: 12.5px;
          color: var(--accent-tan-pale);
          font-weight: 600;
          background: var(--box-amber-bg);
          border: 1px solid var(--box-amber-border);
          border-radius: 8px;
          padding: 8px 12px;
          display: inline-block;
        }
        .ref-dosis-titulo {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--accent-gold);
          font-weight: 700;
          margin-bottom: 4px;
        }
        .ref-dosis-texto {
          font-size: 12.5px;
          color: var(--accent-tan);
          line-height: 1.45;
        }
        .ref-dosis-texto strong {
          color: var(--accent-gold-pale);
          font-weight: 700;
        }
        .ref-dosis-escenarios {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .ref-dosis-escenario-titulo {
          font-size: 12.5px;
          font-weight: 700;
          color: var(--accent-gold-pale);
          margin-bottom: 2px;
        }
        .ref-dosis-escenario-lista {
          margin: 0;
          padding-left: 18px;
          list-style-type: disc;
        }
        .ref-dosis-escenario-lista li {
          font-size: 12.5px;
          color: var(--accent-tan);
          line-height: 1.45;
        }
        .ref-dosis-escenario-lista li strong {
          color: var(--accent-gold-pale);
          font-weight: 700;
        }
        .alerta-sobredosis {
          background: var(--box-red-bg);
          border: 2px solid var(--accent-red-border);
          border-radius: 12px;
          padding: 14px;
          margin-top: 10px;
          display: flex;
          gap: 10px;
          align-items: flex-start;
          box-shadow: 0 0 0 1px rgba(209, 66, 66, 0.3), 0 4px 16px rgba(209, 66, 66, 0.25);
        }
        .alerta-sobredosis svg {
          color: var(--accent-red-soft);
          flex-shrink: 0;
          margin-top: 1px;
        }
        .alerta-sobredosis-titulo {
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 0.02em;
          color: var(--accent-red-soft);
          margin-bottom: 4px;
        }
        .alerta-sobredosis-texto {
          font-size: 13px;
          color: var(--accent-red-pale);
          line-height: 1.45;
        }
        .disclaimer {
          display: flex;
          gap: 8px;
          align-items: flex-start;
          font-size: 11.5px;
          color: var(--text-quaternary);
          margin-top: 14px;
          line-height: 1.4;
        }
        .disclaimer svg { flex-shrink: 0; margin-top: 1px; }
        .balance-agregar-row {
          display: flex;
          align-items: flex-end;
          gap: 10px;
        }
        .balance-agregar-row .field { flex: 1; }
        .balance-agregar-btn {
          background: var(--accent-green);
          color: var(--bg-app);
          border: none;
          border-radius: 12px;
          width: 52px;
          height: 52px;
          font-size: 26px;
          font-weight: 700;
          line-height: 1;
          cursor: pointer;
          flex-shrink: 0;
          touch-action: manipulation;
        }
        .balance-agregar-btn-egreso { background: var(--accent-orange); }
        .balance-columnas { gap: 12px; }
        .balance-columna {
          background: var(--bg-panel-alt);
          border: 1px solid var(--border-panel);
          border-radius: 14px;
          padding: 12px;
          display: flex;
          flex-direction: column;
          min-height: 140px;
        }
        .balance-columna-clickable {
          cursor: pointer;
          touch-action: manipulation;
          transition: border-color 0.15s ease, background 0.15s ease;
        }
        .balance-columna-activa-ingreso {
          border-color: var(--accent-green-border);
          background: var(--box-green-border-soft);
        }
        .balance-columna-activa-egreso {
          border-color: var(--accent-orange);
          background: var(--box-amber-bg);
        }
        .balance-columna-titulo {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.06em;
          margin-bottom: 10px;
        }
        .balance-columna-titulo-ingreso { color: var(--accent-green); }
        .balance-columna-titulo-egreso { color: var(--accent-orange); }
        .balance-vacio {
          font-size: 12.5px;
          color: var(--text-secondary);
          flex: 1;
        }
        .balance-lista {
          display: flex;
          flex-direction: column;
          gap: 6px;
          flex: 1;
        }
        .balance-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: var(--bg-panel);
          border-radius: 8px;
          padding: 8px 12px;
          font-size: 13.5px;
          font-weight: 600;
          color: var(--text-primary);
          font-variant-numeric: tabular-nums;
        }
        .balance-item-borrar {
          background: transparent;
          border: none;
          color: var(--accent-red);
          padding: 4px;
          display: flex;
          cursor: pointer;
          touch-action: manipulation;
        }
        .balance-subtotal {
          margin-top: 10px;
          padding-top: 10px;
          border-top: 1px solid var(--border-panel);
          font-size: 12.5px;
          font-weight: 700;
          color: var(--text-primary);
          font-variant-numeric: tabular-nums;
        }
        .balance-vacio-parcial {
          font-size: 12.5px;
          color: var(--text-secondary);
          padding: 4px 0 12px;
        }
        .balance-resultado-titulo {
          font-size: 12.5px;
          color: var(--text-secondary);
          font-weight: 500;
          text-align: center;
        }
        .balance-tabla-parcial {
          border: 1px solid var(--border-panel);
          border-radius: 12px;
          overflow: hidden;
          margin-bottom: 14px;
        }
        .balance-tabla-header, .balance-tabla-fila {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr 40px;
        }
        .balance-tabla-header {
          background: var(--bg-panel-alt);
        }
        .balance-tabla-header > div {
          padding: 6px 4px;
          font-size: 10.5px;
          font-weight: 700;
          color: var(--text-secondary);
          text-align: center;
        }
        .balance-tabla-header > div.balance-tabla-th-grande {
          font-size: 12.5px;
        }
        .balance-tabla-fila {
          border-top: 1px solid var(--border-panel);
        }
        .balance-tabla-fila > div {
          padding: 6px 4px;
          font-size: 15px;
          font-weight: 700;
          color: var(--text-primary);
          text-align: center;
          font-variant-numeric: tabular-nums;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .balance-tabla-header > div:not(:last-child),
        .balance-tabla-fila > div:not(:last-child) {
          border-right: 1px solid var(--border-panel);
        }
        .balance-tabla-fila > div:last-child { padding: 4px; }
        /* Selector compuesto (mismo peso que la regla base de arriba) para
           que el verde y el tamaño grande realmente ganen la cascada: una
           clase sola (.balance-tabla-col-paso) tiene MENOS especificidad
           que ".balance-tabla-fila > div" y perdía en silencio, aunque
           estuviera escrita después — por eso no se veía verde. */
        .balance-tabla-fila > div.balance-tabla-col-paso {
          color: var(--accent-green);
          font-size: 19px;
        }
        .balance-tabla-fila > div.balance-tabla-col-quedo {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-secondary);
        }
        .balance-tabla-fila > div.balance-tabla-col-vacia {
          color: var(--text-quaternary);
          font-weight: 400;
          cursor: pointer;
          touch-action: manipulation;
        }
        .balance-tabla-input {
          width: 100%;
          height: 100%;
          border: none;
          border-left: 1px solid var(--border-panel);
          background: var(--box-green-border-soft);
          color: var(--text-primary);
          font-size: 20px;
          font-weight: 700;
          font-variant-numeric: tabular-nums;
          text-align: center;
          outline: none;
          padding: 12px 4px;
          appearance: none;
        }
        .balance-parcial-form {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 8px;
        }
        .balance-parcial-form .field-label { color: var(--accent-green-deep); }
        .balance-agregar-row-egreso .field-label { color: var(--accent-orange-deep); }
        .balance-agregar-row-egreso .field-input:focus { border-color: var(--accent-orange); }
        .balance-agregar-parcial-btn {
          width: 100%;
          background: var(--accent-green);
          color: var(--bg-app);
          border: none;
          border-radius: 12px;
          padding: 12px;
          font-size: 13.5px;
          font-weight: 700;
          margin-top: 10px;
          margin-bottom: 16px;
          cursor: pointer;
          touch-action: manipulation;
        }
        .balance-subtotal-parcial-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-top: 10px;
          margin-bottom: 6px;
          padding-top: 10px;
          border-top: 1px solid var(--border-panel);
        }
        .balance-subtotal-parcial-texto {
          min-width: 0;
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
        }
        .balance-enviar-btn { flex-shrink: 0; }
        .balance-subtotal-parcial-texto strong {
          font-size: 16px;
          font-variant-numeric: tabular-nums;
        }
        .balance-texto-ingreso, .balance-texto-ingreso strong { color: var(--accent-green-deep); }
        .balance-texto-ingreso strong { color: var(--accent-green); }
        .balance-texto-egreso, .balance-texto-egreso strong { color: var(--accent-orange-deep); }
        .balance-texto-egreso strong { color: var(--accent-orange); }
        .balance-enviar-btn {
          background: transparent;
          border-radius: 20px;
          padding: 6px 10px;
          font-size: 10.5px;
          font-weight: 700;
          cursor: pointer;
          touch-action: manipulation;
          white-space: nowrap;
        }
        .balance-enviar-btn-ingreso {
          border: 1px solid var(--accent-green-border);
          color: var(--accent-green);
        }
        .balance-enviar-btn-egreso {
          border: 1px solid var(--accent-orange-deep);
          color: var(--accent-orange);
        }
        .balance-enviar-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .balance-toggle-row {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 8px;
          margin-bottom: 18px;
        }
        .balance-toggle-row .mode-tabs { margin-bottom: 0; }
        .balance-titulo-sin-margen {
          margin: 0;
          padding-top: 0;
          border-top: none;
        }
        .balance-titulo-destacado {
          font-size: 15px;
          letter-spacing: 0.02em;
          color: var(--text-primary);
        }
        .balance-titulo-ingreso { color: var(--accent-green-deep); }
        .balance-titulo-egreso { color: var(--accent-orange); }
        .balance-panel-relative { position: relative; }
        .balance-reiniciar-flotante {
          position: absolute;
          top: -14px;
          right: 4px;
          z-index: 2;
          display: flex;
          align-items: center;
          gap: 5px;
          background: var(--bg-panel);
          border: 1px solid var(--border-panel);
          color: var(--accent-green-deep);
          border-radius: 20px;
          padding: 9px 14px;
          font-size: 12px;
          font-weight: 600;
          white-space: nowrap;
          cursor: pointer;
          touch-action: manipulation;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12);
        }
        .info-note {
          background: var(--box-green-bg);
          border: 1px solid var(--box-green-border);
          color: var(--accent-green-pale);
          font-size: 12.5px;
          line-height: 1.4;
          padding: 10px 12px;
          border-radius: 10px;
          margin-bottom: 14px;
        }
        .seg-control {
          display: flex;
          background: var(--bg-panel-alt);
          border: 1px solid var(--border-panel);
          border-radius: 10px;
          padding: 3px;
          margin-bottom: 16px;
        }
        .seg-btn {
          flex: 1;
          background: transparent;
          border: none;
          color: var(--text-tertiary);
          font-size: 12.5px;
          font-weight: 600;
          padding: 9px 4px;
          border-radius: 8px;
          cursor: pointer;
        }
        .seg-btn.active {
          background: var(--box-green-bg-soft);
          color: var(--accent-green);
        }
        .mode-tabs {
          display: flex;
          gap: 6px;
          margin-bottom: 18px;
          overflow-x: auto;
        }
        .mode-tab {
          background: var(--bg-panel-alt);
          border: 1px solid var(--border-panel);
          color: var(--text-secondary);
          font-size: 12px;
          font-weight: 600;
          padding: 9px 12px;
          border-radius: 20px;
          white-space: nowrap;
          cursor: pointer;
        }
        .mode-tab.active {
          background: var(--box-green-border-soft);
          border-color: var(--accent-green-border);
          color: var(--accent-green);
        }
        .balance-toggle-row .mode-tab.active {
          background: var(--accent-green);
          border-color: var(--accent-green);
          color: var(--bg-app);
        }
        .inicio-panel {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }
        .inicio-saludo-titulo {
          font-size: 18px;
          font-weight: 700;
          color: var(--text-heading);
        }
        .inicio-saludo-sub {
          font-size: 13.5px;
          color: var(--text-tertiary);
          margin-top: 2px;
        }
        .inicio-seccion-titulo {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--text-tertiary);
          margin-bottom: 8px;
        }
        .inicio-row {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 12px;
          background: var(--bg-panel-alt);
          border: 1px solid var(--border-panel);
          border-radius: 12px;
          padding: 13px 14px;
          margin-bottom: 8px;
          font-family: inherit;
          font-size: 14.5px;
          color: var(--text-primary);
          cursor: pointer;
        }
        .inicio-row:last-child {
          margin-bottom: 0;
        }
        .inicio-row-icon {
          font-size: 18px;
        }
        .inicio-row-label {
          flex: 1;
          text-align: left;
          font-weight: 500;
        }
        .inicio-row-chevron {
          color: var(--text-tertiary);
          transform: rotate(-90deg);
        }
        .inicio-row-switch {
          cursor: default;
        }
        .inicio-footer {
          text-align: center;
          font-size: 12px;
          color: var(--text-quaternary);
          line-height: 1.5;
          margin-top: 4px;
        }
        .inicio-footer-links {
          margin-top: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .inicio-footer-link {
          color: var(--accent-green);
          font-size: 12px;
          font-weight: 600;
          text-decoration: none;
        }
        .inicio-footer-sep {
          color: var(--text-quaternary);
          font-size: 12px;
        }
        .theme-switch-btn {
          width: 50px;
          height: 28px;
          border-radius: 999px;
          border: none;
          padding: 3px;
          display: flex;
          align-items: center;
          cursor: pointer;
          transition: background 0.25s ease;
        }
        .theme-switch-btn.is-dark {
          background: var(--accent-green);
          justify-content: flex-end;
        }
        .theme-switch-btn.is-light {
          background: var(--border-panel);
          justify-content: flex-start;
        }
        .theme-switch-knob {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: #FFFFFF;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
          transition: transform 0.25s ease;
        }
        .tabbar {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: var(--bg-app-grad-top);
          border-top: 1px solid var(--border-panel);
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
          color: var(--text-quaternary);
          font-size: 11px;
          font-weight: 600;
          padding: 8px 0;
          cursor: pointer;
        }
        .tab-btn.active { color: var(--accent-green); }
      `}</style>

      <div className={`topbar ${headerColapsado ? "topbar-collapsed" : ""} ${tecladoAbierto ? "topbar-teclado-abierto" : ""}`}>
        <div className="topbar-inner">
          <div className="topbar-eyebrow-row">
            <span className="topbar-eyebrow">UTI · Herramientas clínicas</span>
            <span className="topbar-by">by Keroo</span>
          </div>
          <div className="topbar-title">Diluciones Medicamentosas</div>
          <div className="topbar-sub">Calculadora para enfermería de Área Crítica</div>
        </div>
      </div>

      <div className="topbar-spacer" />

      <div
        className="content-scale-wrap"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="tab-track" ref={trackRef}>
          <div className="tab-panel">
            <div className="tab-panel-scroll">
              <div className="tab-panel-inner content-centrado">
                <InicioMemo tema={tema} toggleTheme={toggleTheme} setTab={cambiarTab} />
              </div>
            </div>
          </div>
          <div className="tab-panel">
            <div className="tab-panel-scroll">
              <div className="tab-panel-inner">
                <DilucionesMemo />
              </div>
            </div>
          </div>
          <div className="tab-panel">
            <div className="tab-panel-scroll">
              <div className="tab-panel-inner">
                <BalanceMemo activo={tab === "balance"} />
              </div>
            </div>
          </div>
          <div className="tab-panel">
            <div className="tab-panel-scroll">
              <div className="tab-panel-inner">
                <PaFiMemo />
              </div>
            </div>
          </div>
          <div className="tab-panel">
            <div className="tab-panel-scroll">
              <div className="tab-panel-inner">
                <GoteoMemo />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="tabbar">
        <button className={`tab-btn ${tab === "inicio" ? "active" : ""}`} onClick={() => cambiarTab("inicio")}>
          <Home size={20} />
          Inicio
        </button>
        <button className={`tab-btn ${tab === "diluciones" ? "active" : ""}`} onClick={() => cambiarTab("diluciones")}>
          <Activity size={20} />
          Diluciones
        </button>
        <button className={`tab-btn ${tab === "balance" ? "active" : ""}`} onClick={() => cambiarTab("balance")}>
          <Scale size={20} />
          Balance
        </button>
        <button className={`tab-btn ${tab === "pafi" ? "active" : ""}`} onClick={() => cambiarTab("pafi")}>
          <Wind size={20} />
          PaFi
        </button>
        <button className={`tab-btn ${tab === "goteo" ? "active" : ""}`} onClick={() => cambiarTab("goteo")}>
          <Droplet size={20} />
          Goteo
        </button>
      </div>
    </div>
  );
}
