document.addEventListener('DOMContentLoaded', () => {
    // --- Referencias a elementos del DOM ---
    const loginContainer    = document.getElementById('login-container');
    const mainContainer     = document.getElementById('main-container');
    const loginForm         = document.getElementById('login-form');
    const emailInput        = document.getElementById('email');
    const passwordInput     = document.getElementById('password');
    const errorMessage      = document.getElementById('error-message');
    
    const welcomeMessage    = document.getElementById('welcome-message');
    const logoutButton      = document.getElementById('logout-button');
    const supervisorSelect  = document.getElementById('supervisor-select');
    const promotorSelect    = document.getElementById('promotor-select');
    const chartContainer    = document.getElementById('chart-container');

    let webData = null;
    let chart   = null;

    // --- Carga de datos ---
    fetch('data.json')
        .then(resp => resp.ok ? resp.json() : Promise.reject(resp))
        .then(data => { webData = data; })
        .catch(err => {
            console.error("Error al cargar data.json:", err);
            errorMessage.textContent = "Error al cargar datos. Contacta al administrador.";
        });

    // --- Login ---
    loginForm.addEventListener('submit', e => {
        e.preventDefault();
        errorMessage.textContent = '';
        const email    = emailInput.value.toLowerCase().trim();
        const password = passwordInput.value.toUpperCase().trim();

        if (!webData) {
            errorMessage.textContent = "Datos no listos. Intenta de nuevo.";
            return;
        }

        const user = webData.usuarios[email];
        if (user && user.password === password) {
            loginContainer.classList.add('hidden');
            mainContainer.classList.remove('hidden');
            setTimeout(() => mainContainer.classList.add('visible'), 50);
            setupMainInterface(user);
        } else {
            errorMessage.textContent = "Correo o contraseña incorrectos.";
        }
    });

    // --- Interfaz principal ---
    function setupMainInterface(user) {
        welcomeMessage.textContent = `Bienvenido, ${user.nombre}`;
        const ejecutivoData = webData.reporteData[user.lookup_key] || {};

        // Supervisores
        const supervisores = Object.keys(ejecutivoData).sort();
        if (supervisores.length === 0) {
            supervisorSelect.disabled = true;
            supervisorSelect.innerHTML = '<option>-- No hay supervisores asignados --</option>';
            return;
        }
        supervisorSelect.disabled = false;
        supervisorSelect.innerHTML = '<option value="">-- Elige un supervisor --</option>';
        supervisores.forEach(key => {
            const o = document.createElement('option');
            o.value = key; 
            o.textContent = key.replace(/_/g, ' ');
            supervisorSelect.appendChild(o);
        });

        supervisorSelect.addEventListener('change', () => {
            promotorSelect.innerHTML = '<option value="">-- Elige un promotor --</option>';
            promotorSelect.disabled = true;
            if (chart) chart.destroy();

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
            if (chart) chart.destroy();
            const supKey = supervisorSelect.value;
            const selLog = promotorSelect.value;
            const prom  = (ejecutivoData[supKey] || []).find(p => p.login === selLog);
            if (prom && prom.chartData) {
                renderChart(prom.chartData);
            } else {
                chartContainer.innerHTML = '<p class="no-data-message">No hay datos de actividad para este promotor.</p>';
            }
        });
    }

    // =========================================================================
    // FUNCIÓN DE RENDERIZADO (CON LA CORRECCIÓN DE UNA LÍNEA)
    // =========================================================================
    function renderChart(data) {
        chartContainer.innerHTML = '';

        const pastelColors = ['#007bff','#28a745','#ffc107','#dc3545','#6f42c1','#fd7e14','#20c997','#6610f2','#e83e8c','#17a2b8'];
        const greyColor    = '#6c757d';

        const chartColors = data.series.map(s => 
            s.name.toLowerCase()==='trayectoria' ? greyColor
            : pastelColors[data.series.findIndex(x=>x.name===s.name) % pastelColors.length]
        );

        const options = {
            series: data.series,
            chart: {
                type: 'bar',
                stacked: true,
                height: 35 * data.fechas.length + 100,
                toolbar: { show: false }
            },
            colors: chartColors,
            plotOptions: {
                bar: {
                    horizontal: true,
                    dataLabels: {
                        position: 'top'
                    }
                }
            },
            stroke: { width: 1, colors: ['#fff'] },
            title: {
                text: `Jornada Diaria - ${data.nombreCompleto} (LOGIN: ${data.login})`,
                align: 'center',
                style: { fontSize: '20px', fontFamily: 'Arial, sans-serif', color: '#333' }
            },
            xaxis: {
                categories: data.fechas,
                title: { text: 'Horas Totales de la Jornada (Tienda + Trayectoria)' }
            },
            tooltip: {
                y: { formatter: v => v.toFixed(2) + " horas" }
            },
            dataLabels: {
                enabled: true,
                offsetX: 10,
                textAnchor: 'start',
                formatter: (val, opts) => {
                    // ====> ¡AQUÍ ESTÁ LA LÍNEA MÁGICA! <====
                    if (opts.seriesIndex === data.series.length - 1) {
                        const total = opts.w.globals.stackedSeriesTotals[opts.dataPointIndex];
                        return total.toFixed(1) + 'h';
                    }
                    return ''; // Para todos los demás segmentos, no devolvemos nada
                },
                style: {
                    colors: ['#333'],
                    fontSize: '13px',
                    fontWeight: 600
                }
            },
            legend: {
                position: 'bottom',
                horizontalAlign: 'center',
                itemMargin: { horizontal: 10, vertical: 5 }
            }
        };

        chart = new ApexCharts(chartContainer, options);
        chart.render();
    }

    // --- Logout ---
    logoutButton.addEventListener('click', () => location.reload());
});