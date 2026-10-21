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
    const getPeriodForecast = (periodReadings, period) => {
        if (periodReadings.length === 0) return null;

        const temperatures = periodReadings.map(item => item.main.temp);
        const averageTemperature = temperatures.reduce((sum, temp) => sum + temp, 0) / temperatures.length;
        const windSpeeds = periodReadings.map(item => item.wind.speed);
        const averageWind = windSpeeds.reduce((total, speed) => total + speed, 0) / windSpeeds.length;
        const totalRainfall = periodReadings.reduce((total, item) => total + (item.rain?.["3h"] || 0), 0);
        const targetHour = period === "day" ? 12 : 21;
        const representativeReading = periodReadings.reduce((closest, item) => {
            const hour = new Date((item.dt + weatherData.city.timezone) * 1000).getUTCHours();
            return Math.abs(hour - targetHour) < Math.abs(
                new Date((closest.dt + weatherData.city.timezone) * 1000).getUTCHours() - targetHour
            ) ? item : closest;
        });

        return {
            temperature: Number(averageTemperature.toFixed(1)),
            windSpeed: Number(averageWind.toFixed(1)),
            rainfall: Number(totalRainfall.toFixed(1)),
            description: representativeReading.weather[0].description,
            icon: representativeReading.weather[0].icon
        };
    };

    readings.forEach(item => {
        const localTime = new Date( (item.dt + weatherData.city.timezone) * 1000);
        const date = localTime.toISOString().slice(0, 10);
        if (!groupedDays[date]) {
            groupedDays[date] = [];
        }
        const period = item.sys?.pod === "d" || item.sys?.pod === "n"
            ? item.sys.pod
            : localTime.getUTCHours() >= 6 && localTime.getUTCHours() < 18 ? "d" : "n";
        groupedDays[date].push({ item, period });
    });

    const today = new Date(
        (Date.now() / 1000 + weatherData.city.timezone) * 1000
    ).toISOString().slice(0, 10);

    const dates = Object.keys(groupedDays).sort().filter(date => date > today).slice(0, 3);

    const dailyForecast = dates.map(date => {
        const dayReadings = groupedDays[date];
        return {
            date,
            day: getPeriodForecast(
                dayReadings.filter(reading => reading.period === "d").map(reading => reading.item),
                "day"
            ),
            night: getPeriodForecast(
                dayReadings.filter(reading => reading.period === "n").map(reading => reading.item),
                "night"
            )
        };
    });
    return dailyForecast;
}


app.get("/api/weather", async (req, res) =>{

    try{
        // GET CITY AND COUNTRY FROM QUERY PARAMETERS
        const city = req.query.city;
        const country = req.query.country || "";
        const searchLocation = country ? `${city},${country}` : city;
        console.log(`Weather requested for: ${city}, ${country}`);

        // GET GEO DATA
        const url = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(searchLocation)}&limit=1&appid=${API_KEY}`;
        const geoResponse = await fetch(url);
        if (!geoResponse.ok) {
            return res.status(502).json({ error: "Unable to contact OpenWeather." });
        }
        const geoData = await geoResponse.json();
        if (!geoData || geoData.length === 0) {
            return res.status(404).json({ error: "City not found." });
        }
        const location = geoData[0];
        const countryCode = location.country;
        const lat = location.lat;
        const lon = location.lon;
        
        // GET WEATHER DATA
        const weatherUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`;
        const weatherResponse = await fetch(weatherUrl);
        if (!weatherResponse.ok) {
            return res.status(502).json({ error: "Unable to retrieve weather forecast." });
        }
        const weatherData = await weatherResponse.json();

        // GET AIR DATA
        const airUrl =
        `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`;
        const airResponse = await fetch(airUrl);
        if (!airResponse.ok) {
            return res.status(502).json({ error: "Unable to retrieve air quality data." });
        }
        const airData = await airResponse.json();
        const airQualIndex = airData.list[0].main.aqi;
        const pollutants = airData.list[0].components;

        // Compute Forecast Data
        const dailyForecast = processForecast(weatherData);

        res.json({
            city: location.name,
            country: countryCode,
            forecast: dailyForecast,
            aqi: airQualIndex,
            pollutants: pollutants
        })
    }
    catch (error) {
        console.error("Error fetching weather data:", error);
        res.status(500).json({ error: "Internal server error." });
    }
});