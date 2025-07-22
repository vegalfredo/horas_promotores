document.addEventListener('DOMContentLoaded', () => {
    // --- SECCIÓN RESTAURADA: Referencias a TODOS los elementos del DOM ---
    const loginContainer = document.getElementById('login-container');
    const mainContainer = document.getElementById('main-container');
    const loginForm = document.getElementById('login-form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const errorMessage = document.getElementById('error-message');
    
    const welcomeMessage = document.getElementById('welcome-message');
    const logoutButton = document.getElementById('logout-button'); // Esta era la línea que faltaba
    const supervisorSelect = document.getElementById('supervisor-select');
    const promotorSelect = document.getElementById('promotor-select');
    
    const imageContainer = document.getElementById('image-container');
    const reportImage = document.getElementById('report-image');
    const loadingText = document.getElementById('loading-text');

    let webData = null;

    // Cargar los datos del JSON
    fetch('data.json')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            webData = data;
            console.log("Datos cargados correctamente.");
        })
        .catch(error => {
            console.error("Error al cargar data.json:", error);
            errorMessage.textContent = "Error fatal al cargar datos. Contacta al administrador.";
        });

    // Lógica del Login
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        errorMessage.textContent = '';
        const email = emailInput.value.toLowerCase().trim();
        const password = passwordInput.value.toUpperCase().trim();

        if (!webData) {
            errorMessage.textContent = "Los datos aún no están listos. Intenta de nuevo.";
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
    
    // Lógica de la interfaz principal
    function setupMainInterface(user) {
        welcomeMessage.textContent = `Bienvenido, ${user.nombre}`;
        
        const ejecutivoData = webData.reporteData[user.lookup_key];

        if (!ejecutivoData) {
            console.error(`No se encontraron datos para el ejecutivo con clave: ${user.lookup_key}`);
            supervisorSelect.disabled = true;
            promotorSelect.disabled = true;
            supervisorSelect.innerHTML = '<option value="">-- No hay supervisores asignados --</option>';
            return;
        }

        // Llenar dropdown de supervisores
        supervisorSelect.innerHTML = '<option value="">-- Elige un supervisor --</option>';
        Object.keys(ejecutivoData).sort().forEach(supervisorKey => {
            const option = document.createElement('option');
            option.value = supervisorKey;
            option.textContent = supervisorKey.replace(/_/g, ' ');
            supervisorSelect.appendChild(option);
        });
        supervisorSelect.disabled = false;

        // Event listener para el cambio de supervisor
        supervisorSelect.addEventListener('change', () => {
            promotorSelect.innerHTML = '<option value="">-- Elige un promotor --</option>';
            promotorSelect.disabled = true;
            imageContainer.classList.add('hidden');
            
            const selectedSupervisorKey = supervisorSelect.value;
            if (selectedSupervisorKey) {
                const promotores = ejecutivoData[selectedSupervisorKey];
                promotores.forEach(promotor => {
                    const option = document.createElement('option');
                    option.value = promotor.ruta_grafico;
                    option.textContent = `${promotor.nombre} (${promotor.login})`;
                    promotorSelect.appendChild(option);
                });
                promotorSelect.disabled = false;
            }
        });

        // Event listener para el cambio de promotor
        promotorSelect.addEventListener('change', () => {
            const imagePath = promotorSelect.value;
            if (imagePath) {
                imageContainer.classList.remove('hidden');
                loadingText.textContent = "Cargando gráfico...";
                loadingText.classList.remove('hidden');
                reportImage.classList.remove('loaded');
                reportImage.src = '';

                setTimeout(() => {
                    reportImage.src = encodeURI(imagePath); 
                    reportImage.onload = () => {
                        loadingText.classList.add('hidden');
                        reportImage.classList.add('loaded');
                    };
                    reportImage.onerror = () => {
                         loadingText.textContent = "Error: No se pudo cargar el gráfico. Revisa la ruta.";
                    };
                }, 300);
            } else {
                imageContainer.classList.add('hidden');
            }
        });
    }

    // Lógica del Logout
    logoutButton.addEventListener('click', () => {
        location.reload();
    });
});