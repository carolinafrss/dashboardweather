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

/* * ARQUIVO JAVASCRIPT - Lógica do Dashboard
 * Responsável por conectar com a API Open-Meteo, manipular o DOM e renderizar gráficos.
 */

// --- 1. VARIÁVEIS GLOBAIS E CONFIGURAÇÃO ---
const API_URL = "https://api.open-meteo.com/v1/forecast";
let weatherChartInstance = null; // Armazena a instância do gráfico para poder destruí-la e recriar
let currentChartMode = 'temp';   // Define se o gráfico mostra 'temp' (temperatura) ou 'humidity' (umidade)
let forecastDataCache = null;    // Cache dos dados para evitar chamadas de API desnecessárias ao trocar o modo do gráfico
let currentCity = "Porto Alegre"; // Cidade padrão

// --- 2. FUNÇÕES DE UTILIDADE E EVENT LISTENERS ---

// Inicializa a aplicação
document.addEventListener('DOMContentLoaded', () => {
    // Busca a previsão inicial (Porto Alegre por padrão)
    fetchWeatherByCity(currentCity);

    // Adiciona Event Listeners
    document.getElementById('search-button').addEventListener('click', handleCitySearch);
    document.getElementById('city-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleCitySearch();
    });
    document.getElementById('geo-button').addEventListener('click', fetchWeatherByGeolocation);
    document.getElementById('toggle-theme').addEventListener('click', toggleTheme);
    document.getElementById('toggle-chart-mode').addEventListener('click', toggleChartMode);
});

/**
 * Lida com a busca de previsão pelo nome da cidade (Requisito 3)
 */
function handleCitySearch() {
    const city = document.getElementById('city-input').value.trim();
    if (city) {
        // Usa Google Search para encontrar Lat/Lon da cidade
        fetchCoordinates(city);
    } else {
        alert("Por favor, digite o nome de uma cidade.");
    }
}

// Função para buscar coordenadas (lat/lon) a partir do nome da cidade usando a API Open-Meteo (Geocoding)

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
            currentCity = `${result.name}, ${result.country}`;
            await fetchWeatherData(result.latitude, result.longitude)
        } else {
            alert(`Cidade "${cityName}" não encontrada. Tente novamente.`);
            loadingDiv.innerHTML = `<p class="text-red-500">Cidade não encontrada. Tente "Rio de Janeiro".</p>`;
        }
    } catch (error) {
        console.error("Erro ao buscar coordenadas:", error);
        alert("Erro ao buscar a cidade. Verifique o console para detalhes.");
    }
}

/**
 * Busca a previsão pela geolocalização do usuário (Requisito 4)
 */
