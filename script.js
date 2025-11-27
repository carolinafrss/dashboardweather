const API_KEY = "49fbd822241a5560db61e4c3ef5e5d9c"; 
let mapa = null;
let marcador = null;
let chart = null;

// ----------------------------------------------------
//  MUDANÇA COR DA PÁGINA DE ACORDO COM O CLIMA NA CIDADE
// ----------------------------------------------------

// Exemplo de função (simplificada) para mudar a cor com base no clima
function mudarCorFundo(condicaoClimatica) {
  const bodyElement = document.body;

  if (condicaoClimatica === 'Clear') {
    // Céu limpo / Ensolarado
    bodyElement.style.backgroundColor = '#FFD700'; // Amarelo/Dourado
  } else if (condicaoClimatica === 'Clouds') {
    // Nublado
    bodyElement.style.backgroundColor = '#A9A9A9'; // Cinza médio
  } else if (condicaoClimatica === 'Rain') {
    // Chuvoso
    bodyElement.style.backgroundColor = '#4682B4'; // Azul aço
  } else {
    // Outras condições (padrão)
    bodyElement.style.backgroundColor = '#FFFFFF'; // Branco
  }
}

// ----------------------------------------------------
//  TEMA CLARO/ESCURO
// ----------------------------------------------------
function trocarTema() {
    const body = document.body;
    body.classList.toggle("dark");
    body.classList.toggle("light");
}

// ----------------------------------------------------
//  BUSCA POR NOME
// ----------------------------------------------------
async function buscarClima(cidadeDireta = null) {
    const cidade = cidadeDireta || document.getElementById("cityInput").value;
    const result = document.getElementById("weatherResult");

    if (!cidade) {
        result.innerHTML = "<p>Digite uma cidade!</p>";
        return;
    }

    const urlAtual = 
        `https://api.openweathermap.org/data/2.5/weather?q=${cidade}&appid=${API_KEY}&units=metric&lang=pt_br`;

    try {
        const respAtual = await fetch(urlAtual);
        const climaAtual = await respAtual.json();

        if (climaAtual.cod === "404") {
            result.innerHTML = "<p>Cidade não encontrada!</p>";
            return;
        }

        renderClimaAtual(climaAtual);
        atualizarMapa(climaAtual.coord.lat, climaAtual.coord.lon);
        buscarPrevisao5Dias(cidade);

    } catch (error) {
        console.error(error);
        result.innerHTML = "<p>Erro ao buscar os dados!</p>";
    }
}

// ----------------------------------------------------
//  BUSCA POR LOCALIZAÇÃO GPS
// ----------------------------------------------------
function buscarPorLocalizacao() {
    if (!navigator.geolocation) {
        alert("Seu navegador não suporta GPS.");
        return;
    }

    navigator.geolocation.getCurrentPosition(success, error);

    function success(pos) {
        buscarClimaPorCoordenadas(pos.coords.latitude, pos.coords.longitude);
    }

    function error() {
        alert("Não foi possível detectar sua localização.");
    }
}

async function buscarClimaPorCoordenadas(lat, lon) {
    const url = 
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=pt_br`;

    const resp = await fetch(url);
    const data = await resp.json();

    renderClimaAtual(data);
    atualizarMapa(lat, lon);
    buscarPrevisao5Dias(data.name);
}

// ----------------------------------------------------
//  RENDERIZA CLIMA ATUAL
// ----------------------------------------------------
function renderClimaAtual(data) {
    const desc = data.weather[0].description;
    const emoji = escolherEmoji(desc);

    document.getElementById("weatherResult").innerHTML = `
        <div class="current-weather">
            <h2>${data.name} - ${data.sys.country}</h2>
            <p><strong>${emoji} ${desc}</strong></p>
            <p>🌡️ ${data.main.temp}°C</p>
            <p>💧 ${data.main.humidity}%</p>
            <p>🍃 ${data.wind.speed} km/h</p>
        </div>
        <h3>📅 Previsão 5 dias</h3>
        <div class="days-container" id="diasPrevisao"></div>
    `;
}

// ----------------------------------------------------
//  PREVISÃO 5 DIAS E GRÁFICO
// ----------------------------------------------------
async function buscarPrevisao5Dias(cidade) {

    const urlPrev =
        `https://api.openweathermap.org/data/2.5/forecast?q=${cidade}&appid=${API_KEY}&units=metric&lang=pt_br`;

    const resp = await fetch(urlPrev);
    const data = await resp.json();

    const diasDiv = document.getElementById("diasPrevisao");

    const listaFiltrada = data.list.filter(i => i.dt_txt.includes("12:00:00"));

    let labels = [];
    let temps = [];

    diasDiv.innerHTML = "";

    for (let i = 1; i <= 5; i++) {
        const dia = listaFiltrada[i];
        if (!dia) break;

        const desc = dia.weather[0].description;
        const emoji = escolherEmoji(desc);

        const dataDia = new Date(dia.dt * 1000);
        const nomeDia = dataDia.toLocaleDateString("pt-BR", { weekday: "long" });

        labels.push(nomeDia);
        temps.push(dia.main.temp);

        diasDiv.innerHTML += `
            <div class="day-card">
                <h4>${nomeDia.toUpperCase()}</h4>
                <p>${emoji} ${desc}</p>
                <p>🌡️ ${dia.main.temp}°C</p>
            </div>
        `;
    }

    renderChart(labels, temps);
}

// ----------------------------------------------------
//  GRÁFICO CHART.JS
// ----------------------------------------------------
function renderChart(labels, temps) {
    const ctx = document.getElementById("tempChart");

    if (chart) chart.destroy();

    chart = new Chart(ctx, {
        type: "line",
        data: {
            labels: labels,
            datasets: [{
                label: "Temperatura (°C)",
                data: temps,
                backgroundColor: "rgba(0, 123, 255, 0.4)",
                borderColor: "#007bff",
                borderWidth: 2,
                tension: 0.3
            }]
        }
    });
}

// ----------------------------------------------------
//  MAPA LEAFLET
// ----------------------------------------------------
function atualizarMapa(lat, lon) {
    if (!mapa) {
        mapa = L.map("map").setView([lat, lon], 12);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 18,
        }).addTo(mapa);
    }

    mapa.setView([lat, lon], 12);

    if (marcador) marcador.remove();

    marcador = L.marker([lat, lon]).addTo(mapa);
}

// ----------------------------------------------------
//  EMOJIS
// ----------------------------------------------------
function escolherEmoji(desc) {
    desc = desc.toLowerCase();

    if (desc.includes("chuva")) return "🌧️";
    if (desc.includes("garoa")) return "🌦️";
    if (desc.includes("tempestade")) return "⛈️";
    if (desc.includes("nublado")) return "☁️";
    if (desc.includes("neve")) return "❄️";
    if (desc.includes("limpo")) return "☀️";

    return "🌤️";
}
