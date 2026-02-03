/**
 * Módulo de gráficos con Chart.js
 */

class ChartsManager {
    constructor() {
        this.charts = {};
    }

    /**
     * Destruye un gráfico existente antes de recrearlo
     */
    destroyChart(chartId) {
        if (this.charts[chartId]) {
            this.charts[chartId].destroy();
            delete this.charts[chartId];
        }
    }

    /**
     * Gráfico de dona para estados
     */
    createEstadosChart(ctx, data) {
        this.destroyChart('estados');

        const labels = Object.keys(data);
        const values = Object.values(data);
        const colors = labels.map(label => {
            const labelLower = label.toLowerCase();
            if (labelLower.includes('cerrad') || labelLower.includes('resuelt') || labelLower.includes('solucion')) {
                return CONFIG.CHART_COLORS.success;
            } else if (labelLower.includes('abiert') || labelLower.includes('pendiente')) {
                return CONFIG.CHART_COLORS.warning;
            } else if (labelLower.includes('urgent') || labelLower.includes('critic')) {
                return CONFIG.CHART_COLORS.danger;
            }
            return CONFIG.CHART_COLORS.primary;
        });

        this.charts['estados'] = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: colors,
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true,
                            font: {
                                size: 12
                            },
                            generateLabels: function(chart) {
                                const data = chart.data;
                                return data.labels.map((label, i) => ({
                                    text: `${label}: ${data.datasets[0].data[i]}`,
                                    fillStyle: data.datasets[0].backgroundColor[i],
                                    hidden: false,
                                    index: i
                                }));
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((context.raw / total) * 100).toFixed(1);
                                return `${context.label}: ${context.raw} (${percentage}%)`;
                            }
                        }
                    }
                },
                cutout: '60%'
            }
        });

        return this.charts['estados'];
    }

    /**
     * Gráfico de barras horizontales para tipos de incidencia
     */
    createTiposChart(ctx, data) {
        this.destroyChart('tipos');

        // Ordenar por cantidad descendente
        const sortedEntries = Object.entries(data).sort((a, b) => b[1] - a[1]);
        const labels = sortedEntries.map(e => e[0]);
        const values = sortedEntries.map(e => e[1]);
        const colors = getChartColors(labels.length);

        this.charts['tipos'] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Incidencias',
                    data: values,
                    backgroundColor: colors,
                    borderRadius: 6,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                indexAxis: 'y',
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                return `${context.raw} incidencias`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        grid: {
                            display: false
                        },
                        ticks: {
                            stepSize: 1
                        }
                    },
                    y: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });

        return this.charts['tipos'];
    }

    /**
     * Gráfico de línea para tendencia temporal
     */
    createTendenciaChart(ctx, data) {
        this.destroyChart('tendencia');

        // Ordenar por fecha
        const sortedEntries = Object.entries(data).sort((a, b) => {
            const dateA = parseDate(a[0]);
            const dateB = parseDate(b[0]);
            return dateA - dateB;
        });

        const labels = sortedEntries.map(e => e[0]);
        const values = sortedEntries.map(e => e[1]);

        this.charts['tendencia'] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Incidencias',
                    data: values,
                    borderColor: CONFIG.CHART_COLORS.primary,
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: CONFIG.CHART_COLORS.primary,
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 5,
                    pointHoverRadius: 7
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: function (context) {
                                return `${context.raw} incidencias`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        ticks: {
                            stepSize: 1
                        }
                    }
                },
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                }
            }
        });

        return this.charts['tendencia'];
    }

    /**
     * Gráfico de barras para zonas
     */
    createZonasChart(ctx, data) {
        this.destroyChart('zonas');

        // Ordenar por cantidad descendente
        const sortedEntries = Object.entries(data).sort((a, b) => b[1] - a[1]);
        const labels = sortedEntries.map(e => e[0]);
        const values = sortedEntries.map(e => e[1]);
        const colors = getChartColors(labels.length);

        this.charts['zonas'] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Incidencias',
                    data: values,
                    backgroundColor: colors,
                    borderRadius: 6,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                return `${context.raw} incidencias`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });

        return this.charts['zonas'];
    }

    /**
     * Actualiza todos los gráficos con nuevos datos
     */
    updateAllCharts(stats) {
        // Gráfico de estados
        const ctxEstados = document.getElementById('chartEstados');
        if (ctxEstados && Object.keys(stats.estados).length > 0) {
            this.createEstadosChart(ctxEstados, stats.estados);
        }

        // Gráfico de tipos
        const ctxTipos = document.getElementById('chartTipos');
        if (ctxTipos && Object.keys(stats.tiposIncidencia).length > 0) {
            this.createTiposChart(ctxTipos, stats.tiposIncidencia);
        }

        // Gráfico de tendencia
        const ctxTendencia = document.getElementById('chartTendencia');
        if (ctxTendencia && Object.keys(stats.porFecha).length > 0) {
            this.createTendenciaChart(ctxTendencia, stats.porFecha);
        }
    }
}

// Instancia global del gestor de gráficos
const chartsManager = new ChartsManager();
