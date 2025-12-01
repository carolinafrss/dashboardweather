# dashboardweather (Dashboard de Previsão do Tempo)

Esta atividade visa consolidar os conhecimentos de HTML, CSS e JavaScript, focando na manipulação da DOM, requisições assíncronas (Fetch API) e integração de bibliotecas externas para visualização de dados (gráficos).

Exemplo de API:
https://public-web.meteosource.com/weather-api-porto-alegre
https://open-meteo.com/
https://openweathermap.org/api

Objetivo

1. Desenvolver um Dashboard de Previsão do Tempo funcional, com os seguintes requisitos:
2. Exibir o clima atual para uma cidade.
3. Exibir a previsão do tempo para os próximos 5 dias.
4. Permitir a busca da previsão por nome da cidade.
5. Permitir a busca da previsão usando a geolocalização do usuário.
6. Adicionar gráficos para visualizar a oscilação de temperatura e umidade da previsão de 5 dias.
7. Ter opções da troca de tema(dark e light).
8. Garanta um layout responsivo para celular e desktop.


Interligação das APIs
Open-Meteo (Principal): Utilizada para buscar o Clima Atual (Requisito 1), a Previsão de 5 Dias (Requisito 2), e os dados horários para os Gráficos (Requisito 5).

Open-Meteo Geocoding: Utilizada na função fetchCoordinates(cityName) para traduzir o nome da cidade em coordenadas (Latitude/Longitude), que são então usadas pela API principal (Requisito 3).

API de Geolocalização do Navegador: Usada na função fetchWeatherByGeolocation() para obter as coordenadas do usuário (Requisito 4).

Open-Meteo (Fases da Lua/Sol): Utilizada para obter a fase lunar e o nascer do sol/pôr do sol (Requisito 9).
