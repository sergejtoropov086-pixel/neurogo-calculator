// Ваши ключи
const GEOCODER_KEY = '2234f14e-a26e-42e7-b494-e6f8c0f9bc3b'; // Геокодер
const ROUTING_KEY  = '26a5326e-3119-4c44-aea7-377da2892e04'; // Маршрутизация

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('calculateBtn').addEventListener('click', calculateCost);
    document.getElementById('from').addEventListener('input', e => showSuggestions(e.target, 'from'));
    document.getElementById('to').addEventListener('input', e => showSuggestions(e.target, 'to'));
});

async function showSuggestions(input, field) {
    const query = input.value.trim();
    if (!query) {
        document.getElementById(`suggestions${field.charAt(0).toUpperCase() + field.slice(1)}`).classList.remove('show');
        return;
    }

    try {
        const url = `https://geocode-maps.yandex.ru/1.x/?format=json&apikey=${GEOCODER_KEY}&geocode=${encodeURIComponent(query)}&lang=ru_RU&results=5`;
        const res = await fetch(url);
        const data = await res.json();

        const suggestionsDiv = document.getElementById(`suggestions${field.charAt(0).toUpperCase() + field.slice(1)}`);
        suggestionsDiv.innerHTML = '';
        suggestionsDiv.classList.add('show');

        if (!data.response?.GeoObjectCollection?.featureMember) return;

        data.response.GeoObjectCollection.featureMember.forEach(item => {
            const obj = item.GeoObject;
            const name = obj.name || 'Без названия';
            const addressStr = obj.description || 'Адрес не указан';

            const div = document.createElement('div');
            div.className = 'suggestion-item';
            div.textContent = `${name} — ${addressStr}`;
            div.addEventListener('click', () => {
                input.value = `${name} — ${addressStr}`;
                suggestionsDiv.classList.remove('show');
            });
            suggestionsDiv.appendChild(div);
        });

    } catch (err) {
        console.error('Ошибка автодополнения:', err);
    }
}

async function calculateCost() {
    const from = document.getElementById('from').value.trim();
    const to = document.getElementById('to').value.trim();
    const date = document.getElementById('date').value;
    const time = document.getElementById('time').value;
    const carClass = document.getElementById('carClass').value;
    const childSeat = document.getElementById('childSeat').checked;
    const promoCode = document.getElementById('promoCode').value.trim();

    if (!from || !to) {
        alert('Пожалуйста, укажите "Откуда" и "Куда"');
        return;
    }

    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = '<p>🔍 Рассчитываем маршрут...</p>';
    resultDiv.classList.add('show');

    try {
        // Получаем координаты
        const fromCoords = await getCoordinates(from, GEOCODER_KEY);
        const toCoords = await getCoordinates(to, GEOCODER_KEY);

        if (!fromCoords || !toCoords) {
            throw new Error('Не удалось получить координаты для одного из адресов');
        }

        // Рассчитываем маршрут
        const route = await getRoute(fromCoords, toCoords, ROUTING_KEY);

        if (!route) {
            throw new Error('Не удалось рассчитать маршрут');
        }

        // Извлекаем расстояние в километрах
        const distanceKm = route.distance / 1000; // в км
        const durationMin = Math.round(route.duration / 60); // в минутах

        // Определяем стоимость за км
        let pricePerKm = 0;
        switch (carClass) {
            case 'economy':
                pricePerKm = 35;
                break;
            case 'comfort':
                pricePerKm = 45;
                break;
            case 'business':
                pricePerKm = 55;
                break;
            case 'minivan':
                pricePerKm = 65;
                break;
        }

        // Базовая стоимость
        let totalCost = distanceKm * pricePerKm;

        // Дополнительные опции
        if (childSeat) {
            totalCost += 150; // примерная стоимость детского кресла
        }

        // Применяем промокод (если есть)
        let discount = 0;
        if (promoCode.toLowerCase() === 'neuro15') {
            discount = 0.15;
            totalCost *= (1 - discount);
        }

        // Формируем результат
        let resultHTML = `
            <h3>✅ Результат расчёта</h3>
            <p><strong>Маршрут:</strong> ${from} → ${to}</p>
            <p><strong>Дата и время:</strong> ${date} ${time}</p>
            <p><strong>Расстояние:</strong> ${distanceKm.toFixed(1)} км</p>
            <p><strong>Время в пути:</strong> ${durationMin} мин</p>
            <p><strong>Класс авто:</strong> ${getCarClassName(carClass)}</p>
            ${childSeat ? '<p><strong>Детское кресло:</strong> +150₽</p>' : ''}
            ${discount > 0 ? `<p><strong>Скидка по промокоду "${promoCode}":</strong> -${Math.round(discount * 100)}%</p>` : ''}
            <p><strong>Итоговая стоимость:</strong> <span style="color: #4deee9; font-size: 1.5rem;">${Math.round(totalCost)}₽</span></p>
            <p><em>* Стоимость рассчитана ориентировочно. Точную цену сообщит диспетчер при подтверждении заказа.</em></p>
        `;

        resultDiv.innerHTML = resultHTML;

    } catch (error) {
        console.error('Ошибка при поиске:', error);
        resultDiv.innerHTML = `<p>❌ Ошибка: ${error.message}</p>`;
    }
}

// Функция получения координат по адресу
async function getCoordinates(address, apiKey) {
    const url = `https://geocode-maps.yandex.ru/1.x/?format=json&apikey=${apiKey}&geocode=${encodeURIComponent(address)}&lang=ru_RU`;

    const response = await fetch(url);
    const data = await response.json();

    if (!data.response || !data.response.GeoObjectCollection || !data.response.GeoObjectCollection.featureMember) {
        throw new Error(`Не удалось найти адрес: ${address}`);
    }

    const firstObject = data.response.GeoObjectCollection.featureMember[0];
    if (!firstObject || !firstObject.GeoObject || !firstObject.GeoObject.Point || !firstObject.GeoObject.Point.pos) {
        throw new Error(`Не удалось получить координаты для адреса: ${address}`);
    }

    const coords = firstObject.GeoObject.Point.pos.split(' ');
    return {
        lon: parseFloat(coords[0]),
        lat: parseFloat(coords[1])
    };
}

// Функция получения маршрута
async function getRoute(from, to, apiKey) {
    const url = `https://api.routing.yandex.net/v2/route?apikey=${apiKey}&points=${from.lat},${from.lon}|${to.lat},${to.lon}&lang=ru_RU&mode=driving`;

    const response = await fetch(url);
    const data = await response.json();

    if (!data.routes || data.routes.length === 0) {
        throw new Error('Не удалось рассчитать маршрут');
    }

    return data.routes[0].summary;
}

// Вспомогательная функция для названия класса авто
function getCarClassName(classKey) {
    switch (classKey) {
        case 'economy': return 'Эконом';
        case 'comfort': return 'Комфорт';
        case 'business': return 'Бизнес';
        case 'minivan': return 'Минивэн';
        default: return classKey;
    }
}
