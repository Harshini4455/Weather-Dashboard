document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const cityInput = document.getElementById('city-input');
    const searchBtn = document.getElementById('search-btn');
    const locationBtn = document.getElementById('location-btn');
    const themeSwitch = document.getElementById('theme-switch');
    const unitButtons = document.querySelectorAll('.unit-btn');
    const recentSearchesList = document.getElementById('recent-searches');
    const notification = document.getElementById('notification');
    
    // State
    let currentUnit = 'celsius';
    let recentSearches = JSON.parse(localStorage.getItem('recentSearches')) || [];
    
    // Initialize
    initTheme();
    loadRecentSearches();
    fetchWeatherData(cityInput.value);
    
    // Event Listeners
    searchBtn.addEventListener('click', handleSearch);
    locationBtn.addEventListener('click', handleLocation);
    cityInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });
    
    themeSwitch.addEventListener('change', toggleTheme);
    
    unitButtons.forEach(btn => {
        btn.addEventListener('click', () => switchUnit(btn.dataset.unit));
    });
    
    // Functions
    function initTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        themeSwitch.checked = savedTheme === 'dark';
    }
    
    function toggleTheme() {
        const newTheme = themeSwitch.checked ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        
        // Animate theme change
        gsap.fromTo('body', 
            { backgroundColor: newTheme === 'dark' ? '#f8f9fa' : '#121212' },
            { backgroundColor: newTheme === 'dark' ? '#121212' : '#f8f9fa', duration: 0.5 }
        );
    }
    
    function handleSearch() {
        const city = cityInput.value.trim();
        if (city) {
            fetchWeatherData(city);
            addToRecentSearches(city);
            animateSearch();
        } else {
            showNotification('Please enter a city name');
        }
    }
    
    function animateSearch() {
        gsap.fromTo(searchBtn, 
            { scale: 1 },
            { 
                scale: 1.2,
                duration: 0.2,
                yoyo: true,
                repeat: 1 
            }
        );
    }
    
    function handleLocation() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    fetchWeatherByCoords(latitude, longitude);
                    animateLocationButton();
                },
                (error) => {
                    showNotification('Unable to retrieve your location');
                    console.error('Geolocation error:', error);
                }
            );
        } else {
            showNotification('Geolocation is not supported by your browser');
        }
    }
    
    function animateLocationButton() {
        gsap.fromTo(locationBtn, 
            { rotation: 0 },
            { 
                rotation: 360,
                duration: 0.5,
                ease: "power2.out"
            }
        );
    }
    
    async function fetchWeatherData(city) {
        try {
            // Show loading state
            document.getElementById('city-name').textContent = 'Loading...';
            document.getElementById('current-temp').textContent = '--';
            
            // Animate card loading
            gsap.from('.weather-card', {
                opacity: 0,
                y: 20,
                duration: 0.5
            });
            
            const response = await fetch(`/api/weather?city=${city}&units=${currentUnit === 'celsius' ? 'metric' : 'imperial'}`);
            const data = await response.json();
            
            if (!response.ok) throw new Error(data.error || 'Failed to fetch weather data');
            
            updateUI(data);
            animateWeatherData();
        } catch (error) {
            console.error('Error:', error);
            showNotification(error.message || 'Failed to fetch weather data');
            document.getElementById('city-name').textContent = '--';
        }
    }
    
    async function fetchWeatherByCoords(lat, lon) {
        try {
            // Show loading state
            document.getElementById('city-name').textContent = 'Loading...';
            document.getElementById('current-temp').textContent = '--';
            
            const response = await fetch(`/api/weather?lat=${lat}&lon=${lon}&units=${currentUnit === 'celsius' ? 'metric' : 'imperial'}`);
            const data = await response.json();
            
            if (!response.ok) throw new Error(data.error || 'Failed to fetch weather data');
            
            updateUI(data);
            addToRecentSearches(data.current.name);
            animateWeatherData();
        } catch (error) {
            console.error('Error:', error);
            showNotification(error.message || 'Failed to fetch weather data');
            document.getElementById('city-name').textContent = '--';
        }
    }
    
    function updateUI(data) {
        const { current, forecast } = data;
        
        // Current Weather
        document.getElementById('city-name').textContent = `${current.name}, ${current.sys.country}`;
        document.getElementById('current-temp').textContent = Math.round(current.main.temp);
        document.getElementById('weather-condition').textContent = current.weather[0].description;
        document.getElementById('feels-like').textContent = Math.round(current.main.feels_like);
        document.getElementById('humidity').textContent = current.main.humidity;
        document.getElementById('wind-speed').textContent = currentUnit === 'celsius' 
            ? Math.round(current.wind.speed * 3.6) 
            : Math.round(current.wind.speed * 1.609);
        document.getElementById('pressure').textContent = current.main.pressure;
        
        // Weather Icon
        const iconCode = current.weather[0].icon;
        document.getElementById('weather-icon').src = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
        document.getElementById('weather-icon').alt = current.weather[0].description;
        
        // Sunrise/Sunset
        const sunriseTime = new Date(current.sys.sunrise * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const sunsetTime = new Date(current.sys.sunset * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        document.getElementById('sunrise').textContent = sunriseTime;
        document.getElementById('sunset').textContent = sunsetTime;
        
        // Visibility (convert meters to km)
        const visibility = current.visibility / 1000;
        document.getElementById('visibility').textContent = visibility.toFixed(1);
        
        // UV Index (mock value since we're not using One Call API)
        document.getElementById('uv-index').textContent = Math.floor(Math.random() * 10) + 1;
        
        // Forecast
        updateForecast(forecast);
    }
    
    function updateForecast(forecastData) {
        const forecastContainer = document.getElementById('forecast-container');
        forecastContainer.innerHTML = '';
        
        // Group forecasts by day
        const dailyForecasts = {};
        forecastData.list.forEach(item => {
            const date = new Date(item.dt * 1000).toLocaleDateString([], { weekday: 'short' });
            if (!dailyForecasts[date]) {
                dailyForecasts[date] = {
                    temps: [],
                    icons: [],
                    conditions: []
                };
            }
            dailyForecasts[date].temps.push(item.main.temp);
            dailyForecasts[date].icons.push(item.weather[0].icon);
            dailyForecasts[date].conditions.push(item.weather[0].main);
        });
        
        // Get the next 5 days
        const forecastDays = Object.keys(dailyForecasts).slice(1, 6);
        
        forecastDays.forEach((day, index) => {
            const dayData = dailyForecasts[day];
            const maxTemp = Math.round(Math.max(...dayData.temps));
            const minTemp = Math.round(Math.min(...dayData.temps));
            
            // Get most frequent condition and icon
            const conditionCounts = {};
            dayData.conditions.forEach(condition => {
                conditionCounts[condition] = (conditionCounts[condition] || 0) + 1;
            });
            const mostFrequentCondition = Object.keys(conditionCounts).reduce((a, b) => 
                conditionCounts[a] > conditionCounts[b] ? a : b
            );
            
            const iconIndex = dayData.conditions.indexOf(mostFrequentCondition);
            const iconCode = dayData.icons[iconIndex];
            
            // Create forecast item
            const forecastItem = document.createElement('div');
            forecastItem.className = 'forecast-item fade-in';
            forecastItem.style.animationDelay = `${index * 0.1}s`;
            forecastItem.innerHTML = `
                <div class="forecast-day">${day}</div>
                <div class="forecast-icon">
                    <img src="https://openweathermap.org/img/wn/${iconCode}.png" alt="${mostFrequentCondition}">
                </div>
                <div class="forecast-temp">
                    <span>${maxTemp}°</span>
                    <span>${minTemp}°</span>
                </div>
            `;
            
            forecastContainer.appendChild(forecastItem);
        });
    }
    
    function switchUnit(unit) {
        if (unit === currentUnit) return;
        
        currentUnit = unit;
        
        // Update active button
        unitButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.unit === unit);
        });
        
        // Animate unit switch
        gsap.fromTo('.unit-toggle', 
            { scale: 1 },
            { 
                scale: 1.1,
                duration: 0.2,
                yoyo: true,
                repeat: 1 
            }
        );
        
        // Convert temperatures
        const tempElements = [
            document.getElementById('current-temp'),
            document.getElementById('feels-like'),
            ...document.querySelectorAll('.forecast-temp span')
        ];
        
        tempElements.forEach(el => {
            if (el.textContent !== '--') {
                const temp = parseFloat(el.textContent);
                const convertedTemp = unit === 'celsius' ? fahrenheitToCelsius(temp) : celsiusToFahrenheit(temp);
                el.textContent = Math.round(convertedTemp);
            }
        });
        
        // Update wind speed unit
        const windSpeedElement = document.getElementById('wind-speed');
        if (windSpeedElement.textContent !== '--') {
            const speed = parseFloat(windSpeedElement.textContent);
            const convertedSpeed = unit === 'celsius' ? (speed / 1.609).toFixed(1) : (speed * 1.609).toFixed(1);
            windSpeedElement.textContent = Math.round(unit === 'celsius' ? convertedSpeed * 3.6 : convertedSpeed / 3.6);
        }
    }
    
    function celsiusToFahrenheit(c) {
        return (c * 9/5) + 32;
    }
    
    function fahrenheitToCelsius(f) {
        return (f - 32) * 5/9;
    }
    
    function addToRecentSearches(city) {
        // Remove if already exists
        recentSearches = recentSearches.filter(item => item.toLowerCase() !== city.toLowerCase());
        
        // Add to beginning
        recentSearches.unshift(city);
        
        // Keep only last 5 searches
        if (recentSearches.length > 5) {
            recentSearches.pop();
        }
        
        // Save to localStorage
        localStorage.setItem('recentSearches', JSON.stringify(recentSearches));
        
        // Update UI
        loadRecentSearches();
    }
    
    function loadRecentSearches() {
        recentSearchesList.innerHTML = '';
        
        recentSearches.forEach(city => {
            const li = document.createElement('li');
            li.className = 'fade-in';
            li.innerHTML = `
                <span>${city}</span>
                <i class="fas fa-arrow-right"></i>
            `;
            li.addEventListener('click', () => {
                cityInput.value = city;
                fetchWeatherData(city);
                
                // Animate selection
                gsap.fromTo(li, 
                    { x: 0 },
                    { 
                        x: 10,
                        duration: 0.2,
                        yoyo: true,
                        repeat: 1 
                    }
                );
            });
            recentSearchesList.appendChild(li);
        });
    }
    
    function showNotification(message) {
        notification.textContent = message;
        notification.classList.add('show');
        
        // Animate notification
        gsap.fromTo(notification, 
            { y: 100, opacity: 0 },
            { 
                y: 0,
                opacity: 1,
                duration: 0.3,
                ease: "back.out"
            }
        );
        
        setTimeout(() => {
            gsap.to(notification, {
                y: 100,
                opacity: 0,
                duration: 0.3,
                ease: "back.in",
                onComplete: () => notification.classList.remove('show')
            });
        }, 3000);
    }
    
    function animateWeatherData() {
        // Animate weather card
        gsap.from('.weather-card', {
            y: 50,
            opacity: 0,
            duration: 0.8,
            ease: "power2.out"
        });
        
        // Animate detail cards
        gsap.from('.detail-card', {
            y: 30,
            opacity: 0,
            stagger: 0.1,
            duration: 0.6,
            delay: 0.3,
            ease: "back.out"
        });
        
        // Animate additional info cards
        gsap.from('.info-card', {
            y: 30,
            opacity: 0,
            stagger: 0.1,
            duration: 0.6,
            delay: 0.5,
            ease: "back.out"
        });
    }
});