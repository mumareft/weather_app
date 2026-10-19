require("dotenv").config();
const express = require("express");
const app = express();
app.use(express.static("public"));

const API_KEY = process.env.OPENWEATHER_API_KEY;

app.listen(3000, () => {
    console.log("Server running on port 3000");
});


function processForecast(weatherData) {
    const readings = weatherData.list;
    const groupedDays = {};

    readings.forEach(item => {
        const localTime = new Date( (item.dt + weatherData.city.timezone) * 1000);
        const date = localTime.toISOString().slice(0, 10);
        if (!groupedDays[date]) {
            groupedDays[date] = [];
        }
        groupedDays[date].push(item);
    });

    const today = new Date(
        (Date.now() / 1000 + weatherData.city.timezone) * 1000
    ).toISOString().slice(0, 10);

    const dates = Object.keys(groupedDays).sort().filter(date => date > today).slice(0, 3);

    const dailyForecast = dates.map(date => {
        // Calculate average temperature for the day
        const dayReadings = groupedDays[date];
        const temperatures = dayReadings.map(item => item.main.temp);
        const totalTemperatures = temperatures.reduce((sum, temp) => sum + temp, 0);
        const averageTemperature = totalTemperatures / temperatures.length;
        // Calculate average wind speed for the day
        const windSpeeds = dayReadings.map(item => item.wind.speed);
        const totalWind = windSpeeds.reduce((total, speed) => total + speed, 0);
        const averageWind = totalWind / windSpeeds.length;
        // Calculate total rainfall for the day
        const totalRainfall = dayReadings.reduce((total, item) => total + (item.rain?.["3h"] || 0), 0);

        return {
            date: date,
            temperature: Number(averageTemperature.toFixed(1)),
            windSpeed: Number(averageWind.toFixed(1)),
            rainfall: Number(totalRainfall.toFixed(1))
        };
    });
    return dailyForecast;
}


app.get("/api/weather", async (req, res) =>{

    const city = req.query.city;

    console.log("Weather requested for:", city);

    const url = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${API_KEY}`;

    const geoResponse = await fetch(url);
    
    if (!geoResponse.ok) {
        return res.status(502).json({ error: "Unable to contact OpenWeather." });
    }

    const geoData = await geoResponse.json();
    
    if (!geoData || geoData.length === 0) {
        return res.status(404).json({ error: "City not found." });
    }
    
    const location = geoData[0];
    const lat = location.lat;
    const lon = location.lon;
    
    const weatherUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`;
    
    const weatherResponse = await fetch(weatherUrl);
    
    if (!weatherResponse.ok) {
        return res.status(502).json({ error: "Unable to retrieve weather forecast." });
    }
    
    const weatherData = await weatherResponse.json();

    console.log(weatherData.list[0]);

    const dailyForecast = processForecast(weatherData);

    res.json({
        city: location.name,
        forecast: dailyForecast
    })
});

app.get("/api/test", (req, res) => {
    res.json({
        city: "Dublin",
        temperature: 15,
        condition: "Cloudy"
    });
});