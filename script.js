// Ваши ключи
const GEOCODER_KEY = '5fbee5d2-b168-4e9a-86f9-a9509a28d2e6'; // Геокодер
const ROUTING_KEY  = '26a5326e-3119-4c44-aea7-377da2892e04'; // Маршрутизация

document.getElementById('calculateBtn').addEventListener('click', calculate);

async function calculate() {
    const from = document.getElementById('from').value.trim();
    const to = document.getElementById('to').value.trim();
    const car = document.getElementById('carClass').value;
    const child = document.getElementById('childSeat').checked;
    
    if (!from || !to) {
        alert('Заполните оба поля: "Откуда" и "Куда"');
        return;
    }

    const result = document.getElementById('result');
    result.innerHTML = '<p>🔍 Рассчитываем маршрут...</p>';
    result.classList.add('show');

    try {
        // Получаем координаты
        const fromCoords = await getCoords(from, GEOCODER_KEY);
        const toCoords = await getCoords(to, GEOCODER_KEY);

        // Получаем маршрут
        const route = await getRoute(fromCoords, toCoords, ROUTING_KEY);

        // Считаем стоимость
        const km = route.distance / 1000;
        const rates = { economy: 35, comfort: 45, business: 55, minivan: 65 };
        let total = km * rates[car];
        if (child) total += 150;

        // Вывод
        result.innerHTML = `
            <h2>✅ Расчёт готов</h2>
            <p><strong>Маршрут:</strong> ${from} → ${to}</p>
            <p><strong>Расстояние:</strong> ${km.toFixed(1)} км</p>
            <p><strong>Время:</strong> ~${Math.round(route.duration / 60)} мин</p>
            <p><strong>Стоимость:</strong> <span style="color:#4deee9;font-size:1.3rem;">${Math.round(total)}₽</span></p>
            ${child ? '<p>➕ Детское кресло: +150₽</p>' : ''}
        `;
    } catch (err) {
        result.innerHTML = `<p>❌ Ошибка: ${err.message}</p>`;
        console.error(err);
    }
}

// Геокодер
async function getCoords(address, key) {
    const url = `https://geocode-maps.yandex.ru/1.x/?format=json&apikey=${key}&geocode=${encodeURIComponent(address)}&lang=ru_RU`;
    const res = await fetch(url);
    const data = await res.json();

    // Проверяем структуру ответа
    if (!data.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject?.Point?.pos) {
        throw new Error(`Не удалось найти адрес: ${address}`);
    }

    const geo = data.response.GeoObjectCollection.featureMember[0].GeoObject;
    const [lon, lat] = geo.Point.pos.split(' ').map(Number);
    return { lon, lat };
}

// Маршрутизация
async function getRoute(from, to, key) {
    const url = `https://api.routing.yandex.net/v2/route?apikey=${key}&points=${from.lat},${from.lon}|${to.lat},${to.lon}&lang=ru_RU&mode=driving`;
    const res = await fetch(url);
    const data = await res.json();

    // Проверяем, есть ли маршрут
    if (!data.routes || data.routes.length === 0) {
        throw new Error('Не удалось построить маршрут. Проверьте адреса или API ключ.');
    }

    return data.routes[0].summary;
}
