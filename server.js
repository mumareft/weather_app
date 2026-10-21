require("dotenv").config();
const express = require("express");
const app = express();
app.use(express.static("public"));

const API_KEY = process.env.OPENWEATHER_API_KEY;

if (require.main === module) {
    app.listen(3000, () => {
        console.log("Server running on port 3000");
    });
}


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

// WEATHER TIME MACHINE
app.get("/api/history", async (req, res) => {

    try {
        const { city, countryCode = "", year } = req.query;
        if (typeof city !== "string" || !city.trim() ||
            typeof year !== "string" || !/^\d{4}$/.test(year) ||
            (countryCode && (typeof countryCode !== "string" || !/^[a-z]{2}$/i.test(countryCode)))) {
            return res.status(400).json({
                error: "Please provide a city, a valid year, and an optional two-letter country code."
            });
        }
        const selectedYear = Number(year);
        const now = new Date();
        const currentYear = now.getFullYear();
        const latestAvailableDate = new Date(now);
        latestAvailableDate.setDate(latestAvailableDate.getDate() - 5);
        if (selectedYear < 1940 || selectedYear > currentYear) {
            return res.status(400).json({
                error: `Choose a year from 1940 to ${currentYear}.`
            });
        }

        // GET GEO DATA
        const countryFilter = countryCode
            ? `&countryCode=${encodeURIComponent(countryCode.toUpperCase())}`
            : "";
        const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city.trim())}&count=1${countryFilter}`;
        const geoResponse = await fetch(url);
        if (!geoResponse.ok) {
            return res.status(502).json({ error: "Unable to contact the historical weather service." });
        }
        const geoData = await geoResponse.json();
        if (!geoData.results || geoData.results.length === 0) {
            return res.status(404).json({ error: "City not found." });
        }
        const location = geoData.results[0];
        const latitude = location.latitude;
        const longitude = location.longitude;
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            throw new Error("The geocoding service returned invalid coordinates.");
        }

        const startDate = `${selectedYear}-01-01`;
        const endDate = selectedYear === currentYear
            ? latestAvailableDate.toISOString().slice(0, 10)
            : `${selectedYear}-12-31`;

        // HISTORICAL WEATHER
        const historyUrl =
            `https://archive-api.open-meteo.com/v1/archive?latitude=${latitude}&longitude=${longitude}&start_date=${startDate}&end_date=${endDate}&daily=temperature_2m_mean,precipitation_sum,wind_speed_10m_mean&timezone=auto`;
        const historyResponse = await fetch(historyUrl);
        if (!historyResponse.ok) {
            throw new Error("Unable to retrieve historical weather.");
        }
        const historyData = await historyResponse.json();
        if (!historyData.daily || !Array.isArray(historyData.daily.time)) {
            throw new Error("The historical weather service returned no daily data.");
        }

        res.json({
            city: location.name,
            country: location.country_code,
            year: selectedYear,
            daily: historyData.daily
        });

    } catch (error) {
        console.error("Historical weather error:", error);

        res.status(502).json({
            error: "Failed to retrieve historical weather data."
        });
    }

});

module.exports = app;