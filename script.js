document.addEventListener('DOMContentLoaded', () => {
    const STORAGE_KEY = 'smartGardenState';

    const defaultState = {
        systemName: 'Smart Garden',
        maxTemperature: 30,
        updateInterval: 3000,
        autoMode: true,
        sectorActive: true,
        waterPressure: 4.5,
        soilMoisture: 65,
        waterFlow: 120,
        nextWatering: '04:30',
        darkMode: false,
        sensorTimerId: null
    };

    const savedState = loadState();
    const systemState = { ...defaultState, ...savedState, sensorTimerId: null };

    const elements = {
        systemName: document.querySelector('#system-name'),
        waterPressure: document.querySelector('#water-pressure'),
        soilMoisture: document.querySelector('#soil-moisture'),
        waterFlow: document.querySelector('#water-flow'),
        nextWatering: document.querySelector('#next-watering-time'),

        sectorStatus: document.querySelector('#sector-status'),
        modalSectorStatus: document.querySelector('#modal-sector-status'),
        sectorIndicator: document.querySelector('#sector-indicator'),
        toggleSectorBtn: document.querySelector('#toggle-sector-btn'),

        eventLog: document.querySelector('#event-log'),
        clearLogsBtn: document.querySelector('#clear-logs-btn'),

        settingsForm: document.querySelector('#settings-form'),
        settingsMessage: document.querySelector('#settings-message'),

        deviceNameInput: document.querySelector('#deviceName'),
        maxTemperatureInput: document.querySelector('#maxTemperature'),
        updateIntervalInput: document.querySelector('#updateInterval'),
        autoModeInput: document.querySelector('#autoMode'),

        chartCanvas: document.querySelector('#sensorChart')
    };

    let sensorChart = null;

    function loadState() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : {};
        } catch (error) {
            console.error('Помилка читання localStorage:', error);
            return {};
        }
    }

    function saveState() {
        try {
            const stateToSave = {
                systemName: systemState.systemName,
                maxTemperature: systemState.maxTemperature,
                updateInterval: systemState.updateInterval,
                autoMode: systemState.autoMode,
                sectorActive: systemState.sectorActive,
                waterPressure: systemState.waterPressure,
                soilMoisture: systemState.soilMoisture,
                waterFlow: systemState.waterFlow,
                nextWatering: systemState.nextWatering,
                darkMode: document.documentElement.classList.contains('dark')
            };

            localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
        } catch (error) {
            console.error('Помилка запису в localStorage:', error);
        }
    }

    function applySavedTheme() {
        const html = document.documentElement;
        const knob = document.getElementById('theme-knob');

        if (systemState.darkMode) {
            html.classList.add('dark');
            if (knob) {
                knob.classList.add('translate-x-4');
            }
        } else {
            html.classList.remove('dark');
            if (knob) {
                knob.classList.remove('translate-x-4');
            }
        }
    }

    function fillSettingsForm() {
        if (elements.deviceNameInput) {
            elements.deviceNameInput.value = systemState.systemName;
        }
        if (elements.maxTemperatureInput) {
            elements.maxTemperatureInput.value = systemState.maxTemperature;
        }
        if (elements.updateIntervalInput) {
            elements.updateIntervalInput.value = systemState.updateInterval;
        }
        if (elements.autoModeInput) {
            elements.autoModeInput.checked = systemState.autoMode;
        }
    }

    function addLog(message) {
        if (!elements.eventLog) return;

        const now = new Date();
        const time = now.toLocaleTimeString('uk-UA', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });

        const li = document.createElement('li');
        li.className = 'text-gray-700 dark:text-gray-300';
        li.textContent = `${time} — ${message}`;

        elements.eventLog.prepend(li);

        while (elements.eventLog.children.length > 10) {
            elements.eventLog.removeChild(elements.eventLog.lastElementChild);
        }
    }

    function randomInRange(min, max, digits = 0) {
        const value = Math.random() * (max - min) + min;
        return Number(value.toFixed(digits));
    }

    function updateHeaderUI() {
        if (elements.systemName) {
            elements.systemName.textContent = systemState.systemName;
        }
    }

    function updateSectorUI() {
        const statusText = systemState.sectorActive ? 'Активний' : 'Вимкнений';
        const buttonText = systemState.sectorActive ? 'Вимкнути полив' : 'Увімкнути полив';

        if (elements.sectorStatus) {
            elements.sectorStatus.textContent = statusText;
        }

        if (elements.modalSectorStatus) {
            elements.modalSectorStatus.textContent = `Статус: ${statusText}`;
        }

        if (elements.sectorIndicator) {
            elements.sectorIndicator.classList.remove('bg-primary', 'bg-gray-400');
            elements.sectorIndicator.classList.add(systemState.sectorActive ? 'bg-primary' : 'bg-gray-400');
        }

        if (elements.toggleSectorBtn) {
            elements.toggleSectorBtn.textContent = buttonText;
            elements.toggleSectorBtn.classList.remove(
                'bg-modalRed',
                'hover:bg-modalDarkRed',
                'bg-primary',
                'hover:opacity-90'
            );

            if (systemState.sectorActive) {
                elements.toggleSectorBtn.classList.add('bg-modalRed', 'hover:bg-modalDarkRed');
            } else {
                elements.toggleSectorBtn.classList.add('bg-primary', 'hover:opacity-90');
            }
        }
    }

    function updateSensorUI() {
        if (elements.waterPressure) {
            elements.waterPressure.textContent = `${systemState.waterPressure} Bar`;
        }

        if (elements.soilMoisture) {
            elements.soilMoisture.textContent = `${systemState.soilMoisture}%`;
        }

        if (elements.waterFlow) {
            elements.waterFlow.textContent = `${systemState.waterFlow} л/хв`;
        }

        if (elements.nextWatering) {
            elements.nextWatering.textContent = systemState.nextWatering;
        }
    }

    function updateNextWateringTime() {
        const now = new Date();
        now.setMinutes(now.getMinutes() + randomInRange(10, 120, 0));

        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');

        systemState.nextWatering = `${hh}:${mm}`;
    }

    function initChart() {
        if (!elements.chartCanvas) return;
        if (typeof Chart === 'undefined') {
            console.warn('Chart.js не підключений');
            return;
        }

        const ctx = elements.chartCanvas.getContext('2d');

        sensorChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Вологість ґрунту (%)',
                        data: [],
                        borderWidth: 2,
                        tension: 0.3,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                animation: false,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        min: 0,
                        max: 100
                    }
                }
            }
        });
    }

    function updateChart() {
        if (!sensorChart) return;

        const now = new Date();
        const label = now.toLocaleTimeString('uk-UA', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });

        sensorChart.data.labels.push(label);
        sensorChart.data.datasets[0].data.push(systemState.soilMoisture);

        if (sensorChart.data.labels.length > 12) {
            sensorChart.data.labels.shift();
            sensorChart.data.datasets[0].data.shift();
        }

        sensorChart.update();
    }

