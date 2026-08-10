import React from "react";

// Capa de seguridad de la interfaz: si algo revienta durante el renderizado
// de <App/>, evita la pantalla en blanco y ofrece una salida clara. No toca
// lógica de negocio ni datos — el Balance ya se persiste solo en cada cambio
// (ver localStorage en App.jsx), así que "Recargar" siempre recupera el
// estado tal cual estaba, sin que este componente tenga que hacer nada con
// localStorage.
//
// Garantía de privacidad, por diseño y no por filtrado: este componente vive
// fuera de <App/> (se monta en main.jsx, envolviéndola) y nunca recibe props
// con datos de pacientes, Balance o inputs. El texto que arma para copiar
// sale ÚNICAMENTE de lo que el motor de JS informa sobre el error en sí
// (nombre, mensaje, stack) más datos de entorno genéricos — nunca del estado
// de la app, porque este componente jamás tuvo acceso a él.

const TEMA_STORAGE_KEY = "diluciones-uti-tema";

function leerTemaGuardado() {
  try {
    return localStorage.getItem(TEMA_STORAGE_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

const PALETAS = {
  dark: {
    bgApp: "#0B1210",
    bgPanel: "#101C18",
    bgPanelAlt: "#0B1512",
    textPrimary: "#EAF2EE",
    textSecondary: "#9FB8AC",
    textHeading: "#F4FBF7",
    borderPanel: "#1B2A25",
    accentGreen: "#4FD195",
    accentGreenDeep: "#5FA88A",
    accentRed: "#FF453A",
  },
  light: {
    bgApp: "#EEF3EF",
    bgPanel: "#FBFDFB",
    bgPanelAlt: "#F4F8F5",
    textPrimary: "#15211C",
    textSecondary: "#4A6359",
    textHeading: "#0E1714",
    borderPanel: "#DCE6E0",
    accentGreen: "#1F9E63",
    accentGreenDeep: "#2C7A5C",
    accentRed: "#D6332A",
  },
};

const FONT_SANS = '-apple-system, "SF Pro Text", "Inter", system-ui, sans-serif';
const FONT_SERIF = '"Georgia", "Iowan Old Style", serif';

// Best-effort: el motor de JS no incluye VALORES de variables en sus propios
// mensajes de error (solo nombres de propiedad/tipo, ej. "Cannot read
// properties of undefined (reading 'valor')" — 'valor' ahí es un nombre de
// campo del código, no un dato clínico). Hoy no hay ningún throw propio que
// interpole datos de la app (verificado: el único throw manual de todo el
// código es un string fijo, sin ninguna variable). Esto es una red de
// seguridad adicional para el futuro, no la garantía real (la garantía real
// es que este componente nunca tuvo el dato para empezar). Redacta
// substrings entre comillas que contengan un espacio — un nombre de
// propiedad de código nunca lleva espacio, un label/texto libre sí.
function sanitizar(texto) {
  if (!texto) return texto;
  return texto
    .replace(/"[^"]*\s[^"]*"/g, '"[dato omitido]"')
    .replace(/'[^']*\s[^']*'/g, "'[dato omitido]'");
}

function copiarConFallbackLegacy(texto) {
  const textarea = document.createElement("textarea");
  textarea.value = texto;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  document.body.removeChild(textarea);
  return ok;
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, aviso: "" };
    this.recargar = this.recargar.bind(this);
    this.copiarDetalles = this.copiarDetalles.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Solo consola local del dispositivo — nada de esto sale del teléfono.
    console.error("UTI Herramientas — error de renderizado:", error, info);
  }

  recargar() {
    window.location.reload();
  }

  construirTextoError() {
    const { error } = this.state;
    const nombre = error?.name || "Error";
    const mensaje = sanitizar(error?.message || "(sin mensaje)");
    const stack = sanitizar(error?.stack || "(sin stack trace)");
    let fecha = "";
    try {
      fecha = new Date().toISOString();
    } catch {
      fecha = "";
    }
    return `UTI Herramientas — reporte de error de interfaz

${nombre}: ${mensaje}

Stack:
${stack}

Navegador: ${navigator.userAgent}
Fecha: ${fecha}

Este reporte no incluye datos de pacientes, ingresos, egresos, balances ni ningún valor cargado en la app.`;
  }

  async copiarDetalles() {
    const texto = this.construirTextoError();
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(texto);
        this.setState({ aviso: "Detalles copiados al portapapeles" });
        return;
      } catch {
        // sigue al fallback de abajo
      }
    }
    const ok = copiarConFallbackLegacy(texto);
    this.setState({
      aviso: ok ? "Detalles copiados al portapapeles" : "No se pudo copiar: el dispositivo no lo permite.",
    });
  }

  render() {
    if (!this.state.error) return this.props.children;

    const pal = PALETAS[leerTemaGuardado()];
    const { error, aviso } = this.state;

    return (
      <div
        style={{
          minHeight: "100vh",
          background: pal.bgApp,
          color: pal.textPrimary,
          fontFamily: FONT_SANS,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px 16px",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 420,
            background: pal.bgPanel,
            border: `1px solid ${pal.borderPanel}`,
            borderRadius: 16,
            padding: 22,
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              fontSize: 11.5,
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: pal.accentGreenDeep,
              marginBottom: 6,
            }}
          >
            UTI Herramientas
          </div>
          <div
            style={{
              fontFamily: FONT_SERIF,
              fontSize: 22,
              fontWeight: 600,
              color: pal.textHeading,
              marginBottom: 10,
              letterSpacing: "-0.01em",
            }}
          >
            Se produjo un error
          </div>
          <div style={{ fontSize: 14, lineHeight: 1.5, color: pal.textPrimary, marginBottom: 4 }}>
            La pantalla se interrumpió por un error inesperado en la interfaz.
          </div>
          <div style={{ fontSize: 14, lineHeight: 1.5, color: pal.textSecondary, marginBottom: 16 }}>
            Tus datos de Balance no se pierden: siguen guardados en este dispositivo.
          </div>

          <div
            style={{
              background: pal.bgPanelAlt,
              border: `1px solid ${pal.borderPanel}`,
              borderRadius: 10,
              padding: "10px 12px",
              marginBottom: 18,
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              fontSize: 12,
              color: pal.textSecondary,
              wordBreak: "break-word",
            }}
          >
            {(error?.name || "Error") + ": " + sanitizar(error?.message || "(sin mensaje)")}
          </div>

          <button
            type="button"
            onClick={this.recargar}
            style={{
              width: "100%",
              background: pal.accentGreen,
              color: pal.bgApp,
              border: "none",
              borderRadius: 12,
              padding: "13px 16px",
              fontSize: 15,
              fontWeight: 700,
              cursor: "pointer",
              marginBottom: 10,
              touchAction: "manipulation",
            }}
          >
            Recargar aplicación
          </button>

          <button
            type="button"
            onClick={this.copiarDetalles}
            style={{
              width: "100%",
              background: "transparent",
              color: pal.textPrimary,
              border: `1px solid ${pal.borderPanel}`,
              borderRadius: 12,
              padding: "13px 16px",
              fontSize: 15,
              fontWeight: 700,
              cursor: "pointer",
              touchAction: "manipulation",
            }}
          >
            Copiar detalles del error
          </button>

          {aviso && (
            <div
              style={{
                marginTop: 12,
                fontSize: 12.5,
                fontWeight: 600,
                color: pal.textSecondary,
                textAlign: "center",
              }}
            >
              {aviso}
            </div>
          )}
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
