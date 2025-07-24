document.addEventListener('DOMContentLoaded', () => {
    // --- Referencias a elementos del DOM ---
    const loginContainer = document.getElementById('login-container');
    const mainContainer = document.getElementById('main-container');
    const loginForm = document.getElementById('login-form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const errorMessage = document.getElementById('error-message');
    
    const welcomeMessage = document.getElementById('welcome-message');
    const logoutButton = document.getElementById('logout-button');
    
    // Pestañas y contenedores de informes
    const tabProductividad = document.getElementById('tab-productividad');
    const tabCumplimiento = document.getElementById('tab-cumplimiento');
    const reportProductividad = document.getElementById('report-productividad');
    const reportCumplimiento = document.getElementById('report-cumplimiento');

    // Controles y salidas de Productividad
    const supervisorSelectProd = document.getElementById('supervisor-select-prod');
    const promotorSelectProd = document.getElementById('promotor-select-prod');
    const chartContainer = document.getElementById('chart-container');
    
    // Controles y salidas de Cumplimiento
    const supervisorSelectCump = document.getElementById('supervisor-select-cump');
    const promotorSelectCump = document.getElementById('promotor-select-cump');
    const summaryContainer = document.getElementById('summary-container');
    const tableContainer = document.getElementById('table-container');

    let webData = null;
    let chart = null;

    // --- Función para actualizar fecha de actualización ---
    function updateLastUpdateDate(reportType = 'both') {
        const now = new Date();
        const formattedDate = now.toLocaleString('es-MX', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'America/Mexico_City'
        });
        
        if (reportType === 'productividad' || reportType === 'both') {
            const prodElement = document.getElementById('update-date-value-prod');
            if (prodElement) {
                prodElement.textContent = formattedDate;
            }
        }
        
        if (reportType === 'cumplimiento' || reportType === 'both') {
            const cumpElement = document.getElementById('update-date-value-cump');
            if (cumpElement) {
                cumpElement.textContent = formattedDate;
            }
        }
    }

    // --- Carga de datos ---
    fetch('data.json')
        .then(resp => resp.ok ? resp.json() : Promise.reject(resp))
        .then(data => { 
            webData = data;
            console.log("Datos unificados cargados correctamente:", webData);
            // Actualizar fecha inicial al cargar los datos
            updateLastUpdateDate();
        })
        .catch(err => {
            console.error("Error al cargar data.json:", err);
            errorMessage.textContent = "Error al cargar datos. Contacta al administrador.";
        });

    // --- Login ---
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

    // --- Lógica de Pestañas ---
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

    // --- Configuración de la Interfaz Principal ---
    function setupMainInterface(user) {
        welcomeMessage.textContent = `Bienvenido, ${user.nombre}`;
        
        // Obtenemos los datos de ambos informes para el ejecutivo logueado
        const ejecutivoDataProd = webData.reporteData.productividad[user.lookup_key] || {};
        const ejecutivoDataCump = webData.reporteData.cumplimiento[user.lookup_key] || {};

        console.log("Datos ejecutivo cumplimiento:", ejecutivoDataCump);

        // Configurar los dropdowns para cada informe
        setupDropdowns('prod', ejecutivoDataProd, supervisorSelectProd, promotorSelectProd, renderChart);
        setupDropdowns('cump', ejecutivoDataCump, supervisorSelectCump, promotorSelectCump, renderApegoTable);
    }

    // --- Función Genérica para Configurar Dropdowns ---
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
            
            // Limpiar el área de visualización correspondiente
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

            console.log(`Datos del promotor (${type}):`, promotor);

            if (promotor && promotor[dataKey]) {
                renderFunction(promotor[dataKey]);
                // Actualizar fecha cuando se carga un reporte específico
                updateLastUpdateDate(type === 'prod' ? 'productividad' : 'cumplimiento');
            } else {
                outputContainer.innerHTML = '<p class="no-data-message">No hay datos de actividad para mostrar.</p>';
                if (type === 'cump') summaryContainer.innerHTML = '';
            }
        });
    }

    // --- FUNCIÓN DE RENDERIZADO: Gráfico de Productividad ---
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

    // --- FUNCIÓN DE RENDERIZADO CORREGIDA: Tabla de Cumplimiento ---
    function renderApegoTable(data) {
        console.log("Datos recibidos en renderApegoTable:", data);
        
        summaryContainer.innerHTML = '';
        tableContainer.innerHTML = '';
        
        if (!data || !data.rows || data.rows.length === 0) {
            tableContainer.innerHTML = '<p class="no-data-message">No hay datos de apego a ruta para este promotor.</p>';
            return;
        }

        // CALCULAR CORRECTAMENTE LOS TOTALES
        let programadasTotal = 0;
        let realizadasTotal = 0;

        // Recorrer todas las filas para calcular los totales correctos
        data.rows.forEach(row => {
            // Contar las visitas programadas (cualquier día que no sea vacío en el plan original)
            data.data_keys.forEach((key, index) => {
                if (index >= 3) { // Saltar FOLIO, CADENA, NOMBRE TIENDA
                    const valor = row[key];
                    if (valor && valor !== '' && valor !== '0:00') {
                        programadasTotal++; // Cada celda con datos es una visita programada
                        if (valor !== 'Sin visita') {
                            realizadasTotal++; // Solo contar si tiene hora real
                        }
                    }
                }
            });
        });

        // Si los totales siguen mal, usar datos del summary como fallback pero recalcular
        const summary = data.summary || {};
        if (programadasTotal === 0 && summary.programadas) {
            programadasTotal = parseInt(summary.programadas) || 0;
        }
        if (realizadasTotal === 0 && summary.realizadas) {
            realizadasTotal = parseInt(summary.realizadas) || 0;
        }

        const apegoCalculado = programadasTotal > 0 ? ((realizadasTotal / programadasTotal) * 100).toFixed(1) + '%' : '0.0%';

        console.log(`Totales recalculados: Programadas: ${programadasTotal}, Realizadas: ${realizadasTotal}, Apego: ${apegoCalculado}`);

        // Mostrar los totales corregidos
        summaryContainer.innerHTML = `
            <div class="summary-box">
                <span class="summary-label">Programadas:</span>
                <span class="summary-value">${programadasTotal}</span>
            </div>
            <div class="summary-box">
                <span class="summary-label">Realizadas:</span>
                <span class="summary-value">${realizadasTotal}</span>
            </div>
            <div class="summary-box">
                <span class="summary-label">Apego:</span>
                <span class="summary-value">${apegoCalculado}</span>
            </div>
        `;

        // Crear la tabla
        const table = document.createElement('table');
        table.className = 'apego-table';
        const thead = table.createTHead();
        const headerRow1 = thead.insertRow();
        
        // Headers fijos
        ['FOLIO', 'CADENA', 'NOMBRE TIENDA'].forEach(text => {
            const th = document.createElement('th');
            th.rowSpan = 2; 
            th.textContent = text; 
            headerRow1.appendChild(th);
        });
        
        // Headers de fechas - MEJORAR FORMATO
        data.headers.slice(3).forEach(headerObj => {
            const th = document.createElement('th');
            th.className = 'date-header';
            // Mejorar el formato de las fechas
            const fecha = headerObj.header || '';
            const dia = headerObj.subHeader || '';
            th.innerHTML = `<span>${dia}</span><span>${fecha}</span>`;
            headerRow1.appendChild(th);
        });

        const tbody = table.createTBody();
        data.rows.forEach(rowData => {
            const row = tbody.insertRow();
            data.data_keys.forEach(key => {
                const cell = row.insertCell();
                const value = rowData[key] || '';
                cell.textContent = value;
                if (value === '0:00' || value === 'Sin visita') { 
                    cell.classList.add('missed-visit'); 
                }
            });
        });

        tableContainer.appendChild(table);
    }
    
    // --- Logout ---
    logoutButton.addEventListener('click', () => location.reload());
});