function generateSensorData() {
    systemState.waterPressure = randomInRange(3.8, 5.2, 1);
    systemState.soilMoisture = randomInRange(45, 80, 0);

    if (systemState.autoMode) {
        if (systemState.soilMoisture < 50 && !systemState.sectorActive) {
            systemState.sectorActive = true;
            updateSectorUI();
            addLog('Авто: полив увімкнено (низька вологість)');
        }

        if (systemState.soilMoisture > 70 && systemState.sectorActive) {
            systemState.sectorActive = false;
            updateSectorUI();
            addLog('Авто: полив вимкнено (достатня вологість)');
        }
    }

    systemState.waterFlow = systemState.sectorActive ? randomInRange(90, 140, 0) : 0;

    updateNextWateringTime();
    updateSensorUI();
    updateChart();
    saveState();

    if (systemState.soilMoisture < 50) {
        addLog('Попередження: низька вологість ґрунту');
    }

    if (systemState.waterPressure < 4.0) {
        addLog('Попередження: низький тиск води');
    }
}

    function startSensorUpdates() {
        if (systemState.sensorTimerId) {
            clearInterval(systemState.sensorTimerId);
        }

        systemState.sensorTimerId = setInterval(() => {
            generateSensorData();
        }, systemState.updateInterval);
    }

    function showSettingsMessage(message, isSuccess = true) {
        if (!elements.settingsMessage) return;

        elements.settingsMessage.textContent = message;
        elements.settingsMessage.classList.remove(
            'hidden',
            'text-red-600',
            'text-green-600'
        );
        elements.settingsMessage.classList.add(isSuccess ? 'text-green-600' : 'text-red-600');

        setTimeout(() => {
            if (elements.settingsMessage) {
                elements.settingsMessage.classList.add('hidden');
            }
        }, 2500);
    }

    function applySettings(formData) {
        const deviceName = String(formData.get('deviceName') || '').trim();
        const maxTemperature = Number(formData.get('maxTemperature'));
        const updateInterval = Number(formData.get('updateInterval'));
        const autoMode = formData.get('autoMode') === 'on';

        if (!deviceName) {
            showSettingsMessage('Введіть назву пристрою', false);
            return;
        }

        if (Number.isNaN(maxTemperature) || maxTemperature < 10 || maxTemperature > 60) {
            showSettingsMessage('Температура має бути в межах 10–60 °C', false);
            return;
        }

        if (Number.isNaN(updateInterval) || updateInterval < 1000 || updateInterval > 10000) {
            showSettingsMessage('Інтервал має бути в межах 1000–10000 мс', false);
            return;
        }

        systemState.systemName = deviceName;
        systemState.maxTemperature = maxTemperature;
        systemState.updateInterval = updateInterval;
        systemState.autoMode = autoMode;

        updateHeaderUI();
        startSensorUpdates();
        saveState();

        addLog(`Налаштування застосовано: ${deviceName}, інтервал ${updateInterval} мс`);
        showSettingsMessage('Settings applied');
    }

    if (elements.settingsForm) {
        elements.settingsForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const formData = new FormData(elements.settingsForm);
            applySettings(formData);
        });

        elements.settingsForm.addEventListener('reset', () => {
            setTimeout(() => {
                fillSettingsForm();
                showSettingsMessage('Поля повернуто до збережених значень');
            }, 0);
        });
    }

    if (elements.toggleSectorBtn) {
    elements.toggleSectorBtn.addEventListener('click', () => {
        if (systemState.autoMode) {
            addLog('Ручне керування вимкнене (автоматичний режим)');
            return;
        }

        systemState.sectorActive = !systemState.sectorActive;
        updateSectorUI();
        generateSensorData();
        saveState();

        addLog(
            systemState.sectorActive
                ? 'Полив увімкнено для Сектора 1'
                : 'Полив вимкнено для Сектора 1'
        );
    });
}

    if (elements.clearLogsBtn) {
        elements.clearLogsBtn.addEventListener('click', () => {
            if (elements.eventLog) {
                elements.eventLog.innerHTML = '<li class="text-gray-500">Журнал очищено</li>';
            }
            addLog('Журнал подій очищено');
        });
    }

    applySavedTheme();
    updateHeaderUI();
    updateSectorUI();
    updateSensorUI();
    fillSettingsForm();
    initChart();
    updateChart();
    startSensorUpdates();
    addLog('Система запущена');
    saveState();
});

