document.addEventListener('DOMContentLoaded', () => {
    // === Referencias al DOM (sin cambios) ===
    const loginContainer = document.getElementById('login-container');
    const mainContainer = document.getElementById('main-container');
    const loginForm = document.getElementById('login-form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const errorMessage = document.getElementById('error-message');
    const welcomeMessage = document.getElementById('welcome-message');
    const logoutButton = document.getElementById('logout-button');
    const tabProductividad = document.getElementById('tab-productividad');
    const tabCumplimiento = document.getElementById('tab-cumplimiento');
    const reportProductividad = document.getElementById('report-productividad');
    const reportCumplimiento = document.getElementById('report-cumplimiento');
    const supervisorSelectProd = document.getElementById('supervisor-select-prod');
    const promotorSelectProd = document.getElementById('promotor-select-prod');
    const chartContainer = document.getElementById('chart-container');
    const supervisorSelectCump = document.getElementById('supervisor-select-cump');
    const promotorSelectCump = document.getElementById('promotor-select-cump');
    const summaryContainer = document.getElementById('summary-container');
    const tableContainer = document.getElementById('table-container');
    const modalContainer = document.getElementById('modal-container');
    const modalCloseButton = document.querySelector('.modal-close-button');
    const modalTableContainer = document.getElementById('modal-table-container');

    let webData = null;
    let chart = null;

    // --- Carga de datos (sin cambios) ---
    fetch('data.json')
        .then(resp => resp.ok ? resp.json() : Promise.reject(resp))
        .then(data => { 
            webData = data;
            console.log("Datos unificados cargados correctamente:", webData);
            if (webData && webData.fechaActualizacion) {
                const dateElementProd = document.getElementById('update-date-value-prod');
                const dateElementCump = document.getElementById('update-date-value-cump');
                if (dateElementProd) dateElementProd.textContent = webData.fechaActualizacion;
                if (dateElementCump) dateElementCump.textContent = webData.fechaActualizacion;
            }
        })
        .catch(err => {
            console.error("Error al cargar data.json:", err);
            errorMessage.textContent = "Error al cargar datos. Contacta al administrador.";
        });

    // --- Login (sin cambios) ---
    loginForm.addEventListener('submit', e => {
        e.preventDefault();
        const email = emailInput.value.toLowerCase().trim();
        const password = passwordInput.value.toUpperCase().trim();
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

    // --- Lógica de Pestañas (sin cambios) ---
    tabProductividad.addEventListener('click', () => switchTab('productividad'));
    tabCumplimiento.addEventListener('click', () => switchTab('cumplimiento'));

    function switchTab(activeTab) {
        if (activeTab === 'productividad') {
            tabProductividad.classList.add('active');
            tabCumplimiento.classList.remove('active');
            reportProductividad.classList.remove('hidden');
            reportCumplimiento.classList.add('hidden');
        } else {
            tabProductividad.classList.remove('active');
            tabCumplimiento.classList.add('active');
            reportProductividad.classList.add('hidden');
            reportCumplimiento.classList.remove('hidden');
        }
    }

    // --- Configuración de la Interfaz Principal (sin cambios) ---
    function setupMainInterface(user) {
        welcomeMessage.textContent = `Bienvenido, ${user.nombre}`;
        const ejecutivoDataProd = webData.reporteData.productividad[user.lookup_key] || {};
        const ejecutivoDataCump = webData.reporteData.cumplimiento[user.lookup_key] || {};
        setupDropdowns('prod', ejecutivoDataProd, supervisorSelectProd, promotorSelectProd, renderChart);
        setupDropdowns('cump', ejecutivoDataCump, supervisorSelectCump, promotorSelectCump, renderApegoTable);
    }

    // --- Función Genérica para Configurar Dropdowns (sin cambios) ---
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
            if (type === 'prod' && chart) chart.destroy();
            else if (type === 'cump') {
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

    // --- FUNCIÓN DE RENDERIZADO: Gráfico de Productividad (sin cambios) ---
    function renderChart(data) {
        chartContainer.innerHTML = '';
        const pastelColors = ['#007bff','#28a745','#ffc107','#dc3545','#6f42c1','#fd7e14','#20c997','#6610f2','#e83e8c','#17a2b8'];
        const greyColor    = '#6c757d';
        const chartColors = data.series.map(s => s.name.toLowerCase()==='trayectoria' ? greyColor : pastelColors[data.series.findIndex(x=>x.name===s.name) % pastelColors.length]);
        const options = {
            series: data.series,
            chart: {type: 'bar', stacked: true, height: 35 * data.fechas.length + 100, toolbar: { show: false }},
            colors: chartColors,
            plotOptions: { bar: { horizontal: true, dataLabels: { position: 'top' }}},
            stroke: { width: 1, colors: ['#fff'] },
            title: { text: `Jornada Diaria - ${data.nombreCompleto} (LOGIN: ${data.login})`, align: 'center', style: { fontSize: '20px', fontFamily: 'Arial, sans-serif', color: '#333' }},
            xaxis: { categories: data.fechas, title: { text: 'Horas Totales de la Jornada (Tienda + Trayectoria)' }},
            tooltip: { y: { formatter: v => v.toFixed(2) + " horas" }},
            dataLabels: { enabled: true, offsetX: 10, textAnchor: 'start',
                formatter: (val, opts) => {
                    if (opts.seriesIndex === data.series.length - 1) {
                        const total = opts.w.globals.stackedSeriesTotals[opts.dataPointIndex];
                        return total.toFixed(1) + 'h';
                    }
                    return '';
                },
                style: { colors: ['#333'], fontSize: '13px', fontWeight: 600 }
            },
            legend: { position: 'bottom', horizontalAlign: 'center', itemMargin: { horizontal: 10, vertical: 5 }}
        };
        chart = new ApexCharts(chartContainer, options);
        chart.render();
    }

    // --- FUNCIÓN DE RENDERIZADO DE TABLA "APEGO A RUTA" (sin cambios) ---
    function renderApegoTable(data) {
        summaryContainer.innerHTML = '';
        tableContainer.innerHTML = '';
        
        if (!data || !data.rows || !data.headers || !data.data_keys) {
            tableContainer.innerHTML = '<p class="no-data-message">No hay datos de apego a ruta para este promotor.</p>';
            return;
        }

        const summary = data.summary || {};
        summaryContainer.innerHTML = `
            <div class="summary-box">
                <span class="summary-label">Programadas:</span>
                <span class="summary-value">${summary.programadas || 0}</span>
            </div>
            <div class="summary-box">
                <span class="summary-label">Realizadas:</span>
                <span class="summary-value">${summary.realizadas || 0}</span>
            </div>
            <div class="summary-box">
                <span class="summary-label">Apego:</span>
                <span class="summary-value">${summary.apego || '0.0%'}</span>
            </div>
            <div class="summary-box clickable" id="fuera-de-ruta-btn">
                <span class="summary-label">Fuera de Ruta:</span>
                <span class="summary-value">${summary.fueraDeRuta || 0}</span>
            </div>
        `;
        
        document.getElementById('fuera-de-ruta-btn').addEventListener('click', () => {
            showFueraDeRutaModal(data.visitasFueraDeRuta || []);
        });

        const table = document.createElement('table');
        table.className = 'apego-table';
        const thead = table.createTHead();
        const tbody = table.createTBody();
        const headerRow = thead.insertRow();
        
        const fixedHeaders = data.data_keys.slice(0, 3);
        fixedHeaders.forEach(text => {
            const th = document.createElement('th');
            th.textContent = text.replace(/_/g, ' ');
            headerRow.appendChild(th);
        });
        
        data.headers.forEach(headerObj => {
            const th = document.createElement('th');
            th.className = 'date-header';
            th.innerHTML = `<span>${headerObj.subHeader || ''}</span><span>${headerObj.header || ''}</span>`;
            headerRow.appendChild(th);
        });

        data.rows.forEach(rowData => {
            const row = tbody.insertRow();
            data.data_keys.forEach(key => {
                const cell = row.insertCell();
                const value = rowData[key] !== undefined && rowData[key] !== null ? rowData[key] : '';
                cell.textContent = value;
                if (value === '00:00') { 
                    cell.classList.add('missed-visit'); 
                }
            });
        });

        tableContainer.appendChild(table);
    }

    // === MODIFICADO: FUNCIÓN PARA MOSTRAR EL MODAL CON VISITAS FUERA DE RUTA ===
    function showFueraDeRutaModal(visits) {
        if (!visits || visits.length === 0) {
            modalTableContainer.innerHTML = '<p class="no-data-message">No se encontraron visitas fuera de ruta.</p>';
        } else {
            // Se añaden las nuevas columnas a la tabla del modal
            let tableHTML = '<table class="apego-table"><thead><tr><th>Fecha</th><th>Entrada</th><th>Salida</th><th>Duración</th><th>Folio</th><th>Cadena</th><th>Sucursal</th><th>Motivo</th></tr></thead><tbody>';
            visits.forEach(visit => {
                tableHTML += `<tr>
                    <td>${visit.Fecha}</td>
                    <td>${visit.Entrada}</td>
                    <td>${visit.Salida}</td>
                    <td>${visit.Duracion}</td>
                    <td>${visit.Folio}</td>
                    <td>${visit.Cadena}</td>
                    <td>${visit.Sucursal}</td>
                    <td>${visit.Motivo}</td>
                </tr>`;
            });
            tableHTML += '</tbody></table>';
            modalTableContainer.innerHTML = tableHTML;
        }
        modalContainer.style.display = 'flex';
    }

    // --- Lógica para cerrar el modal (sin cambios) ---
    modalCloseButton.addEventListener('click', () => {
        modalContainer.style.display = 'none';
    });
    
    window.addEventListener('click', (event) => {
        if (event.target === modalContainer) {
            modalContainer.style.display = 'none';
        }
    });
    
    // --- Logout (sin cambios) ---
    logoutButton.addEventListener('click', () => location.reload());
});