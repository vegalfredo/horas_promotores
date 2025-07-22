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
    const supervisorSelect = document.getElementById('supervisor-select');
    const promotorSelect = document.getElementById('promotor-select');
    const chartContainer = document.getElementById('chart-container');

    let webData = null;
    let chart = null; // Variable para mantener la instancia del gráfico

    // --- Carga de datos (sin cambios) ---
    fetch('data.json')
        .then(response => response.ok ? response.json() : Promise.reject(response))
        .then(data => {
            webData = data;
            console.log("Datos dinámicos cargados correctamente.");
        })
        .catch(error => {
            console.error("Error fatal al cargar data.json:", error);
            errorMessage.textContent = "Error al cargar datos. Contacta al administrador.";
        });

    // --- Lógica del Login (sin cambios) ---
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        // ... (el código de login se mantiene igual)
        const email = emailInput.value.toLowerCase().trim();
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
    
    // --- Lógica de la interfaz principal (actualizada) ---
    function setupMainInterface(user) {
        welcomeMessage.textContent = `Bienvenido, ${user.nombre}`;
        const ejecutivoData = webData.reporteData[user.lookup_key];

        if (!ejecutivoData) {
            // ... (el código de manejo de errores se mantiene igual)
            return;
        }

        // Llenar dropdown de supervisores (sin cambios)
        supervisorSelect.innerHTML = '<option value="">-- Elige un supervisor --</option>';
        Object.keys(ejecutivoData).sort().forEach(supervisorKey => {
            const option = document.createElement('option');
            option.value = supervisorKey;
            option.textContent = supervisorKey.replace(/_/g, ' ');
            supervisorSelect.appendChild(option);
        });
        supervisorSelect.disabled = false;

        // Event listener para el cambio de supervisor (actualizado)
        supervisorSelect.addEventListener('change', () => {
            promotorSelect.innerHTML = '<option value="">-- Elige un promotor --</option>';
            promotorSelect.disabled = true;
            if (chart) chart.destroy(); // Destruye el gráfico anterior
            
            const selectedSupervisorKey = supervisorSelect.value;
            if (selectedSupervisorKey) {
                const promotores = ejecutivoData[selectedSupervisorKey];
                promotores.forEach(promotor => {
                    const option = document.createElement('option');
                    // !! CAMBIO: Usamos el login como valor único, no la ruta de la imagen !!
                    option.value = promotor.login; 
                    option.textContent = `${promotor.nombre} (${promotor.login})`;
                    promotorSelect.appendChild(option);
                });
                promotorSelect.disabled = false;
            }
        });

        // Event listener para el cambio de promotor (¡TOTALMENTE NUEVO!)
        promotorSelect.addEventListener('change', () => {
            if (chart) chart.destroy();
            
            const selectedLogin = promotorSelect.value;
            if (selectedLogin) {
                const selectedSupervisorKey = supervisorSelect.value;
                const promotorData = ejecutivoData[selectedSupervisorKey].find(p => p.login === selectedLogin);
                if (promotorData && promotorData.chartData) {
                    renderChart(promotorData.chartData);
                }
            }
        });
    }

    // --- !! NUEVA FUNCIÓN PARA RENDERIZAR EL GRÁFICO !! ---
    function renderChart(data) {
        chartContainer.innerHTML = ''; // Limpia el contenedor

        const options = {
            series: data.series,
            chart: {
                type: 'bar',
                height: 35 * data.fechas.length + 100, // Altura dinámica
                stacked: true,
                toolbar: { show: true }
            },
            plotOptions: {
                bar: {
                    horizontal: true,
                },
            },
            stroke: {
                width: 1,
                colors: ['#fff']
            },
            title: {
                text: `Jornada Diaria - ${data.nombreCompleto} (LOGIN: ${data.login})`,
                align: 'center',
                style: { fontSize: '20px', fontFamily: 'Arial, sans-serif' }
            },
            xaxis: {
                categories: data.fechas,
                title: { text: 'Horas Totales de la Jornada (Tienda + Trayectoria)' }
            },
            yaxis: {
                title: { text: 'Fecha' }
            },
            tooltip: {
                y: {
                    formatter: function (val) {
                        return val.toFixed(2) + " horas";
                    }
                }
            },
            dataLabels: {
                enabled: true,
                formatter: function (val, opts) {
                    // Muestra el total solo en la última serie de la barra
                    const seriesIndex = opts.seriesIndex;
                    const dataPointIndex = opts.dataPointIndex;
                    if (seriesIndex === opts.w.config.series.length - 1) {
                        return data.totales[dataPointIndex].toFixed(1) + 'h';
                    }
                    return '';
                },
                style: { colors: ['#000'] }
            },
            legend: {
                position: 'bottom',
                horizontalAlign: 'center',
            }
        };

        chart = new ApexCharts(chartContainer, options);
        chart.render();
    }

    // Lógica del Logout (sin cambios)
    logoutButton.addEventListener('click', () => {
        location.reload();
    });
});