// Темна тема
function toggleDarkMode() {
    const html = document.documentElement;
    const knob = document.getElementById('theme-knob');

    html.classList.toggle('dark');

    if (knob) {
        if (html.classList.contains('dark')) {
            knob.classList.add('translate-x-4');
        } else {
            knob.classList.remove('translate-x-4');
        }
    }

    try {
        const raw = localStorage.getItem('smartGardenState');
        const currentState = raw ? JSON.parse(raw) : {};
        currentState.darkMode = html.classList.contains('dark');
        localStorage.setItem('smartGardenState', JSON.stringify(currentState));
    } catch (error) {
        console.error('Помилка збереження теми:', error);
    }
}

// Перемикання сторінок
function switchPage(pageId) {
    const dashboard = document.getElementById('page-dashboard');
    const settings = document.getElementById('page-settings');
    const navDashboard = document.getElementById('nav-dashboard');
    const navSettings = document.getElementById('nav-settings');

    if (!dashboard || !settings || !navDashboard || !navSettings) return;

    dashboard.classList.add('hidden');
    settings.classList.add('hidden');
    settings.classList.remove('flex');

    const baseClass =
        'flex items-center px-4 py-3 text-neutralText dark:text-darkText hover:text-secondary dark:hover:text-secondary hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition nav-item';

    navDashboard.className = baseClass;
    navSettings.className = baseClass;

    const activeClass =
        'flex items-center px-4 py-3 bg-blue-50 dark:bg-gray-800 text-secondary rounded-lg font-semibold transition nav-item';

    if (pageId === 'dashboard') {
        dashboard.classList.remove('hidden');
        navDashboard.className = activeClass;
    } else if (pageId === 'settings') {
        settings.classList.remove('hidden');
        settings.classList.add('flex');
        navSettings.className = activeClass;
    }
}

// Модальне вікно
function openModal() {
    const modal = document.getElementById('myModal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

function closeModal() {
    const modal = document.getElementById('myModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Відкриття/закриття мобільного меню
function toggleMenu() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('mobile-overlay');

    if (sidebar) {
        sidebar.classList.toggle('-translate-x-full');
    }

    if (overlay) {
        overlay.classList.toggle('hidden');
    }
}
