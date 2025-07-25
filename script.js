document.addEventListener('DOMContentLoaded', () => {
    // === SECCIÓN 1: DECLARACIÓN DE CONSTANTES (REESTRUCTURADO PARA CLARIDAD) ===
    const loginContainer = document.getElementById('login-container');
    const mainContainer = document.getElementById('main-container');
    const loginForm = document.getElementById('login-form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const errorMessage = document.getElementById('error-message');
    const logoutButton = document.getElementById('logout-btn');
    const welcomeMessage = document.getElementById('welcome-message');
    
    // Contenedores y Pestañas
    const tabProductividad = document.getElementById('tab-productividad');
    const tabCumplimiento = document.getElementById('tab-cumplimiento');
    const reportProductividad = document.getElementById('report-productividad');
    const reportCumplimiento = document.getElementById('report-cumplimiento');

    // Elementos de Productividad
    const supervisorSelectProd = document.getElementById('supervisor-select-prod');
    const promotorSelectProd = document.getElementById('promotor-select-prod');
    const chartContainer = document.getElementById('chart-container');
    
    // Elementos de Cumplimiento/Apego
    const supervisorSelectCump = document.getElementById('supervisor-select-cump');
    const promotorSelectCump = document.getElementById('promotor-select-cump');
    const summaryContainer = document.getElementById('summary-container');
    const tableContainer = document.getElementById('table-container');
    
    // Elementos de Modales
    const modalContainer = document.getElementById('modal-container');
    const modalCloseButton = modalContainer.querySelector('.modal-close-button');
    const modalTableContainer = document.getElementById('modal-table-container');
    const modalTitle = document.getElementById('modal-title');
    const nomenclaturaBtn = document.getElementById('nomenclatura-btn');
    const modalNomenclaturaContainer = document.getElementById('modal-nomenclatura-container');
    const modalNomenclaturaCloseButton = modalNomenclaturaContainer.querySelector('.modal-close-button');
    const modalNomenclaturaTableContainer = document.getElementById('modal-nomenclatura-table-container');

    // Variables de estado
    let webData = null;
    let chart = null;

    // === SECCIÓN 2: LÓGICA DE LA APLICACIÓN ===

    // --- Carga inicial de datos ---
    fetch('data.json')
        .then(resp => {
            if (!resp.ok) {
                throw new Error(`Error HTTP: ${resp.status}`);
            }
            return resp.json();
        })
        .then(data => { 
            webData = data;
            console.log("Datos unificados cargados correctamente:", webData);
            if (webData && webData.fechaActualizacion) {
                document.getElementById('update-date-value-prod').textContent = webData.fechaActualizacion;
                document.getElementById('update-date-value-cump').textContent = webData.fechaActualizacion;
            }
        })
        .catch(err => {
            console.error("Error al cargar o parsear data.json:", err);
            errorMessage.textContent = "Error fatal al cargar datos. Por favor, contacta al administrador.";
            loginForm.querySelector('button').disabled = true;
        });
        
    // --- Lógica de Login ---
    loginForm.addEventListener('submit', e => {
        e.preventDefault();
        const email = emailInput.value.toLowerCase().trim();
        const password = passwordInput.value.trim(); // No convertir a minúsculas, las iniciales pueden ser sensibles
        const user = webData?.usuarios?.[email];

        if (user && user.password === password) {
            loginContainer.classList.add('hidden');
            mainContainer.classList.remove('hidden');
            setTimeout(() => mainContainer.classList.add('visible'), 50);
            setupMainInterface(user);
        } else {
            errorMessage.textContent = "Correo o contraseña incorrectos.";
        }
    });

    // --- Lógica del botón de Logout (REPARADO Y MOVIDO) ---
    if(logoutButton) {
        logoutButton.addEventListener('click', () => {
            location.reload();
        });
    }

    // --- Lógica de Pestañas ---
    tabProductividad.addEventListener('click', () => switchTab('productividad'));
    tabCumplimiento.addEventListener('click', () => switchTab('cumplimiento'));
    
    function switchTab(activeTab) {
        tabProductividad.classList.toggle('active', activeTab === 'productividad');
        tabCumplimiento.classList.toggle('active', activeTab === 'cumplimiento');
        reportProductividad.classList.toggle('hidden', activeTab !== 'productividad');
        reportCumplimiento.classList.toggle('hidden', activeTab === 'productividad');
    }

    // --- Configuración de la interfaz principal post-login ---
    function setupMainInterface(user) {
        welcomeMessage.textContent = `Bienvenido, ${user.nombre}`;
        const ejecutivoDataProd = webData.reporteData.productividad[user.lookup_key] || {};
        const ejecutivoDataCump = webData.reporteData.cumplimiento[user.lookup_key] || {};
        setupDropdowns('prod', ejecutivoDataProd, supervisorSelectProd, promotorSelectProd, renderChart);
        setupDropdowns('cump', ejecutivoDataCump, supervisorSelectCump, promotorSelectCump, renderApegoTable);
    }

    // --- Configuración de Dropdowns (lógica genérica) ---
    function setupDropdowns(type, ejecutivoData, supervisorSelect, promotorSelect, renderFunction) {
        const supervisores = Object.keys(ejecutivoData).sort();
        supervisorSelect.innerHTML = '<option value="">-- Elige un supervisor --</option>';
        if (supervisores.length === 0) {
            supervisorSelect.disabled = true;
            supervisorSelect.innerHTML = '<option>-- No hay supervisores --</option>';
            return;
        }
        supervisorSelect.disabled = false;
        supervisores.forEach(key => {
            const o = document.createElement('option');
            o.value = key; 
            o.textContent = key.replace(/_/g, ' ');
            supervisorSelect.appendChild(o);
        });

        supervisorSelect.addEventListener('change', () => {
            promotorSelect.innerHTML = '<option value="">-- Elige un promotor --</option>';
            promotorSelect.disabled = true;
            // Limpiar vista anterior
            if (type === 'prod') {
                if (chart) chart.destroy();
                chartContainer.innerHTML = '';
            } else if (type === 'cump') {
                tableContainer.innerHTML = '';
                summaryContainer.innerHTML = '';
            }
            
            const promotores = ejecutivoData[supervisorSelect.value] || [];
            promotores.forEach(p => {
                const o = document.createElement('option');
                o.value = p.login;
                o.textContent = `${p.nombre} (${p.login})`;
                promotorSelect.appendChild(o);
            });
            promotorSelect.disabled = !promotores.length;
        });

        promotorSelect.addEventListener('change', () => {
            const supKey = supervisorSelect.value;
            const selLog = promotorSelect.value;
            if (!selLog) return; // No hacer nada si se selecciona "--Elige un promotor--"

            const promotor = (ejecutivoData[supKey] || []).find(p => p.login === selLog);
            const dataKey = type === 'prod' ? 'chartData' : 'tableData';
            const outputContainer = type === 'prod' ? chartContainer : tableContainer;
            
            if (promotor && promotor[dataKey]) {
                renderFunction(promotor[dataKey]);
            } else {
                outputContainer.innerHTML = '<p class="no-data-message">No hay datos de actividad para mostrar.</p>';
                if (type === 'cump') summaryContainer.innerHTML = '';
            }
        });
    }

    // --- Renderizado del Gráfico de Productividad ---
    function renderChart(data) {
        chartContainer.innerHTML = '';
        if (chart) chart.destroy();
        const pastelColors = ['#007bff','#28a745','#ffc107','#dc3545','#6f42c1','#fd7e14','#20c997','#6610f2','#e83e8c','#17a2b8'];
        const greyColor = '#6c757d';
        const chartColors = data.series.map((s, index) => s.name.toLowerCase() === 'trayectoria' ? greyColor : pastelColors[index % pastelColors.length]);
        
        const options = {
            series: data.series,
            chart: { type: 'bar', stacked: true, height: Math.max(35 * data.fechas.length, 250) + 100, toolbar: { show: false } },
            colors: chartColors,
            plotOptions: { bar: { horizontal: true, dataLabels: { position: 'top' } } },
            stroke: { width: 1, colors: ['#fff'] },
            title: { text: `Jornada Diaria - ${data.nombreCompleto} (LOGIN: ${data.login})`, align: 'center', style: { fontSize: '20px', fontFamily: 'Arial, sans-serif', color: '#333' } },
            xaxis: { categories: data.fechas, title: { text: 'Horas Totales de la Jornada (Tienda + Trayectoria)' } },
            tooltip: { y: { formatter: v => v.toFixed(2) + " horas" } },
            dataLabels: {
                enabled: true, offsetX: 10, textAnchor: 'start',
                formatter: (val, opts) => {
                    if (opts.seriesIndex === data.series.length - 1) {
                        const total = opts.w.globals.stackedSeriesTotals[opts.dataPointIndex];
                        return total.toFixed(1) + 'h';
                    }
                    return '';
                },
                style: { colors: ['#333'], fontSize: '13px', fontWeight: 600 }
            },
            legend: { position: 'bottom', horizontalAlign: 'center', itemMargin: { horizontal: 10, vertical: 5 } }
        };
        chart = new ApexCharts(chartContainer, options);
        chart.render();
    }
    
    // --- Renderizado de la Tabla de Apego a Ruta ---
    function renderApegoTable(data) {
        summaryContainer.innerHTML = '';
        tableContainer.innerHTML = '';
        
        if (!data || !data.rows_con_estilo || !data.headers) {
            tableContainer.innerHTML = '<p class="no-data-message">No hay datos de apego a ruta para este promotor.</p>';
            return;
        }

        const summary = data.summary || {};
        summaryContainer.innerHTML = `
            <div class="summary-box"><span class="summary-label">Programadas:</span><span class="summary-value">${summary.programadas || 0}</span></div>
            <div class="summary-box"><span class="summary-label">Realizadas:</span><span class="summary-value">${summary.realizadas || 0}</span></div>
            <div class="summary-box"><span class="summary-label">Apego:</span><span class="summary-value">${summary.apego || '0.0%'}</span></div>
            <div class="summary-box clickable" id="fuera-de-ruta-btn"><span class="summary-label">Fuera de Ruta:</span><span class="summary-value">${summary.fueraDeRuta || 0}</span></div>
        `;
        
        document.getElementById('fuera-de-ruta-btn').addEventListener('click', () => showFueraDeRutaModal(data.visitasFueraDeRuta || []));

        const table = document.createElement('table');
        table.className = 'apego-table';
        const thead = table.createTHead();
        const tbody = table.createTBody();
        const headerRow = thead.insertRow();
        const fixedHeaders = ['FOLIO', 'CADENA', 'NOMBRE TIENDA'];
        
        fixedHeaders.forEach(text => {
            const th = document.createElement('th');
            th.textContent = text;
            headerRow.appendChild(th);
        });
        
        data.headers.forEach(headerObj => {
            const th = document.createElement('th');
            th.className = 'date-header';
            th.innerHTML = `<span>${headerObj.subHeader || ''}</span><span>${headerObj.header || ''}</span>`;
            headerRow.appendChild(th);
        });

        data.rows_con_estilo.forEach(rowData => {
            const row = tbody.insertRow();
            fixedHeaders.forEach(key => {
                const cell = row.insertCell();
                cell.textContent = rowData[key] || '';
            });
            data.headers.forEach(headerObj => {
                const cell = row.insertCell();
                const cellData = rowData[headerObj.header];
                if (cellData) {
                    cell.textContent = cellData.valor;
                    cell.className = `celda-${cellData.estilo}`;
                }
            });
        });
        tableContainer.appendChild(table);
    }

    // --- Lógica de Modales ---
    function showFueraDeRutaModal(visits) {
        modalTitle.textContent = "Visitas Fuera de Ruta";
        if (!visits || visits.length === 0) {
            modalTableContainer.innerHTML = '<p class="no-data-message">No se encontraron visitas fuera de ruta.</p>';
        } else {
            // === LÍNEA CRÍTICA REPARADA: Acceder a propiedades en minúscula ===
            let tableHTML = '<table class="apego-table"><thead><tr><th>Fecha</th><th>Entrada</th><th>Salida</th><th>Duración</th><th>Folio</th><th>Cadena</th><th>Sucursal</th><th>Motivo</th></tr></thead><tbody>';
            visits.forEach(visit => {
                tableHTML += `<tr>
                    <td>${visit.fecha || ''}</td>
                    <td>${visit.entrada || ''}</td>
                    <td>${visit.salida || ''}</td>
                    <td>${visit.duracion || ''}</td>
                    <td>${visit.folio || ''}</td>
                    <td>${visit.cadena || ''}</td>
                    <td>${visit.sucursal || ''}</td>
                    <td>${visit.motivo || ''}</td>
                </tr>`;
            });
            tableHTML += '</tbody></table>';
            modalTableContainer.innerHTML = tableHTML;
        }
        modalContainer.style.display = 'flex';
    }
    
    function showNomenclaturaModal(nomenclaturaData) {
        if (!nomenclaturaData || nomenclaturaData.length === 0) {
            modalNomenclaturaTableContainer.innerHTML = '<p>No se encontró la leyenda de nomenclaturas.</p>';
        } else {
            let tableHTML = '<table class="apego-table"><thead><tr><th>Letra</th><th>Descripción</th></tr></thead><tbody>';
            nomenclaturaData.forEach(item => {
                tableHTML += `<tr><td>${item.letra}</td><td>${item.descripcion}</td></tr>`;
            });
            tableHTML += '</tbody></table>';
            modalNomenclaturaTableContainer.innerHTML = tableHTML;
        }
        modalNomenclaturaContainer.style.display = 'flex';
    }
    
    // --- Event Listeners para cerrar modales y mostrar leyenda ---
    modalCloseButton.addEventListener('click', () => modalContainer.style.display = 'none');
    modalNomenclaturaCloseButton.addEventListener('click', () => modalNomenclaturaContainer.style.display = 'none');
    nomenclaturaBtn.addEventListener('click', () => {
        if (webData && webData.nomenclatura) {
            showNomenclaturaModal(webData.nomenclatura);
        }
    });
    
    window.addEventListener('click', (event) => {
        if (event.target === modalContainer) modalContainer.style.display = 'none';
        if (event.target === modalNomenclaturaContainer) modalNomenclaturaContainer.style.display = 'none';
    });
});