/**
 * Configuración del Dashboard de Incidencias
 */
const CONFIG = {
    // ID del Google Sheet (extraído de la URL)
    SHEET_ID: '1iBj9rNODDGplEJq77IBjGz_dq7THOXaCi3FOXiyQr2Y',

    // Nombre de la hoja (gid=0 corresponde a la primera hoja)
    SHEET_NAME: 'Sheet1',

    // Número de GID de la hoja
    SHEET_GID: 0,

    // Mapeo de columnas del Sheet
    COLUMNS: {
        NUM_INCIDENCIA: 0,
        NUM_CLIENTE: 1,
        NOMBRE_CLIENTE: 2,
        CIF: 3,
        COMERCIAL: 4,
        ZONA: 5,
        NUM_FACTURA: 6,
        TIPO_INCIDENCIA: 7,
        DESCRIPCION: 8,
        FECHA_REGISTRO: 9,
        ESTADO: 10
    },

    // Configuración de paginación
    ITEMS_PER_PAGE: 10,

    // Días por defecto para el filtro de fecha
    DEFAULT_DAYS_FILTER: 7,

    // Colores para los gráficos (solo paleta corporativa)
    CHART_COLORS: {
        primary: '#5C6B73',
        success: '#9DB4C0',
        warning: '#C2DFE3',
        danger: '#5C6B73',
        purple: '#9DB4C0',
        pink: '#C2DFE3',
        cyan: '#E0FBFC',
        orange: '#5C6B73',
        teal: '#9DB4C0',
        indigo: '#C2DFE3'
    },

    // Estados posibles (para normalización)
    ESTADOS: {
        ABIERTA: ['abierta', 'abierto', 'pendiente', 'en proceso', 'en curso', 'nueva'],
        CERRADA: ['cerrada', 'cerrado', 'resuelta', 'resuelto', 'solucionada', 'solucionado', 'completada', 'completado']
    },

    // Formato de fecha esperado en el Sheet
    DATE_FORMAT: 'DD/MM/YYYY',

    // URL del Google Apps Script para actualizar estados
    APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbzug3pLcLNYVyvJHtTEXjjU9boPmHCmFiLb0cRwSoSArSIYBcxJ9-mlNDtcxwb75gdJQw/exec'
};

// Función para obtener un array de colores
function getChartColors(count) {
    const colors = Object.values(CONFIG.CHART_COLORS);
    const result = [];
    for (let i = 0; i < count; i++) {
        result.push(colors[i % colors.length]);
    }
    return result;
}

// Función para normalizar el estado
function normalizeEstado(estado) {
    if (!estado) return 'Sin estado';
    const estadoLower = estado.toLowerCase().trim();

    if (CONFIG.ESTADOS.ABIERTA.some(e => estadoLower.includes(e))) {
        return 'Abierta';
    }
    if (CONFIG.ESTADOS.CERRADA.some(e => estadoLower.includes(e))) {
        return 'Cerrada';
    }
    return estado;
}

// Función para parsear fecha de varios formatos
function parseDate(dateStr) {
    if (!dateStr) return null;

    // Formato especial del formulario: "Jan 30, 2026/01/YYYY 13:14:12"
    // Extraer solo la parte "Jan 30, 2026"
    const specialFormat = dateStr.match(/^([A-Za-z]{3}\s+\d{1,2},\s+\d{4})/);
    if (specialFormat) {
        const date = new Date(specialFormat[1]);
        if (!isNaN(date.getTime())) {
            return date;
        }
    }

    // Intentar varios formatos comunes
    const formats = [
        // DD/MM/YYYY
        /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
        // DD-MM-YYYY
        /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
        // YYYY-MM-DD
        /^(\d{4})-(\d{1,2})-(\d{1,2})$/
    ];

    for (const format of formats) {
        const match = dateStr.match(format);
        if (match) {
            if (format === formats[2]) {
                // YYYY-MM-DD
                return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
            } else {
                // DD/MM/YYYY o DD-MM-YYYY
                return new Date(parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1]));
            }
        }
    }

    // Intentar parseo directo como fallback
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
}

// Función para formatear fecha
function formatDate(date) {
    if (!date) return '-';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

// Función para obtener fecha hace N días
function getDateDaysAgo(days) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date;
}

// Función para formatear fecha para input date
function formatDateForInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
