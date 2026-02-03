/**
 * Módulo para conectar con Google Sheets
 * Usa el endpoint público de exportación CSV
 */

class SheetsConnector {
    constructor(sheetId, gid = 0) {
        this.sheetId = sheetId;
        this.gid = gid;
        this.data = [];
        this.rawData = [];
    }

    /**
     * Construye la URL para obtener el CSV del Google Sheet
     * Incluye parámetro anti-caché para forzar datos frescos
     */
    getCSVUrl() {
        const cacheBuster = Date.now();
        return `https://docs.google.com/spreadsheets/d/${this.sheetId}/export?format=csv&gid=${this.gid}&_=${cacheBuster}`;
    }

    /**
     * Obtiene y parsea los datos del Google Sheet
     */
    async fetchData() {
        try {
            const url = this.getCSVUrl();
            const response = await fetch(url, {
                cache: 'no-store',
                headers: {
                    'Cache-Control': 'no-cache'
                }
            });

            if (!response.ok) {
                throw new Error(`Error al obtener datos: ${response.status} ${response.statusText}`);
            }

            const csvText = await response.text();
            this.rawData = this.parseCSV(csvText);
            this.data = this.transformData(this.rawData);

            return this.data;
        } catch (error) {
            console.error('Error fetching sheet data:', error);
            throw error;
        }
    }

    /**
     * Parsea el texto CSV a un array de arrays
     */
    parseCSV(csvText) {
        const lines = [];
        let currentLine = [];
        let currentField = '';
        let insideQuotes = false;

        for (let i = 0; i < csvText.length; i++) {
            const char = csvText[i];
            const nextChar = csvText[i + 1];

            if (insideQuotes) {
                if (char === '"' && nextChar === '"') {
                    // Escaped quote
                    currentField += '"';
                    i++;
                } else if (char === '"') {
                    // End of quoted field
                    insideQuotes = false;
                } else {
                    currentField += char;
                }
            } else {
                if (char === '"') {
                    // Start of quoted field
                    insideQuotes = true;
                } else if (char === ',') {
                    // End of field
                    currentLine.push(currentField.trim());
                    currentField = '';
                } else if (char === '\n' || (char === '\r' && nextChar === '\n')) {
                    // End of line
                    currentLine.push(currentField.trim());
                    if (currentLine.some(field => field !== '')) {
                        lines.push(currentLine);
                    }
                    currentLine = [];
                    currentField = '';
                    if (char === '\r') i++;
                } else if (char !== '\r') {
                    currentField += char;
                }
            }
        }

        // Última línea
        if (currentField || currentLine.length > 0) {
            currentLine.push(currentField.trim());
            if (currentLine.some(field => field !== '')) {
                lines.push(currentLine);
            }
        }

        return lines;
    }

    /**
     * Transforma los datos raw a objetos estructurados
     */
    transformData(rawData) {
        if (rawData.length < 2) return [];

        // Primera fila son los headers
        const headers = rawData[0];
        const dataRows = rawData.slice(1);

        return dataRows.map((row, index) => {
            const cols = CONFIG.COLUMNS;
            return {
                id: index + 1,
                numIncidencia: row[cols.NUM_INCIDENCIA] || '',
                numCliente: row[cols.NUM_CLIENTE] || '',
                nombreCliente: row[cols.NOMBRE_CLIENTE] || '',
                cif: row[cols.CIF] || '',
                comercial: row[cols.COMERCIAL] || '',
                zona: row[cols.ZONA] || '',
                numFactura: row[cols.NUM_FACTURA] || '',
                tipoIncidencia: row[cols.TIPO_INCIDENCIA] || '',
                descripcion: row[cols.DESCRIPCION] || '',
                fechaRegistro: row[cols.FECHA_REGISTRO] || '',
                fechaRegistroParsed: parseDate(row[cols.FECHA_REGISTRO]),
                estado: row[cols.ESTADO] || '',
                estadoNormalizado: normalizeEstado(row[cols.ESTADO])
            };
        }).filter(item => item.numIncidencia); // Filtrar filas vacías
    }

    /**
     * Obtiene los datos ya procesados
     */
    getData() {
        return this.data;
    }

    /**
     * Obtiene valores únicos de una columna
     */
    getUniqueValues(field) {
        const values = new Set();
        this.data.forEach(item => {
            if (item[field]) {
                values.add(item[field]);
            }
        });
        return Array.from(values).sort();
    }

    /**
     * Filtra los datos según criterios
     */
    filterData(filters = {}) {
        return this.data.filter(item => {
            // Filtro por fecha desde
            if (filters.dateFrom) {
                const fromDate = new Date(filters.dateFrom);
                fromDate.setHours(0, 0, 0, 0);
                if (!item.fechaRegistroParsed || item.fechaRegistroParsed < fromDate) {
                    return false;
                }
            }

            // Filtro por fecha hasta
            if (filters.dateTo) {
                const toDate = new Date(filters.dateTo);
                toDate.setHours(23, 59, 59, 999);
                if (!item.fechaRegistroParsed || item.fechaRegistroParsed > toDate) {
                    return false;
                }
            }

            // Filtro por zona
            if (filters.zona && item.zona !== filters.zona) {
                return false;
            }

            // Filtro por estado
            if (filters.estado && item.estadoNormalizado !== filters.estado) {
                return false;
            }

            // Filtro por cliente
            if (filters.cliente && item.nombreCliente !== filters.cliente) {
                return false;
            }

            // Filtro por búsqueda de texto
            if (filters.search) {
                const searchLower = filters.search.toLowerCase();
                const searchableFields = [
                    item.numIncidencia,
                    item.nombreCliente,
                    item.comercial,
                    item.zona,
                    item.tipoIncidencia,
                    item.descripcion
                ];
                const matches = searchableFields.some(field =>
                    field && field.toLowerCase().includes(searchLower)
                );
                if (!matches) return false;
            }

            return true;
        });
    }

    /**
     * Calcula estadísticas de los datos
     */
    getStats(data = null) {
        const items = data || this.data;

        const stats = {
            total: items.length,
            abiertas: 0,
            cerradas: 0,
            zonas: new Set(),
            tiposIncidencia: {},
            estados: {},
            porFecha: {},
            porZona: {}
        };

        items.forEach(item => {
            // Contar por estado normalizado
            if (item.estadoNormalizado === 'Abierta') {
                stats.abiertas++;
            } else if (item.estadoNormalizado === 'Cerrada') {
                stats.cerradas++;
            }

            // Zonas únicas
            if (item.zona) {
                stats.zonas.add(item.zona);
            }

            // Contar por tipo de incidencia
            if (item.tipoIncidencia) {
                stats.tiposIncidencia[item.tipoIncidencia] =
                    (stats.tiposIncidencia[item.tipoIncidencia] || 0) + 1;
            }

            // Contar por estado normalizado (agrupa Pendiente/Pendient, etc.)
            if (item.estadoNormalizado) {
                stats.estados[item.estadoNormalizado] = (stats.estados[item.estadoNormalizado] || 0) + 1;
            }

            // Contar por fecha
            if (item.fechaRegistroParsed) {
                const dateKey = formatDate(item.fechaRegistroParsed);
                stats.porFecha[dateKey] = (stats.porFecha[dateKey] || 0) + 1;
            }

            // Contar por zona
            if (item.zona) {
                stats.porZona[item.zona] = (stats.porZona[item.zona] || 0) + 1;
            }
        });

        stats.zonas = stats.zonas.size;

        return stats;
    }
}

// Instancia global del conector
const sheetsConnector = new SheetsConnector(CONFIG.SHEET_ID, CONFIG.SHEET_GID);
