document.addEventListener('DOMContentLoaded', () => {
    // === SECCIÓN 1: DECLARACIÓN DE CONSTANTES ===
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
    const leyendaBtn = document.getElementById('leyenda-btn'); // Botón 'i'
    
    // Elementos de Modales
    const modalFueraDeRuta = document.getElementById('modal-fueraderuta-container');
    const modalFueraDeRutaTitle = document.getElementById('modal-fueraderuta-title');
    const modalFueraDeRutaTable = document.getElementById('modal-fueraderuta-table-container');
    const modalLeyenda = document.getElementById('modal-leyenda-container');
    const modalLeyendaContent = document.getElementById('modal-leyenda-content');

    // Variables de estado
    let webData = null;
    let chart = null;

    // === SECCIÓN 2: LÓGICA DE LA APLICACIÓN ===

    // --- Carga inicial de datos ---
    fetch('data.json?v=' + new Date().getTime()) // Evita caché del JSON
        .then(resp => {
            if (!resp.ok) {
                throw new Error(`Error HTTP: ${resp.status}`);
            }
            return resp.json();
        })
        .then(data => { 
            webData = data;
            if (webData && webData.fechaActualizacion) {
                document.getElementById('update-date-value-prod').textContent = webData.fechaActualizacion;
                document.getElementById('update-date-value-cump').textContent = webData.fechaActualizacion;
            }
        })
        .catch(err => {
            errorMessage.textContent = "Error fatal al cargar datos. Contacta al administrador.";
            loginForm.querySelector('button').disabled = true;
        });
        
    // --- Lógica de Login y Logout ---
    loginForm.addEventListener('submit', e => {
        e.preventDefault();
        const email = emailInput.value.toLowerCase().trim();
        const password = passwordInput.value.trim();
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
    logoutButton.addEventListener('click', () => location.reload());
    
    // Mantener sesión activa - verificar cada 5 minutos
    setInterval(() => {
        // Simular actividad para mantener la sesión
        if (document.visibilityState === 'visible') {
            // Solo si la página está visible
            console.log('Manteniendo sesión activa...');
        }
    }, 5 * 60 * 1000); // 5 minutos

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
        const ejecutivoDataProd = webData.reporteData.productividad?.[user.lookup_key] || {};
        const ejecutivoDataCump = webData.reporteData.cumplimiento?.[user.lookup_key] || {};
        setupDropdowns(ejecutivoDataProd, supervisorSelectProd, promotorSelectProd, renderChart, [chartContainer]);
        setupDropdowns(ejecutivoDataCump, supervisorSelectCump, promotorSelectCump, renderApegoTable, [summaryContainer, tableContainer]);
        
        // Configurar botón de toggle para leyendas
        configurarToggleLeyendas();
        
        // Cargar leyendas (ocultas por defecto)
        mostrarLeyendas();
    }

    function setupDropdowns(ejecutivoData, supervisorSelect, promotorSelect, renderFunction, containersToClear) {
        const supervisores = Object.keys(ejecutivoData).sort();
        supervisorSelect.innerHTML = '<option value="">-- Elige un supervisor --</option>';
        supervisores.forEach(key => {
            const o = document.createElement('option');
            o.value = key; 
            o.textContent = key.replace(/-/g, ' ');
            supervisorSelect.appendChild(o);
        });
        supervisorSelect.disabled = !supervisores.length;

        supervisorSelect.addEventListener('change', () => {
            promotorSelect.innerHTML = '<option value="">-- Elige un promotor --</option>';
            containersToClear.forEach(c => c.innerHTML = '');
            if (chart) { chart.destroy(); chart = null; }
            
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
            const promotor = (ejecutivoData[supervisorSelect.value] || []).find(p => p.login === promotorSelect.value);
            const dataKey = renderFunction === renderChart ? 'chartData' : 'tableData';
            
            console.log('DEBUG - Promotor seleccionado:', promotor);
            console.log('DEBUG - DataKey:', dataKey);
            console.log('DEBUG - Datos del promotor:', promotor ? promotor[dataKey] : 'No hay promotor');
            
            if (promotor && promotor[dataKey]) {
                renderFunction(promotor[dataKey]);
            } else {
                containersToClear.forEach(c => c.innerHTML = '');
                containersToClear[0].innerHTML = '<p class="no-data-message">No hay datos para mostrar.</p>';
            }
        });
    }

function renderChart(chartData) {
    console.log('DEBUG - renderChart llamado con:', chartData);
    console.log('DEBUG - Categories:', chartData.categories);
    
    // Limpia el contenedor del gráfico anterior para evitar duplicados
    chartContainer.innerHTML = '';
    
    // Si la variable global 'chart' ya existe, destrúyela para liberar memoria
    if (chart) {
        chart.destroy();
        chart = null;
    }

    // Verificar si hay datos válidos
    if (!chartData || !chartData.series || chartData.series.length === 0) {
        console.log('DEBUG - No hay datos válidos en chartData');
        chartContainer.innerHTML = '<div class="no-data-message">No hay datos de productividad disponibles para este promotor.</div>';
        return;
    }

    // Opciones de configuración para el gráfico de barras apiladas de ApexCharts
    const options = {
        // Define las series de datos para gráfico apilado
        series: chartData.series,
        // Categorías para el eje Y (fechas) en gráficos horizontales
        labels: chartData.categories,
        plotOptions: {
            bar: {
                horizontal: true,        // Barras horizontales
                barHeight: '70%',        // Altura de las barras
                dataLabels: {
                    position: 'center',  // Posición de las etiquetas de datos
                },
            }
        },
        dataLabels: {
            enabled: true,           // Habilita las etiquetas de datos sobre las barras
            offsetX: 10,             // Ajusta la posición horizontal de la etiqueta
            style: {
                fontSize: '11px',
                colors: ["#2c3e50"],  // Color del texto de la etiqueta
                fontWeight: 'bold'
            },
            formatter: function(val) {
                return val > 0 ? val.toFixed(1) + 'h' : ''; // Solo mostrar valores mayores a 0 con 'h'
            }
        },
        // Define las etiquetas del eje Y (las fechas) - ahora eje Y para barras horizontales
        yaxis: {
            labels: {
                style: {
                    fontSize: '12px'
                }
            }
        },
        // Define las etiquetas del eje X (las horas) - ahora eje X para barras horizontales
        xaxis: {
            title: {
                text: 'Horas Totales de la Jornada (Tienda + Trayectoria)'
            },
            labels: {
                style: {
                    fontSize: '11px'
                }
            }
        },
        // Quitar el fondo blanco y las líneas de cuadrícula
        grid: {
            show: false
        },
        // Configuración del gráfico sin fondo
        chart: {
            type: 'bar',      // Tipo de gráfico: barras
            height: 450,      // Altura del gráfico
            stacked: true,    // Habilita el apilamiento
            toolbar: {
                show: true    // Muestra la barra de herramientas (zoom, pan, descarga)
            },
            background: 'transparent',
            foreColor: '#2c3e50'
        },
        // Título del gráfico
        title: {
            text: `Jornada Diaria - ${chartData.nombreCompleto} (LOGIN: ${chartData.login})`,
            align: 'center',
            style: {
                fontSize: '16px',
                fontWeight: 'bold'
            }
        },
        // Configuración de la leyenda
        legend: {
            show: true,
            position: 'top',
            horizontalAlign: 'center'
        },
        // Configuración de colores - Paleta profesional como en la imagen
        colors: ['#3498db', '#2ecc71', '#f1c40f', '#e74c3c', '#9b59b6', '#808080']
    };

    // Crea una nueva instancia del gráfico en el contenedor div#chart-container
    chart = new ApexCharts(document.querySelector("#chart-container"), options);
    
    // Dibuja el gráfico
    chart.render();
}
    
    function renderApegoTable(data) {
        summaryContainer.innerHTML = '';
        tableContainer.innerHTML = '';
        
        const summary = data.summary || {};
        summaryContainer.innerHTML = `
            <div class="summary-box"><span class="summary-label">Programadas:</span><span class="summary-value">${summary.programadas}</span></div>
            <div class="summary-box"><span class="summary-label">Realizadas:</span><span class="summary-value">${summary.realizadas}</span></div>
            <div class="summary-box"><span class="summary-label">Apego:</span><span class="summary-value">${summary.apego}</span></div>
            <div class="summary-box clickable" id="fuera-de-ruta-btn"><span class="summary-label">Fuera de Ruta:</span><span class="summary-value">${summary.fueraDeRuta}</span></div>
        `;
        document.getElementById('fuera-de-ruta-btn').addEventListener('click', () => showFueraDeRutaModal(data.visitasFueraDeRuta || []));

        let tableHTML = '<table class="apego-table"><thead><tr>';
        const fixedHeaders = ['FOLIO', 'CADENA', 'NOMBRE TIENDA'];
        fixedHeaders.forEach(h => tableHTML += `<th>${h}</th>`);
        data.headers.forEach(h => tableHTML += `<th class="date-header"><span>${h.subHeader}</span><span>${h.header}</span></th>`);
        tableHTML += '</tr></thead><tbody>';

        data.rows_con_estilo.forEach(rowData => {
            tableHTML += '<tr>';
            fixedHeaders.forEach(key => tableHTML += `<td>${rowData[key] || ''}</td>`);
            data.headers.forEach(h => {
                const cellData = rowData[h.header] || {valor: '', estilo: ''};
                tableHTML += `<td class="${cellData.estilo}">${cellData.valor}</td>`;
            });
            tableHTML += '</tr>';
        });
        tableHTML += '</tbody></table>';
        tableContainer.innerHTML = tableHTML;
    }

    function showFueraDeRutaModal(visits) {
        modalFueraDeRutaTitle.textContent = "Visitas Fuera de Ruta";
        if (!visits || visits.length === 0) {
            modalFueraDeRutaTable.innerHTML = '<p class="no-data-message">No se encontraron visitas fuera de ruta.</p>';
        } else {
            let tableHTML = '<table class="apego-table"><thead><tr><th>Fecha</th><th>Entrada</th><th>Salida</th><th>Duración</th><th>Folio</th><th>Cadena</th><th>Sucursal</th><th>Motivo</th></tr></thead><tbody>';
            visits.forEach(visit => {
                tableHTML += `<tr>
                    <td>${visit.fecha || ''}</td><td>${visit.entrada || ''}</td><td>${visit.salida || ''}</td>
                    <td>${visit.duracion || ''}</td><td>${visit.folio || ''}</td><td>${visit.cadena || ''}</td>
                    <td>${visit.sucursal || ''}</td><td>${visit.motivo || ''}</td>
                </tr>`;
            });
            tableHTML += '</tbody></table>';
            modalFueraDeRutaTable.innerHTML = tableHTML;
        }
        modalFueraDeRuta.style.display = 'flex';
    }
    
    // --- Lógica para el Nuevo Modal de Leyendas ---
    leyendaBtn.addEventListener('click', () => {
        if (webData && webData.leyendaLetras && webData.leyendaEstatus) {
            showLeyendaModal(webData.leyendaLetras, webData.leyendaEstatus);
        } else {
            alert("No hay datos de leyenda disponibles.");
        }
    });

    function showLeyendaModal(letras, estatus) {
        let html = '<div class="leyenda-column"><h3>Significado de Letras</h3>';
        html += '<table class="apego-table"><thead><tr><th>Letra</th><th>Descripción</th></tr></thead><tbody>';
        letras.forEach(item => {
            html += `<tr><td>${item.letra}</td><td>${item.descripcion}</td></tr>`;
        });
        html += '</tbody></table></div>';

        html += '<div class="leyenda-column"><h3>Significado de Colores (Estatus)</h3>';
        html += '<table class="apego-table"><thead><tr><th>Color</th><th>Estatus</th></tr></thead><tbody>';
        estatus.forEach(item => {
            html += `<tr><td><div class="color-box ${item.clase}"></div></td><td>${item.descripcion}</td></tr>`;
        });
        html += '</tbody></table></div>';

        modalLeyendaContent.innerHTML = html;
        modalLeyenda.style.display = 'flex';
    }
    
    // --- Gestión Unificada de Cierre de Modales ---
    [modalFueraDeRuta, modalLeyenda].forEach(modal => {
        if (modal) {
            modal.querySelector('.modal-close-button').addEventListener('click', () => {
                modal.style.display = 'none';
            });
        }
    });

    window.addEventListener('click', e => {
        if (e.target === modalFueraDeRuta) modalFueraDeRuta.style.display = 'none';
        if (e.target === modalLeyenda) modalLeyenda.style.display = 'none';
    });
    
    // --- Función para configurar toggle de leyendas ---
    function configurarToggleLeyendas() {
        const toggleBtn = document.getElementById('toggle-leyendas-btn');
        const leyendasPopup = document.getElementById('leyendas-popup');
        const closePopupBtn = document.getElementById('close-leyendas-popup');
        
        if (toggleBtn && leyendasPopup) {
            // Abrir pop-up
            toggleBtn.addEventListener('click', () => {
                leyendasPopup.classList.remove('hidden');
                document.body.style.overflow = 'hidden'; // Prevenir scroll
            });
            
            // Cerrar pop-up con botón X
            if (closePopupBtn) {
                closePopupBtn.addEventListener('click', () => {
                    leyendasPopup.classList.add('hidden');
                    document.body.style.overflow = 'auto'; // Restaurar scroll
                });
            }
            
            // Cerrar pop-up haciendo clic fuera
            leyendasPopup.addEventListener('click', (e) => {
                if (e.target === leyendasPopup) {
                    leyendasPopup.classList.add('hidden');
                    document.body.style.overflow = 'auto';
                }
            });
            
            // Cerrar pop-up con ESC
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && !leyendasPopup.classList.contains('hidden')) {
                    leyendasPopup.classList.add('hidden');
                    document.body.style.overflow = 'auto';
                }
            });
        }
    }
    
    // --- Función para mostrar leyendas siempre visibles ---
    function mostrarLeyendas() {
        if (!webData) return;
        
        // Leyenda de incidencias
        const leyendaIncidencias = document.getElementById('leyenda-incidencias');
        if (leyendaIncidencias && webData.leyendaLetras) {
            let html = '';
            webData.leyendaLetras.forEach(item => {
                html += `
                    <div class="leyenda-item">
                        <div class="letra">${item.letra}</div>
                        <div class="descripcion">${item.descripcion}</div>
                    </div>
                `;
            });
            leyendaIncidencias.innerHTML = html;
        }
        
        // Leyenda de estatus
        const leyendaEstatus = document.getElementById('leyenda-estatus');
        if (leyendaEstatus && webData.leyendaEstatus) {
            let html = '';
            webData.leyendaEstatus.forEach(item => {
                html += `
                    <div class="leyenda-item">
                        <div class="letra ${item.clase}">✓</div>
                        <div class="descripcion">${item.descripcion}</div>
                    </div>
                `;
            });
            leyendaEstatus.innerHTML = html;
        }
    }
});