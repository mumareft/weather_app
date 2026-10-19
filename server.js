require("dotenv").config();
const express = require("express");
const app = express();
app.use(express.static("public"));

const API_KEY = process.env.OPENWEATHER_API_KEY;

app.listen(3000, () => {
    console.log("Server running on port 3000");
});

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
    
    console.log("Geocoding data:", geoData);
    
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

    res.json({
        city: location.name,
        forecast: weatherData.list
    })
});

app.get("/api/test", (req, res) => {
    res.json({
        city: "Dublin",
        temperature: 15,
        condition: "Cloudy"
    });
});