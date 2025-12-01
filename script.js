async function showSuggestions(input, field) {
    const query = input.value.trim();
    if (!query) {
        document.getElementById(`suggestions${field.charAt(0).toUpperCase() + field.slice(1)}`).classList.remove('show');
        return;
    }

    try {
        const url = `https://geocode-maps.yandex.ru/1.x/?format=json&apikey=${GEOCODER_KEY}&geocode=${encodeURIComponent(query)}&lang=ru_RU&results=10`;
        const res = await fetch(url);
        const data = await res.json();

        const suggestionsDiv = document.getElementById(`suggestions${field.charAt(0).toUpperCase() + field.slice(1)}`);
        suggestionsDiv.innerHTML = '';
        suggestionsDiv.classList.add('show');

        if (!data.response?.GeoObjectCollection?.featureMember) return;

        // Фильтруем только российские адреса
        const russianResults = data.response.GeoObjectCollection.featureMember.filter(item => {
            const country = item.GeoObject.metaDataProperty?.GeocoderMetaData?.AddressDetails?.Country?.CountryName;
            return country === 'Россия';
        });

        if (russianResults.length === 0) {
            suggestionsDiv.innerHTML = '<div class="suggestion-item">Нет результатов в России</div>';
            return;
        }

        russianResults.forEach(item => {
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
