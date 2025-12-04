/* Desenvolver uma pagina que possua um Dashboard de Previsão do Tempo funcional, com os seguintes requisitos:

1. Exibir o clima atual para uma cidade.
2. Exibir a previsão do tempo para os próximos 5 dias.
3. Permitir a busca da previsão por nome da cidade.
4. Permitir a busca da previsão usando a geolocalização do usuário.
5. Adicionar gráficos para visualizar a oscilação de temperatura e umidade da previsão de 5 dias.
6. Ter opções da troca de tema da página(dark e light).
7. Garanta um layout responsivo para celular e desktop.
    Extra:
a) Adicionado um botão para que mude a cor da pagina com as cores de acordo com a estação no momento do ano e mostrando a temperatura atual da cidade.
b) Adicionado um calendario com as fases do Sol e as fases da Lua.

Exemplo de APIs que podem ser usadas:
https://public-web.meteosource.com/weather-api-porto-alegre
https://open-meteo.com/
https://openweathermap.org/api */

/* ARQUIVO JAVASCRIPT - Lógica do Dashboard
 * Responsável por conectar com a API Open-Meteo, manipular o DOM e renderizar gráficos.
 */

// --- 1. VARIÁVEIS GLOBAIS E CONFIGURAÇÃO ---
const API_URL = "https://api.open-meteo.com/v1/forecast";
let weatherChartInstance = null; // Armazena a instância do gráfico
let currentChartMode = 'temp';   // 'temp' ou 'humidity'
let forecastDataCache = null;    // Cache dos dados
let currentCity = "Porto Alegre"; // Cidade padrão

// --- 2. FUNÇÕES DE UTILIDADE E EVENT LISTENERS ---

document.addEventListener('DOMContentLoaded', () => {
    // Busca a previsão inicial
    fetchWeatherByCity(currentCity);

    // Event Listeners
    document.getElementById('search-button').addEventListener('click', handleCitySearch);
    document.getElementById('city-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleCitySearch();
    });
    document.getElementById('geo-button').addEventListener('click', fetchWeatherByGeolocation);
    document.getElementById('toggle-theme').addEventListener('click', toggleTheme);
    document.getElementById('toggle-chart-mode').addEventListener('click', toggleChartMode);

    // Botão Preto e Branco (existente no HTML)
    const bwBtn = document.getElementById("bw-btn");
    if (bwBtn) {
        bwBtn.addEventListener("click", () => {
            document.body.classList.toggle("blackwhite");
        });
    }
});

function handleCitySearch() {
    const city = document.getElementById('city-input').value.trim();
    if (city) {
        fetchCoordinates(city);
    } else {
        alert("Por favor, digite o nome de uma cidade.");
    }
}

