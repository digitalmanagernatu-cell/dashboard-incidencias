/**
 * Aplicación principal del Dashboard de Incidencias
 */

class DashboardApp {
    constructor() {
        this.data = [];
        this.filteredData = [];
        this.currentPage = 1;
        this.itemsPerPage = CONFIG.ITEMS_PER_PAGE;
        this.sortColumn = 'fechaRegistro';
        this.sortDirection = 'desc';
        this.clientFilter = null; // Filtro de cliente activo

        this.init();
    }

    /**
     * Inicializa la aplicación
     */
    async init() {
        this.showLoading(true);
        this.bindEvents();
        this.setDefaultDates();

        try {
            await this.loadData();
            this.hideLoading();
        } catch (error) {
            this.hideLoading();
            this.showError('Error al cargar los datos. Asegúrate de que el Google Sheet esté publicado y sea accesible.');
            console.error('Error initializing app:', error);
        }
    }

    /**
     * Vincula los eventos de la interfaz
     */
    bindEvents() {
        // Botón de actualizar
        document.getElementById('refreshBtn').addEventListener('click', () => this.loadData());

        // Filtros
        document.getElementById('applyFilters').addEventListener('click', () => this.applyFilters());
        document.getElementById('resetFilters').addEventListener('click', () => this.resetFilters());

        // Actualizar automáticamente al cambiar fechas
        document.getElementById('dateFrom').addEventListener('change', () => this.applyFilters());
        document.getElementById('dateTo').addEventListener('change', () => this.applyFilters());

        // Actualizar automáticamente al cambiar zona o estado
        document.getElementById('zoneFilter').addEventListener('change', () => this.applyFilters());
        document.getElementById('statusFilter').addEventListener('change', () => this.applyFilters());

        // Búsqueda en la tabla
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.applyFilters();
        });

        // Paginación
        document.getElementById('prevPage').addEventListener('click', () => this.goToPage(this.currentPage - 1));
        document.getElementById('nextPage').addEventListener('click', () => this.goToPage(this.currentPage + 1));

        // Ordenación de tabla
        document.querySelectorAll('th[data-sort]').forEach(th => {
            th.addEventListener('click', () => this.sortTable(th.dataset.sort));
        });

        // Modal
        document.querySelector('.modal-close').addEventListener('click', () => this.closeModal());
        document.getElementById('detailModal').addEventListener('click', (e) => {
            if (e.target.id === 'detailModal') this.closeModal();
        });

        // Cerrar modal con Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeModal();
        });

        // Quitar filtro de cliente
        document.getElementById('clearClientFilter').addEventListener('click', () => this.clearClientFilter());
    }

    /**
     * Establece las fechas por defecto (últimos 7 días)
     */
    setDefaultDates() {
        const today = new Date();
        const weekAgo = getDateDaysAgo(CONFIG.DEFAULT_DAYS_FILTER);

        document.getElementById('dateTo').value = formatDateForInput(today);
        document.getElementById('dateFrom').value = formatDateForInput(weekAgo);
    }

    /**
     * Carga los datos del Google Sheet
     */
    async loadData() {
        this.showLoading(true);

        try {
            this.data = await sheetsConnector.fetchData();
            this.populateFilters();
            this.applyFilters();
            this.updateLastUpdate();
        } catch (error) {
            throw error;
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Rellena los selectores de filtros con valores únicos
     */
    populateFilters() {
        // Zonas
        const zoneSelect = document.getElementById('zoneFilter');
        const zones = sheetsConnector.getUniqueValues('zona');
        zoneSelect.innerHTML = '<option value="">Todas las zonas</option>';
        zones.forEach(zone => {
            zoneSelect.innerHTML += `<option value="${zone}">${zone}</option>`;
        });

        // Estados
        const statusSelect = document.getElementById('statusFilter');
        const estados = ['Abierta', 'Cerrada'];
        statusSelect.innerHTML = '<option value="">Todos los estados</option>';
        estados.forEach(estado => {
            statusSelect.innerHTML += `<option value="${estado}">${estado}</option>`;
        });
    }

    /**
     * Aplica los filtros seleccionados
     */
    applyFilters() {
        const filters = {
            dateFrom: document.getElementById('dateFrom').value,
            dateTo: document.getElementById('dateTo').value,
            zona: document.getElementById('zoneFilter').value,
            estado: document.getElementById('statusFilter').value,
            search: document.getElementById('searchInput').value,
            cliente: this.clientFilter
        };

        this.filteredData = sheetsConnector.filterData(filters);
        this.currentPage = 1;
        this.updateDashboard();
        this.updateClientFilterUI();
    }

    /**
     * Filtra por cliente
     */
    filterByClient(clientName) {
        this.clientFilter = clientName;
        this.applyFilters();
    }

    /**
     * Quita el filtro de cliente
     */
    clearClientFilter() {
        this.clientFilter = null;
        this.applyFilters();
    }

    /**
     * Actualiza la UI del filtro de cliente
     */
    updateClientFilterUI() {
        const filterEl = document.getElementById('clientFilter');
        const valueEl = document.getElementById('clientFilterValue');

        if (this.clientFilter) {
            valueEl.textContent = this.clientFilter;
            filterEl.classList.add('show');
        } else {
            filterEl.classList.remove('show');
        }
    }

    /**
     * Resetea los filtros a sus valores por defecto
     */
    resetFilters() {
        this.setDefaultDates();
        document.getElementById('zoneFilter').value = '';
        document.getElementById('statusFilter').value = '';
        document.getElementById('searchInput').value = '';
        this.clientFilter = null;
        this.applyFilters();
    }

    /**
     * Actualiza todo el dashboard con los datos filtrados
     */
    updateDashboard() {
        const stats = sheetsConnector.getStats(this.filteredData);

        // Actualizar KPIs
        this.updateKPIs(stats);

        // Actualizar gráficos
        chartsManager.updateAllCharts(stats);

        // Actualizar tabla
        this.updateTable();
    }

    /**
     * Actualiza los KPIs
     */
    updateKPIs(stats) {
        document.getElementById('totalIncidencias').textContent = stats.total;
        document.getElementById('incidenciasAbiertas').textContent = stats.abiertas;
        document.getElementById('incidenciasCerradas').textContent = stats.cerradas;
        document.getElementById('totalZonas').textContent = stats.zonas;
    }

    /**
     * Actualiza la tabla de incidencias
     */
    updateTable() {
        const tableBody = document.getElementById('tableBody');

        // Ordenar datos
        const sortedData = this.getSortedData();

        // Paginar datos
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const pageData = sortedData.slice(startIndex, endIndex);

        // Generar filas
        if (pageData.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="9" class="empty-state">
                        <p>No se encontraron incidencias con los filtros seleccionados</p>
                    </td>
                </tr>
            `;
        } else {
            tableBody.innerHTML = pageData.map(item => this.createTableRow(item)).join('');
        }

        // Vincular eventos de los botones de detalle
        tableBody.querySelectorAll('.btn-view').forEach(btn => {
            btn.addEventListener('click', () => this.showDetail(btn.dataset.id));
        });

        // Vincular eventos de clic en el cliente
        tableBody.querySelectorAll('.client-link').forEach(link => {
            link.addEventListener('click', () => this.filterByClient(link.dataset.client));
        });

        // Actualizar paginación
        this.updatePagination(sortedData.length);
    }

    /**
     * Crea una fila de la tabla
     */
    createTableRow(item) {
        const statusClass = this.getStatusClass(item.estadoNormalizado);
        const clientName = this.escapeHtml(item.nombreCliente);

        return `
            <tr>
                <td><strong>${this.escapeHtml(item.numIncidencia)}</strong></td>
                <td>${this.escapeHtml(item.numCliente)}</td>
                <td><span class="client-link" data-client="${clientName}">${clientName}</span></td>
                <td>${this.escapeHtml(item.comercial)}</td>
                <td>${this.escapeHtml(item.zona)}</td>
                <td>${this.escapeHtml(item.tipoIncidencia)}</td>
                <td>${this.escapeHtml(item.fechaRegistro)}</td>
                <td><span class="status-badge ${statusClass}">${this.escapeHtml(item.estado)}</span></td>
                <td><button class="btn-view" data-id="${item.id}">Ver</button></td>
            </tr>
        `;
    }

    /**
     * Obtiene la clase CSS para el estado
     */
    getStatusClass(estado) {
        const estadoLower = estado.toLowerCase();
        if (estadoLower === 'abierta') return 'abierta';
        if (estadoLower === 'cerrada') return 'cerrada';
        return '';
    }

    /**
     * Ordena los datos según la columna seleccionada
     */
    getSortedData() {
        return [...this.filteredData].sort((a, b) => {
            let valueA = a[this.sortColumn];
            let valueB = b[this.sortColumn];

            // Para fechas, usar la fecha parseada
            if (this.sortColumn === 'fechaRegistro') {
                valueA = a.fechaRegistroParsed || new Date(0);
                valueB = b.fechaRegistroParsed || new Date(0);
            }

            // Comparación
            if (valueA < valueB) return this.sortDirection === 'asc' ? -1 : 1;
            if (valueA > valueB) return this.sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }

    /**
     * Ordena la tabla por una columna
     */
    sortTable(column) {
        if (this.sortColumn === column) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = column;
            this.sortDirection = 'asc';
        }

        // Actualizar indicadores visuales
        document.querySelectorAll('th[data-sort]').forEach(th => {
            th.classList.remove('sort-asc', 'sort-desc');
            if (th.dataset.sort === column) {
                th.classList.add(this.sortDirection === 'asc' ? 'sort-asc' : 'sort-desc');
            }
        });

        this.updateTable();
    }

    /**
     * Actualiza la información de paginación
     */
    updatePagination(totalItems) {
        const totalPages = Math.ceil(totalItems / this.itemsPerPage) || 1;
        const startItem = totalItems === 0 ? 0 : (this.currentPage - 1) * this.itemsPerPage + 1;
        const endItem = Math.min(this.currentPage * this.itemsPerPage, totalItems);

        document.getElementById('paginationInfo').textContent =
            `Mostrando ${startItem}-${endItem} de ${totalItems}`;
        document.getElementById('currentPage').textContent =
            `Página ${this.currentPage} de ${totalPages}`;

        document.getElementById('prevPage').disabled = this.currentPage <= 1;
        document.getElementById('nextPage').disabled = this.currentPage >= totalPages;
    }

    /**
     * Navega a una página específica
     */
    goToPage(page) {
        const totalPages = Math.ceil(this.filteredData.length / this.itemsPerPage) || 1;
        if (page >= 1 && page <= totalPages) {
            this.currentPage = page;
            this.updateTable();
        }
    }

    /**
     * Muestra el detalle de una incidencia
     */
    showDetail(id) {
        const item = this.filteredData.find(i => i.id === parseInt(id));
        if (!item) return;

        this.currentDetailItem = item;

        const modalBody = document.getElementById('modalBody');
        modalBody.innerHTML = `
            <div class="detail-row">
                <span class="detail-label">N° Incidencia:</span>
                <span class="detail-value">${this.escapeHtml(item.numIncidencia)}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">N° Cliente:</span>
                <span class="detail-value">${this.escapeHtml(item.numCliente)}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Nombre Cliente:</span>
                <span class="detail-value">${this.escapeHtml(item.nombreCliente)}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">CIF:</span>
                <span class="detail-value">${this.escapeHtml(item.cif)}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Comercial:</span>
                <span class="detail-value">${this.escapeHtml(item.comercial)}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Zona:</span>
                <span class="detail-value">${this.escapeHtml(item.zona)}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">N° Factura:</span>
                <span class="detail-value">${this.escapeHtml(item.numFactura)}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Tipo de Incidencia:</span>
                <span class="detail-value">${this.escapeHtml(item.tipoIncidencia)}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Descripción:</span>
                <span class="detail-value">${this.escapeHtml(item.descripcion)}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Fecha de Registro:</span>
                <span class="detail-value">${this.escapeHtml(item.fechaRegistro)}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Estado:</span>
                <span class="detail-value">
                    <span id="currentStatus" class="status-badge ${this.getStatusClass(item.estadoNormalizado)}">
                        ${this.escapeHtml(item.estado)}
                    </span>
                </span>
            </div>
            <div class="status-actions">
                <span class="status-actions-label">Cambiar estado:</span>
                <button class="btn-status btn-pendiente" data-status="Pendiente">Pendiente</button>
                <button class="btn-status btn-cerrada" data-status="Cerrada">Cerrada</button>
            </div>
            <div id="statusMessage" class="status-message"></div>
        `;

        // Vincular eventos de los botones de estado
        modalBody.querySelectorAll('.btn-status').forEach(btn => {
            btn.addEventListener('click', () => this.changeStatus(item.numIncidencia, btn.dataset.status));
        });

        document.getElementById('detailModal').classList.add('active');
    }

    /**
     * Cambia el estado de una incidencia
     */
    async changeStatus(numIncidencia, nuevoEstado) {
        const messageEl = document.getElementById('statusMessage');
        messageEl.textContent = 'Actualizando...';
        messageEl.className = 'status-message loading';

        try {
            // Construir URL con parámetros GET
            const url = `${CONFIG.APPS_SCRIPT_URL}?numIncidencia=${encodeURIComponent(numIncidencia)}&estado=${encodeURIComponent(nuevoEstado)}`;

            // Usar un iframe oculto para hacer la petición (evita CORS)
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            iframe.src = url;
            document.body.appendChild(iframe);

            // Esperar a que el Apps Script procese la petición
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Limpiar iframe
            document.body.removeChild(iframe);

            // Cerrar modal
            this.closeModal();

            // Mostrar carga y esperar un poco más para que Google Sheets se actualice
            this.showLoading(true);
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Recargar datos frescos del Sheet
            this.data = await sheetsConnector.fetchData();
            this.applyFilters();
            this.updateLastUpdate();
            this.hideLoading();

        } catch (error) {
            console.error('Error updating status:', error);
            this.hideLoading();
            alert('Error al actualizar el estado. Inténtalo de nuevo.');
        }
    }

    /**
     * Cierra el modal
     */
    closeModal() {
        document.getElementById('detailModal').classList.remove('active');
    }

    /**
     * Actualiza el timestamp de última actualización
     */
    updateLastUpdate() {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit'
        });
        const dateStr = now.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
        document.getElementById('lastUpdate').textContent =
            `Última actualización: ${dateStr} ${timeStr}`;
    }

    /**
     * Muestra el overlay de carga
     */
    showLoading(show) {
        const overlay = document.getElementById('loadingOverlay');
        if (show) {
            overlay.classList.add('active');
        } else {
            overlay.classList.remove('active');
        }
    }

    /**
     * Oculta el overlay de carga
     */
    hideLoading() {
        document.getElementById('loadingOverlay').classList.remove('active');
    }

    /**
     * Muestra un mensaje de error
     */
    showError(message) {
        // Crear elemento de error si no existe
        let errorEl = document.querySelector('.error-message');
        if (!errorEl) {
            errorEl = document.createElement('div');
            errorEl.className = 'error-message';
            document.querySelector('.filters').insertAdjacentElement('beforebegin', errorEl);
        }
        errorEl.textContent = message;
        errorEl.classList.add('active');
    }

    /**
     * Escapa HTML para prevenir XSS
     */
    escapeHtml(text) {
        if (!text) return '-';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Iniciar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.dashboardApp = new DashboardApp();
});