function fetchWeatherByGeolocation() {
    if (navigator.geolocation) {
        document.getElementById('current-weather-data').innerHTML = `
            <div class="text-center text-gray-500 dark:text-gray-400">
                <i class="fa-solid fa-map-location-dot fa-2x animate-pulse"></i>
                <p class="mt-2">Obtendo sua localização...</p>
            </div>`;

        navigator.geolocation.getCurrentPosition(
            (position) => {
                // Sucesso: busca dados com as coordenadas
                fetchWeatherData(position.coords.latitude, position.coords.longitude);
                // Define a cidade como "Sua Localização"
                currentCity = "Sua Localização";
            },
            (error) => {
                // Erro: falha na geolocalização
                console.error("Erro na Geolocalização:", error);
                alert(`Erro ao obter a localização: ${error.message}. Voltando à cidade padrão.`);
                fetchWeatherByCity("Porto Alegre"); // Retorna à cidade padrão
            },
            // Opções da geolocalização
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
    } else {
        alert("Geolocalização não é suportada por este navegador.");
    }
}
function fetchWeatherByCity(city) {
    fetchCoordinates(city);
}

// --- 3. FUNÇÕES DE CONEXÃO COM A API OPEN-METEO ---

/**
 * Função principal para buscar dados da API.
 * @param {number} latitude 
 * @param {number} longitude 
 */
async function fetchWeatherData(latitude, longitude) {
    // Parâmetros da API Open-Meteo
    const params = new URLSearchParams({
        latitude: latitude,
        longitude: longitude,
        current: "temperature_2m,relative_humidity_2m,weather_code,is_day,wind_speed_10m",
        hourly: "temperature_2m,relative_humidity_2m",
        daily: "weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_sum,wind_speed_10m_max,rain_sum",
        timezone: "auto",
        forecast_days: 7,
        models: "gfs_seamless"
    });

    // API para Fase da Lua (Requisito 9)
    const moonParams = new URLSearchParams({
        latitude: latitude,
        longitude: longitude,
        daily: "moon_phase",
        timezone: "auto",
    });

    const weatherUrl = `${API_URL}?${params.toString()}`;
    const moonUrl = `${API_URL}?${moonParams.toString()}`;

    try {
        const [weatherResponse, moonResponse] = await Promise.all([
            fetch(weatherUrl),
            fetch(moonUrl)
        ]);

        if (!weatherResponse.ok) throw new Error("Erro ao buscar previsão do tempo.");
        if (!moonResponse.ok) throw new Error("Erro ao buscar fase da lua.");

        const weatherData = await weatherResponse.json();
        const moonData = await moonResponse.json();

        // Combina e armazena em cache
        forecastDataCache = { ...weatherData, ...moonData };

        // 1. Renderiza o Clima Atual (Requisito 1)
        renderCurrentWeather(forecastDataCache.current, forecastDataCache.daily.sunrise[0], currentCity);

        // 2. Renderiza a Previsão 5 Dias (Requisito 2)
        renderForecast(forecastDataCache.daily);

        // 3. Renderiza Gráficos (Requisito 5)
        renderChart(forecastDataCache.hourly, currentChartMode);

        // 4. Renderiza Fases Sol/Lua (Requisito 9)
        const sunrise = forecastDataCache.daily?.sunrise?.[0] || null;
        const moon = forecastDataCache.daily?.moon_phase?.[0] || null;

        renderMoonAndSun(sunrise, moon);


        // 5. Aplica lógica sazonal se o modo estiver ativo (Requisito 8)
        if (document.body.classList.contains('seasonal-mode')) {
            applySeasonLogic(forecastDataCache.current.temperature_2m, forecastDataCache.current.is_day);
        }

    } catch (error) {
        console.error("Erro geral na busca de dados:", error);
        document.getElementById('current-weather-data').innerHTML = `<p class="text-red-500">Falha ao carregar dados do tempo. (${error.message})</p>`;
    }
}

// --- 4. FUNÇÕES DE RENDERIZAÇÃO DO DOM ---

/**
 * Renderiza o clima atual na tela (Requisito 1)
 * @param {object} current - Dados do clima atual
 * @param {string} sunriseTime - Hora do nascer do sol para exibir na tela
 * @param {string} city - Nome da cidade
 */
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
                <p class="text-md text-gray-600 dark:text-gray-300">
                    <i class="fa-solid ${isDay ? 'fa-sun' : 'fa-moon'} mr-1"></i> Hora: ${isDay ? 'Dia' : 'Noite'}
                </p>
            </div>
        </div>
    `;
}

/**
 * Renderiza a previsão para os próximos 5 dias (Requisito 2)
 * @param {object} daily - Dados diários da previsão
 */
function renderForecast(daily) {
    const dataDiv = document.getElementById('forecast-data');
    let html = '';

    // Começa do dia 1 (amanhã) até o dia 5
    for (let i = 1; i <= 5; i++) {
        const date = new Date(daily.time[i]);
        const dayName = date.toLocaleDateString('pt-BR', { weekday: 'short' });
        const maxTemp = Math.round(daily.temperature_2m_max[i]);
        const minTemp = Math.round(daily.temperature_2m_min[i]);
        const weatherIcon = getWeatherIcon(daily.weather_code[i], true); // Icone para o dia
        const weatherDesc = getWeatherDescription(daily.weather_code[i]);

        html += `
            <div class="p-4 glass-panel text-center rounded-xl shadow-lg transform transition duration-300 hover:scale-[1.05] hover:shadow-xl flex flex-col justify-between">
                <p class="text-sm font-bold text-gray-800 dark:text-gray-100">${dayName} (${date.getDate()}/${date.getMonth() + 1})</p>
                <i class="${weatherIcon} text-4xl text-blue-500 dark:text-yellow-400 my-2"></i>
                <p class="text-sm text-gray-600 dark:text-gray-300">${weatherDesc}</p>
                <p class="text-lg font-semibold text-gray-900 dark:text-white mt-1">
                    ${maxTemp}° <span class="text-gray-500 dark:text-gray-400">/ ${minTemp}°</span>
                </p>
            </div>
        `;
    }

    dataDiv.innerHTML = html;
}
// --- 5. FUNÇÕES DE GRÁFICO (Chart.js) ---

/**
 * Alterna entre o modo de gráfico (Temperatura/Umidade) (Requisito 5)
 */
function toggleChartMode() {
    currentChartMode = currentChartMode === 'temp' ? 'humidity' : 'temp';
    const btn = document.getElementById('toggle-chart-mode');

    // Atualiza o texto do botão
    if (currentChartMode === 'temp') {
        btn.innerHTML = '<i class="fa-solid fa-chart-bar mr-1"></i>Alternar para Umidade';
        btn.classList.replace('bg-green-500', 'bg-purple-500');
        btn.classList.replace('hover:bg-green-600', 'hover:bg-purple-600');
    } else {
        btn.innerHTML = '<i class="fa-solid fa-chart-line mr-1"></i>Alternar para Temperatura';
        btn.classList.replace('bg-purple-500', 'bg-green-500');
        btn.classList.replace('hover:bg-purple-600', 'hover:bg-green-600');
    }

    // Recria o gráfico com os novos dados
    if (forecastDataCache) {
        renderChart(forecastDataCache.hourly, currentChartMode);
    }
}

/**
 * Renderiza ou atualiza o gráfico usando Chart.js (Requisito 5)
 * @param {object} hourlyData - Dados horários da previsão
 * @param {string} mode - 'temp' ou 'humidity'
 */
function renderChart(hourlyData, mode) {
    // Destrói a instância anterior, se existir
    if (weatherChartInstance) {
        weatherChartInstance.destroy();
    }

    const canvas = document.getElementById('weather-chart');
    const ctx = canvas.getContext('2d');

    // Seleciona os dados e a configuração baseada no modo
    const isTemp = mode === 'temp';
    const labels = hourlyData.time.slice(0, 5 * 24).map(t => { // Pega 5 dias de dados horários
        const date = new Date(t);
        // Exibe "Dia (Hora)"
        return `${date.toLocaleDateString('pt-BR', { weekday: 'short' })} (${date.getHours()}h)`;
    });
    const data = isTemp ? hourlyData.temperature_2m.slice(0, 5 * 24) : hourlyData.relative_humidity_2m.slice(0, 5 * 24);
    const label = isTemp ? 'Temperatura (°C)' : 'Umidade Relativa (%)';
    const color = isTemp ? 'rgba(255, 99, 132, 1)' : 'rgba(54, 162, 235, 1)';
    const bgColor = isTemp ? 'rgba(255, 99, 132, 0.2)' : 'rgba(54, 162, 235, 0.2)';

    // Cria a nova instância do gráfico (Linha)
    weatherChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: label,
                data: data,
                backgroundColor: bgColor,
                borderColor: color,
                borderWidth: 2,
                fill: true,
                tension: 0.4, // Curva suave
                pointRadius: 1,
                pointHoverRadius: 4,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: false,
                    title: {
                        display: true,
                        text: label
                    }
                },
                x: {
                    // Oculta algumas labels em telas menores para não sobrecarregar
                    ticks: {
                        autoSkip: true,
                        maxTicksLimit: 12 // Limita o número de ticks exibidos
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            label += context.parsed.y + (isTemp ? '°C' : '%');
                            return label;
                        }
                    }
                }
            }
        }
    });
}

// --- 6. FUNÇÕES DE TEMA (Requisito 6 e 8) ---

/**
 * Alterna entre o tema claro e escuro (Requisito 6)
 */
function toggleTheme() {
    // Alterna a classe 'dark' no body
    const isDark = document.body.classList.toggle('dark');
    const btn = document.getElementById('toggle-theme');

    // Atualiza o texto e o ícone do botão
    if (isDark) {
        btn.innerHTML = '<i class="fa-solid fa-sun mr-1"></i>Alternar para Tema Claro';
        btn.classList.replace('bg-gray-600', 'bg-yellow-600');
        btn.classList.replace('hover:bg-gray-700', 'hover:bg-yellow-700');
    } else {
        btn.innerHTML = '<i class="fa-solid fa-moon mr-1"></i>Alternar para Tema Escuro';
        btn.classList.replace('bg-yellow-600', 'bg-gray-600');
        btn.classList.replace('hover:bg-yellow-700', 'hover:bg-gray-700');
    }
}

// Modo Preto e Branco
document.getElementById("bw-btn").addEventListener("click", () => {
    document.body.classList.toggle("blackwhite");
});


/**
 * Alterna o modo de tema sazonal (Requisito 8)
 */
function toggleSeasonalTheme() {
    const btn = document.getElementById('season-btn');
    const isSeasonal = document.body.classList.toggle('seasonal-mode');

    if (isSeasonal) {
        // Ativa modo sazonal
        btn.innerHTML = '<i class="fa-solid fa-check mr-2"></i>Estação Ativa';
        btn.classList.replace('from-green-400', 'from-red-400');
        btn.classList.replace('to-blue-500', 'to-red-600');
        // Se houver dados em cache, aplica a lógica da estação
        if (forecastDataCache) {
            applySeasonLogic(forecastDataCache.current.temperature_2m, forecastDataCache.current.is_day);
        } else {
            // Valor padrão se ainda não tiver dados carregados
            applySeasonLogic(25, 1);
        }
    } else {
        // Desativa modo sazonal
        btn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles mr-2"></i>Modo Estação';
        btn.classList.replace('from-red-400', 'from-green-400');
        btn.classList.replace('to-red-600', 'to-blue-500');

        // Remove as classes de estação
        document.body.className = document.body.className.replace(/season-[\w-]+/g, "").trim();
        // Remove o gradiente de background personalizado
        document.body.style.background = "";

        // Garante que o tema Dark/Light padrão esteja ativo se houver a classe 'dark'
        if (document.body.classList.contains('dark')) {
            document.body.classList.add('dark');
        } else {
            document.body.classList.remove('dark');
        }
    }
}

/**
 * Aplica classe CSS baseada no mês (Estação) e se é dia ou noite (Requisito 8)
 * @param {number} temp - Temperatura atual (para fins informativos, mas o background é pelo mês)
 * @param {number} isDay - 1 para dia, 0 para noite
 */
function applySeasonLogic(temp, isDay) {
    const month = new Date().getMonth() + 1; // 1-12
    let season = "";

    // Definição aproximada de estações para o Hemisfério Sul
    if (month >= 12 || month <= 2) season = "summer"; // Dez, Jan, Fev
    else if (month >= 3 && month <= 5) season = "autumn"; // Mar, Abr, Mai
    else if (month >= 6 && month <= 8) season = "winter"; // Jun, Jul, Ago
    else season = "spring"; // Set, Out, Nov

    const timeSuffix = isDay ? "day" : "night";
    const seasonClass = `season-${season}-${timeSuffix}`;

    // Remove classes anteriores de estação
    document.body.className = document.body.className.replace(/season-[\w-]+/g, "").trim();

    // Adiciona a nova classe
    document.body.classList.add(seasonClass);

    // Adiciona a temperatura atual ao botão sazonal
    const btn = document.getElementById('season-btn');
    btn.innerHTML = `<i class="fa-solid fa-cloud-sun mr-2"></i>${season.toUpperCase()}: ${temp}°C (${isDay ? 'Dia' : 'Noite'})`;
}


// --- 7. MAPPERS PARA ICONES E TEXTOS ---

/**
 * Mapeia o código WMO (weather_code) para um ícone Font Awesome.
 * Fonte: Open-Meteo Weather Codes (WMO)
 */
function getWeatherIcon(code, isDay) {
    switch (code) {
        // Céu limpo
        case 0:
            return isDay ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
        // Principalmente claro
        case 1:
            return isDay ? 'fa-solid fa-cloud-sun' : 'fa-solid fa-cloud-moon';
        // Parcialmente nublado
        case 2:
            return 'fa-solid fa-cloud';
        // Nublado
        case 3:
            return 'fa-solid fa-cloud';
        // Nevoeiro e neblina
        case 45:
        case 48:
            return 'fa-solid fa-smog';
        // Chuvisco
        case 51:
        case 53:
        case 55:
            return 'fa-solid fa-cloud-showers-heavy';
        // Chuva
        case 61:
        case 63:
        case 65:
            return 'fa-solid fa-cloud-rain';
        // Neve
        case 71:
        case 73:
        case 75:
            return 'fa-solid fa-snowflake';
        // Chuva de granizo
        case 77:
            return 'fa-solid fa-cloud-showers-heavy';
        // Pancadas de chuva
        case 80:
        case 81:
        case 82:
            return 'fa-solid fa-cloud-rain';
        // Neve forte/tempestade
        case 85:
        case 86:
            return 'fa-solid fa-snowflake';
        // Trovoadas
        case 95:
        case 96:
        case 99:
            return 'fa-solid fa-bolt';
        default:
            return 'fa-solid fa-question';
    }
}

/**
 * Mapeia o código WMO para uma descrição em português.
 */
function getWeatherDescription(code) {
    switch (code) {
        case 0: return 'Céu Limpo';
        case 1: return 'Principalmente Limpo';
        case 2: return 'Parcialmente Nublado';
        case 3: return 'Nublado';
        case 45: return 'Nevoeiro';
        case 48: return 'Nevoeiro Congelante';
        case 51: return 'Chuvisco Leve';
        case 53: return 'Chuvisco Moderado';
        case 55: return 'Chuvisco Intenso';
        case 61: return 'Chuva Leve';
        case 63: return 'Chuva Moderada';
        case 65: return 'Chuva Forte';
        case 71: return 'Queda de Neve Leve';
        case 73: return 'Queda de Neve Moderada';
        case 75: return 'Queda de Neve Forte';
        case 80: return 'Pancadas de Chuva Leve';
        case 81: return 'Pancadas de Chuva Moderada';
        case 82: return 'Pancadas de Chuva Violenta';
        case 85: return 'Neve Leve';
        case 86: return 'Neve Forte';
        case 95: return 'Trovoada';
        case 96: return 'Trovoada com Granizo Leve';
        case 99: return 'Trovoada com Granizo Forte';
        default: return 'Desconhecido';
    }
}

/**
 * Mapeia o código de fase da lua (0 a 1) para um nome.
 * Fonte: Open-Meteo Moon Phase Codes (0 a 1, onde 0 = Lua Nova, 0.5 = Lua Cheia)
 */
function getMoonPhase(code) {
    if (code === 0) return 'Lua Nova';
    if (code > 0 && code < 0.25) return 'Lua Crescente (Côncava)';
    if (code === 0.25) return 'Quarto Crescente';
    if (code > 0.25 && code < 0.5) return 'Lua Crescente (Convexa)';
    if (code === 0.5) return 'Lua Cheia';
    if (code > 0.5 && code < 0.75) return 'Lua Minguante (Convexa)';
    if (code === 0.75) return 'Quarto Minguante';
    if (code > 0.75 && code < 1) return 'Lua Minguante (Côncava)';
    if (code === 1) return 'Lua Nova'; // 1 é o mesmo que 0
    return '--';
}