// Busca Latitude/Longitude pelo nome da cidade
async function fetchCoordinates(cityName) {
    try {
        const loadingDiv = document.getElementById('current-weather-data');
        loadingDiv.innerHTML = `<div class="text-center text-gray-500 dark:text-gray-400">
                                    <i class="fa-solid fa-spinner fa-spin-pulse fa-2x"></i>
                                    <p class="mt-2">Buscando coordenadas para ${cityName}...</p>
                                </div>`;

        const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=pt&format=json`;
        const response = await fetch(geoUrl);

        if (!response.ok) throw new Error("Erro ao buscar coordenadas.");

        const data = await response.json();
        if (data.results && data.results.length > 0) {
            const result = data.results[0];
            currentCity = `${result.name}, ${result.country || ''}`;
            // Chama a função principal de clima com as novas coordenadas
            await fetchWeatherData(result.latitude, result.longitude);
        } else {
            alert(`Cidade "${cityName}" não encontrada.`);
            loadingDiv.innerHTML = `<p class="text-red-500">Cidade não encontrada.</p>`;
        }
    } catch (error) {
        console.error("Erro na busca de cidade:", error);
        alert("Erro ao buscar a cidade. Verifique sua conexão.");
    }
}

// Geolocalização
function fetchWeatherByGeolocation() {
    if (navigator.geolocation) {
        const loadingDiv = document.getElementById('current-weather-data');
        loadingDiv.innerHTML = `
            <div class="text-center text-gray-500 dark:text-gray-400">
                <i class="fa-solid fa-map-location-dot fa-2x animate-pulse"></i>
                <p class="mt-2">Obtendo sua localização...</p>
            </div>`;

        navigator.geolocation.getCurrentPosition(
            (position) => {
                currentCity = "Sua Localização";
                fetchWeatherData(position.coords.latitude, position.coords.longitude);
            },
            (error) => {
                console.error("Erro na Geolocalização:", error);
                alert("Não foi possível obter sua localização. Verifique as permissões do navegador.");
                fetchWeatherByCity("Porto Alegre"); // Fallback
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    } else {
        alert("Geolocalização não suportada neste navegador.");
    }
}

function fetchWeatherByCity(city) {
    fetchCoordinates(city);
}

// --- 3. CONEXÃO COM API E LOGICA PRINCIPAL ---

async function fetchWeatherData(latitude, longitude) {
    // Parâmetros unificados (Clima + Lua na mesma chamada)
    // Adicionado 'moon_phase' e 'sunrise' na string daily
    const params = new URLSearchParams({
        latitude: latitude,
        longitude: longitude,
        current: "temperature_2m,relative_humidity_2m,weather_code,is_day,wind_speed_10m",
        hourly: "temperature_2m,relative_humidity_2m",
        daily: "weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_sum,wind_speed_10m_max,rain_sum,moon_phase",
        timezone: "auto",
        forecast_days: 7,
        models: "gfs_seamless"
    });

    const url = `${API_URL}?${params.toString()}`;

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error("Erro ao buscar dados da API.");

        const data = await response.json();
        forecastDataCache = data; // Salva no cache global

        // 1. Renderiza Clima Atual
        // Pega o nascer do sol de hoje (índice 0)
        renderCurrentWeather(data.current, data.daily.sunrise[0], currentCity);

        // 2. Renderiza Previsão 5 Dias
        renderForecast(data.daily);

        // 3. Renderiza Gráfico
        renderChart(data.hourly, currentChartMode);

        // 4. Renderiza Sol e Lua (ESTA FUNÇÃO ESTAVA FALTANDO)
        const todaySunrise = data.daily.sunrise ? data.daily.sunrise[0] : null;
        const todayMoonPhase = data.daily.moon_phase ? data.daily.moon_phase[0] : 0;
        renderMoonAndSun(todaySunrise, todayMoonPhase);

        // 5. Lógica Sazonal (se ativada)
        if (document.body.classList.contains('seasonal-mode')) {
            applySeasonLogic(data.current.temperature_2m, data.current.is_day);
        }

    } catch (error) {
        console.error("Erro fatal:", error);
        document.getElementById('current-weather-data').innerHTML = `<p class="text-red-500">Erro ao carregar dados: ${error.message}</p>`;
    }
}

// --- 4. FUNÇÕES DE RENDERIZAÇÃO ---

function renderCurrentWeather(current, sunriseTime, city) {
    const dataDiv = document.getElementById('current-weather-data');
    const temp = Math.round(current.temperature_2m);
    const humidity = current.relative_humidity_2m;
    const wind = current.wind_speed_10m;
    const isDay = current.is_day;
    const weatherIcon = getWeatherIcon(current.weather_code, isDay);
    const weatherDescription = getWeatherDescription(current.weather_code);

    dataDiv.innerHTML = `
        <div class="flex flex-col md:flex-row items-center justify-between w-full p-4 transform transition duration-500 hover:shadow-xl rounded-lg">
            <div class="flex items-center mb-4 md:mb-0">
                <i class="${weatherIcon} text-6xl text-blue-500 dark:text-yellow-400 mr-4 animate-scale-up"></i>
                <div>
                    <p class="text-5xl font-extrabold text-gray-900 dark:text-white">${temp}°C</p>
                    <p class="text-xl font-semibold text-gray-600 dark:text-gray-300">${weatherDescription}</p>
                </div>
            </div>
            <div class="text-left md:text-right space-y-2">
                <p class="text-2xl font-bold text-gray-800 dark:text-gray-100"><i class="fa-solid fa-city mr-1"></i> ${city}</p>
                <p class="text-md text-gray-600 dark:text-gray-300">
                    <i class="fa-solid fa-tint mr-1"></i> Umidade: ${humidity}% 
                </p>
                <p class="text-md text-gray-600 dark:text-gray-300">
                    <i class="fa-solid fa-wind mr-1"></i> Vento: ${wind} km/h
                </p>
            </div>
        </div>
    `;
}

function renderForecast(daily) {
    const dataDiv = document.getElementById('forecast-data');
    let html = '';

    // Dias 1 a 5 (Amanhã em diante)
    for (let i = 1; i <= 5; i++) {
        if (!daily.time[i]) continue;

        const date = new Date(daily.time[i]);
        // Ajuste para exibir dia da semana correto (GMT vs Local)
        const userTimezoneOffset = date.getTimezoneOffset() * 60000;
        const adjustedDate = new Date(date.getTime() + userTimezoneOffset + (12 * 60 * 60 * 1000)); // Meio-dia

        const dayName = adjustedDate.toLocaleDateString('pt-BR', { weekday: 'short' });
        const dayMonth = `${adjustedDate.getDate()}/${adjustedDate.getMonth() + 1}`;

        const maxTemp = Math.round(daily.temperature_2m_max[i]);
        const minTemp = Math.round(daily.temperature_2m_min[i]);
        const weatherIcon = getWeatherIcon(daily.weather_code[i], true);
        const weatherDesc = getWeatherDescription(daily.weather_code[i]);

        html += `
            <div class="p-4 glass-panel text-center rounded-xl shadow-lg transform transition duration-300 hover:scale-[1.05] flex flex-col justify-between items-center">
                <p class="text-sm font-bold text-gray-800 dark:text-gray-100 uppercase">${dayName}</p>
                <p class="text-xs text-gray-500 mb-2">${dayMonth}</p>
                <i class="${weatherIcon} text-3xl text-blue-500 dark:text-yellow-400 my-2"></i>
                <p class="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 h-8">${weatherDesc}</p>
                <div class="mt-2 text-lg font-semibold text-gray-900 dark:text-white">
                    ${maxTemp}° <span class="text-sm text-gray-500">/ ${minTemp}°</span>
                </div>
            </div>
        `;
    }
    dataDiv.innerHTML = html;
}

// --- NOVA FUNÇÃO QUE FALTAVA ---
function renderMoonAndSun(sunriseISO, moonPhaseCode) {
    // 1. Atualiza Nascer do Sol
    const sunriseEl = document.getElementById('sunrise-time');
    if (sunriseISO) {
        const date = new Date(sunriseISO);
        // Formata apenas para Hora:Minuto
        const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        sunriseEl.textContent = timeStr;
    } else {
        sunriseEl.textContent = "--:--";
    }

    // 2. Atualiza Fase da Lua
    const moonEl = document.getElementById('moon-phase');
    const moonDesc = getMoonPhase(moonPhaseCode);
    moonEl.textContent = moonDesc;
}

// --- 5. GRÁFICOS ---

function toggleChartMode() {
    currentChartMode = currentChartMode === 'temp' ? 'humidity' : 'temp';
    const btn = document.getElementById('toggle-chart-mode');

    if (currentChartMode === 'temp') {
        btn.innerHTML = '<i class="fa-solid fa-chart-bar mr-1"></i>Alternar para Umidade';
        btn.classList.replace('bg-green-500', 'bg-purple-500');
        btn.classList.replace('hover:bg-green-600', 'hover:bg-purple-600');
    } else {
        btn.innerHTML = '<i class="fa-solid fa-chart-line mr-1"></i>Alternar para Temperatura';
        btn.classList.replace('bg-purple-500', 'bg-green-500');
        btn.classList.replace('hover:bg-purple-600', 'hover:bg-green-600');
    }

    if (forecastDataCache) {
        renderChart(forecastDataCache.hourly, currentChartMode);
    }
}

function renderChart(hourlyData, mode) {
    if (weatherChartInstance) {
        weatherChartInstance.destroy();
    }

    const canvas = document.getElementById('weather-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const isTemp = mode === 'temp';
    // Pega as próximas 24h ou 48h para o gráfico não ficar muito denso
    const hourslimit = 24 * 3; // 3 dias
    const labels = hourlyData.time.slice(0, hourslimit).map(t => {
        const date = new Date(t);
        return `${date.getHours()}h`;
    });

    const dataPoints = isTemp
        ? hourlyData.temperature_2m.slice(0, hourslimit)
        : hourlyData.relative_humidity_2m.slice(0, hourslimit);

    const label = isTemp ? 'Temperatura (°C)' : 'Umidade (%)';
    const borderColor = isTemp ? 'rgba(255, 99, 132, 1)' : 'rgba(54, 162, 235, 1)';
    const bgColor = isTemp ? 'rgba(255, 99, 132, 0.2)' : 'rgba(54, 162, 235, 0.2)';

    weatherChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: label,
                data: dataPoints,
                borderColor: borderColor,
                backgroundColor: bgColor,
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: false },
                x: { ticks: { maxTicksLimit: 8 } }
            },
            plugins: {
                legend: { display: true },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                }
            }
        }
    });
}

// --- 6. TEMAS E ESTAÇÕES ---

function toggleTheme() {
    const isDark = document.body.classList.toggle('dark');
    const btn = document.getElementById('toggle-theme');

    if (isDark) {
        btn.innerHTML = '<i class="fa-solid fa-sun mr-1"></i>Modo Claro';
        btn.classList.replace('bg-gray-600', 'bg-yellow-600');
        btn.classList.replace('hover:bg-gray-700', 'hover:bg-yellow-700');
    } else {
        btn.innerHTML = '<i class="fa-solid fa-moon mr-1"></i>Modo Escuro';
        btn.classList.replace('bg-yellow-600', 'bg-gray-600');
        btn.classList.replace('hover:bg-yellow-700', 'hover:bg-gray-700');
    }
}

function toggleSeasonalTheme() {
    const btn = document.getElementById('season-btn');
    const isSeasonal = document.body.classList.toggle('seasonal-mode');

    if (isSeasonal) {
        btn.innerHTML = '<i class="fa-solid fa-check mr-2"></i>Desativar Estação';
        btn.classList.replace('from-green-400', 'from-red-400');
        btn.classList.replace('to-blue-500', 'to-red-600');

        if (forecastDataCache) {
            applySeasonLogic(forecastDataCache.current.temperature_2m, forecastDataCache.current.is_day);
        } else {
            applySeasonLogic(25, 1);
        }
    } else {
        btn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles mr-2"></i>Modo Estação';
        btn.classList.replace('from-red-400', 'from-green-400');
        btn.classList.replace('to-red-600', 'to-blue-500');

        document.body.className = document.body.className.replace(/season-[\w-]+/g, "").trim();
        document.body.style.background = "";

        // Mantém dark mode se estava ativo
        if (document.body.classList.contains('dark')) {
            // force refresh class logic if needed
        }
    }
}

function applySeasonLogic(temp, isDay) {
    const month = new Date().getMonth() + 1;
    let season = "";

    // Estações Hemisfério Sul
    if (month >= 12 || month <= 2) season = "summer";
    else if (month >= 3 && month <= 5) season = "autumn";
    else if (month >= 6 && month <= 8) season = "winter";
    else season = "spring";

    const timeSuffix = isDay ? "day" : "night";
    const seasonClass = `season-${season}-${timeSuffix}`;

    document.body.className = document.body.className.replace(/season-[\w-]+/g, "").trim();
    document.body.classList.add(seasonClass);
}

// --- 7. HELPERS / UTILS ---

function getWeatherIcon(code, isDay) {
    // Mesma lógica do seu arquivo original
    switch (code) {
        case 0: return isDay ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
        case 1: return isDay ? 'fa-solid fa-cloud-sun' : 'fa-solid fa-cloud-moon';
        case 2: return 'fa-solid fa-cloud';
        case 3: return 'fa-solid fa-cloud';
        case 45: case 48: return 'fa-solid fa-smog';
        case 51: case 53: case 55: return 'fa-solid fa-cloud-showers-heavy';
        case 61: case 63: case 65: return 'fa-solid fa-cloud-rain';
        case 71: case 73: case 75: return 'fa-solid fa-snowflake';
        case 77: return 'fa-solid fa-cloud-showers-heavy';
        case 80: case 81: case 82: return 'fa-solid fa-cloud-rain';
        case 85: case 86: return 'fa-solid fa-snowflake';
        case 95: case 96: case 99: return 'fa-solid fa-bolt';
        default: return 'fa-solid fa-question';
    }
}

function getWeatherDescription(code) {
    switch (code) {
        case 0: return 'Céu Limpo';
        case 1: return 'Poucas Nuvens';
        case 2: return 'Parcialmente Nublado';
        case 3: return 'Nublado';
        case 45: return 'Nevoeiro';
        case 48: return 'Nevoeiro';
        case 51: return 'Chuvisco Leve';
        case 53: return 'Chuvisco Moderado';
        case 55: return 'Chuvisco Intenso';
        case 61: return 'Chuva Leve';
        case 63: return 'Chuva Moderada';
        case 65: return 'Chuva Forte';
        case 71: return 'Neve Leve';
        case 73: return 'Neve Moderada';
        case 75: return 'Neve Forte';
        case 77: return 'Granizo';
        case 80: return 'Pancadas de Chuva';
        case 81: return 'Pancadas Fortes';
        case 82: return 'Tempestade';
        case 85: return 'Neve';
        case 86: return 'Neve Forte';
        case 95: return 'Trovoada';
        case 96: return 'Trovoada c/ Granizo';
        case 99: return 'Trovoada Intensa';
        default: return 'Desconhecido';
    }
}

function getMoonPhase(code) {
    if (code === 0) return 'Lua Nova';
    if (code > 0 && code < 0.25) return 'Lua Crescente';
    if (code === 0.25) return 'Quarto Crescente';
    if (code > 0.25 && code < 0.5) return 'Crescente Gibosa';
    if (code === 0.5) return 'Lua Cheia';
    if (code > 0.5 && code < 0.75) return 'Minguante Gibosa';
    if (code === 0.75) return 'Quarto Minguante';
    if (code > 0.75 && code < 1) return 'Lua Minguante';
    if (code === 1) return 'Lua Nova';
    return 'Desconhecida';
}