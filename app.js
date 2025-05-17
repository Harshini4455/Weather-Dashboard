require('dotenv').config();
const express = require('express');
const axios = require('axios');
const path = require('path');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration
const WEATHER_API_KEY = process.env.WEATHER_API_KEY || 'YOUR_FREE_API_KEY'; // Use OpenWeatherMap or WeatherAPI.com
const BASE_URL = 'https://api.openweathermap.org/data/2.5';

// Middleware
app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, 'public')));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Routes
app.get('/', (req, res) => {
    res.render('index', { 
        title: 'WeatherSphere - Advanced Weather Dashboard',
        defaultCity: 'London' 
    });
});

// API Endpoint to fetch weather data
app.get('/api/weather', async (req, res) => {
    try {
        const { city, lat, lon, units = 'metric' } = req.query;
        
        if (!city && !(lat && lon)) {
            return res.status(400).json({ error: 'Please provide city or coordinates' });
        }

        let url;
        if (city) {
            url = `${BASE_URL}/weather?q=${city}&appid=${WEATHER_API_KEY}&units=${units}`;
        } else {
            url = `${BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${WEATHER_API_KEY}&units=${units}`;
        }

        const response = await axios.get(url);
        
        // Get forecast data
        const forecastUrl = city 
            ? `${BASE_URL}/forecast?q=${city}&appid=${WEATHER_API_KEY}&units=${units}`
            : `${BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${WEATHER_API_KEY}&units=${units}`;
        
        const forecastResponse = await axios.get(forecastUrl);

        res.json({
            current: response.data,
            forecast: forecastResponse.data
        });
    } catch (error) {
        console.error('Weather API Error:', error.message);
        res.status(500).json({ 
            error: 'Failed to fetch weather data',
            details: error.response?.data?.message || error.message
        });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});