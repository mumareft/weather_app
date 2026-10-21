
const app = Vue.createApp({
    data() {
        const today = new Date();
        const currentYear = today.getFullYear();

        return {
            loading: false,
            error: "",
            city: "",
            countryCode: "",
            selectedPeriod: "day",
            message: "",

            // WEATHER FORECAST
            forecast: [],

            // AIR
            aqi: null,
            pollutants: {},
            pollutantNames: {
                so2: "Sulphur dioxide (SO₂)",
                no2: "Nitrogen dioxide (NO₂)",
                pm10: "Particulate matter (PM₁₀)",
                pm2_5: "Fine particulate matter (PM₂.₅)",
                o3: "Ozone (O₃)",
                co: "Carbon monoxide (CO)"
            },
            limits: {
                so2:   [20, 80, 250, 350],
                no2:   [40, 70, 150, 200],
                pm10:  [20, 50, 100, 200],
                pm2_5: [10, 25, 50, 75],
                o3:    [60, 100, 140, 180],
                co:    [4400, 9400, 12400, 15400]
            },
            // Weather Time Machine
            historyYear: "",
            historyYears: Array.from({ length: currentYear - 1940 + 1 }, (_, i) => currentYear - i),

            months: [
                { name: "January", value: 1 },
                { name: "February", value: 2 },
                { name: "March", value: 3 },
                { name: "April", value: 4 },
                { name: "May", value: 5 },
                { name: "June", value: 6 },
                { name: "July", value: 7 },
                { name: "August", value: 8 },
                { name: "September", value: 9 },
                { name: "October", value: 10 },
                { name: "November", value: 11 },
                { name: "December", value: 12 }
            ],

            historyLoading: false,
            historyError: "",
            historyData: null,
            historyMetric: "temperature"
        };
    },
    methods: {
        async checkWeather() {

            this.error = "";
            this.message = "";
            this.forecast = [];
            this.aqi = null;
            this.pollutants = {};
            if (this.city.trim() === "") {
                this.message = "Please enter a city";
                return;
            }
            this.loading = true;

            try {
                // GET DATA FROM SERVER
                const response = await fetch(`/api/weather?city=${encodeURIComponent(this.city)}&country=${encodeURIComponent(this.countryCode)}`);
                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data.error || "Failed to fetch weather data");
                }

                // SET DATA
                this.message = `Weather information for ${this.city.length===data.city.length ? data.city : this.city}, ${data.country}`;
                this.forecast = data.forecast;
                this.aqi = data.aqi;
                this.pollutants = data.pollutants;
            }
            catch (error) {
                this.error = error.message;                
                this.forecast = [];
            }
            finally {
                this.loading = false;
            }
        },
        async getHistoricalWeather() {
            this.historyError = "";
            this.historyData = null;

            if (!this.city.trim()) {
                this.historyError = "Enter a city above before searching its history.";
                return;
            }
            if (!this.historyYear) {
                this.historyError = "Choose a year.";
                return;
            }

            this.historyLoading = true;
            try {
                const params = new URLSearchParams({
                    city: this.city.trim(),
                    countryCode: this.countryCode,
                    year: this.historyYear
                });
                const response = await fetch(`/api/history?${params}`);
                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data.error || "Failed to fetch historical weather.");
                }

                this.historyData = data;
            } catch (error) {
                this.historyError = error.message || "Failed to fetch historical weather.";
            } finally {
                this.historyLoading = false;
            }
        }
    },
    computed: {
        selectedForecast() {
            return this.forecast
                .map(day => day[this.selectedPeriod])
                .filter(periodForecast => periodForecast !== null);
        },
        historicalMonths() {
            if (!this.historyData?.daily?.time) return [];
            const monthly = new Map();
            this.historyData.daily.time.forEach((date, index) => {
                const monthIndex = Number(date.slice(5, 7)) - 1;
                if (!monthly.has(monthIndex)) {
                    monthly.set(monthIndex, {
                        monthIndex,
                        temperatureTotal: 0,
                        temperatureCount: 0,
                        rainfall: 0,
                        rainfallCount: 0,
                        windSpeedTotal: 0,
                        windSpeedCount: 0
                    });
                }
                const month = monthly.get(monthIndex);
                const temperature = this.historyData.daily.temperature_2m_mean?.[index];
                const rainfall = this.historyData.daily.precipitation_sum?.[index];
                const windSpeed = this.historyData.daily.wind_speed_10m_mean?.[index];
                if (typeof temperature === "number" && Number.isFinite(temperature)) {
                    month.temperatureTotal += temperature;
                    month.temperatureCount += 1;
                }
                if (typeof rainfall === "number" && Number.isFinite(rainfall)) {
                    month.rainfall += rainfall;
                    month.rainfallCount += 1;
                }
                if (typeof windSpeed === "number" && Number.isFinite(windSpeed)) {
                    month.windSpeedTotal += windSpeed;
                    month.windSpeedCount += 1;
                }
            });

            return [...monthly.values()].map(month => ({
                monthIndex: month.monthIndex,
                month: this.months[month.monthIndex].name,
                temperature: month.temperatureCount
                    ? month.temperatureTotal / month.temperatureCount
                    : null,
                rainfall: month.rainfallCount ? month.rainfall : null,
                windSpeed: month.windSpeedCount
                    ? month.windSpeedTotal / month.windSpeedCount
                    : null
            }));
        },
        historicalChart() {
            const metrics = {
                temperature: { label: "Mean temperature", unit: "°C", color: "#a96146" },
                rainfall: { label: "Precipitation", unit: "mm", color: "#397e9b" },
                windSpeed: { label: "Mean wind speed", unit: "km/h", color: "#648044" }
            };
            const metric = metrics[this.historyMetric];
            const width = 900;
            const height = 360;
            const plot = { left: 64, right: 22, top: 20, bottom: 48 };
            const plotWidth = width - plot.left - plot.right;
            const plotHeight = height - plot.top - plot.bottom;
            const values = this.historicalMonths.map(month => {
                const value = month[this.historyMetric];
                return this.historyMetric !== "temperature" && typeof value === "number"
                    ? Math.max(0, value)
                    : value;
            });
            const validValues = values.filter(value => typeof value === "number" && Number.isFinite(value));

            if (validValues.length === 0) {
                return { ...metric, width, height, plot, ticks: [], segments: [], points: [], dates: [] };
            }

            let min = Math.min(...validValues);
            let max = Math.max(...validValues);
            if (this.historyMetric !== "temperature") {
                min = 0;
                max = max > 0 ? max * 1.08 : 1;
            } else if (max === min) {
                const padding = Math.max(1, Math.abs(max) * 0.1);
                min -= padding;
                max += padding;
            } else {
                const padding = (max - min) * 0.08;
                min -= padding;
                max += padding;
            }
            const yFor = value => plot.top + ((max - value) / (max - min)) * plotHeight;
            const xFor = index => plot.left + (this.historicalMonths.length <= 1
                ? plotWidth / 2
                : (index / (this.historicalMonths.length - 1)) * plotWidth);

            const ticks = Array.from({ length: 5 }, (_, index) => {
                const value = max - ((max - min) * index) / 4;
                return {
                    value: Number(value.toFixed(1)),
                    y: yFor(value)
                };
            });
            const segments = [];
            let segmentPoints = [];
            const points = [];

            this.historicalMonths.forEach((month, index) => {
                const value = values[index];
                if (typeof value !== "number" || !Number.isFinite(value)) {
                    if (segmentPoints.length) segments.push(segmentPoints);
                    segmentPoints = [];
                    return;
                }
                const point = {
                    x: xFor(index),
                    y: yFor(value),
                    value: Number(value.toFixed(1)),
                    date: `${month.month} ${this.historyData.year}`
                };
                segmentPoints.push(point);
                points.push(point);
            });
            if (segmentPoints.length) segments.push(segmentPoints);
            const chartSegments = segments.map(segment => {
                const linePoints = segment.map(point => `${point.x},${point.y}`).join(" ");
                const areaPoints = [
                    `${segment[0].x},${plot.top + plotHeight}`,
                    ...segment.map(point => `${point.x},${point.y}`),
                    `${segment[segment.length - 1].x},${plot.top + plotHeight}`
                ].join(" ");
                return { linePoints, areaPoints };
            });

            const dates = this.historicalMonths.map((month, index) => ({
                date: month.month.slice(0, 3),
                x: xFor(index)
            }));

            return {
                ...metric,
                width,
                height,
                plot,
                plotWidth,
                plotHeight,
                ticks,
                segments: chartSegments,
                points,
                dates,
                x2: plot.left + plotWidth
            };
        },
        packingRecommendations() {
            if (this.selectedForecast.length === 0) return [];

            const recommendations = [];
            const temperatureCategories = [
                {
                    name: "Cold",
                    matches: temperature => temperature < 8,
                    advice: "Pack a warm coat and insulating layers."
                },
                {
                    name: "Mild",
                    matches: temperature => temperature >= 8 && temperature <= 24,
                    advice: "Pack a light jacket and comfortable layers."
                },
                {
                    name: "Hot",
                    matches: temperature => temperature > 24,
                    advice: "Pack light clothing, and bring sunscreen for time outdoors."
                }
            ];

            temperatureCategories.forEach(category => {
                const days = this.forecast.filter(day =>
                    day[this.selectedPeriod] &&
                    category.matches(day[this.selectedPeriod].temperature)
                );
                if (days.length === 0) return;

                const datesAndTemperatures = days.map(day => {
                    const weekday = new Date(`${day.date}T00:00:00Z`).toLocaleDateString(undefined, {
                        weekday: "long",
                        timeZone: "UTC"
                    });
                    return `${weekday} (${day[this.selectedPeriod].temperature}°C)`;
                });
                recommendations.push({
                    title: `Pack for ${category.name} weather`,
                    detail: `Forecast for ${datesAndTemperatures.join(", ")}. ${category.advice}`
                });
            });

            const rainyDays = this.forecast.filter(day =>
                day[this.selectedPeriod] && day[this.selectedPeriod].rainfall > 0
            );
            if (rainyDays.length > 0) {
                const totalRainfall = rainyDays.reduce(
                    (total, day) => total + day[this.selectedPeriod].rainfall,
                    0
                );
                recommendations.push({
                    title: totalRainfall >= 5 ? "Pack waterproofs" : "Bring an umbrella",
                    detail: `Rain is forecast on ${rainyDays.map(day =>
                        new Date(`${day.date}T00:00:00Z`).toLocaleDateString(undefined, {
                            weekday: "long",
                            timeZone: "UTC"
                        })
                    ).join(", ")} (${totalRainfall.toFixed(1)} mm total).`
                });
            }

            const strongestWind = Math.max(...this.selectedForecast.map(day => day.windSpeed));
            if (strongestWind >= 8) {
                recommendations.push({
                    title: "Consider a windproof layer",
                    detail: `Winds may reach ${strongestWind} m/s during this forecast period.`
                });
            }

            return recommendations;
        },
        pollutantThresholds() {
            return Object.entries(this.limits).map(([key, thresholds]) => ({
                key,
                name: this.pollutantNames[key],
                goodLimit: thresholds[0]
            }));
        },
        badPollutants() {
            const details = {
                so2: {
                    unit: "µg/m³",
                    risk: "May irritate the airways and worsen asthma symptoms, especially in sensitive people."
                },
                no2: {
                    unit: "µg/m³",
                    risk: "May irritate the airways and aggravate asthma or other respiratory conditions."
                },
                pm10: {
                    unit: "µg/m³",
                    risk: "Can irritate the lungs and worsen asthma or other breathing conditions."
                },
                pm2_5: {
                    unit: "µg/m³",
                    risk: "Fine particles can reach deep into the lungs and may affect respiratory and cardiovascular health."
                },
                o3: {
                    unit: "µg/m³",
                    risk: "Can irritate the lungs, cause coughing, and worsen asthma."
                },
                co: {
                    unit: "µg/m³",
                    risk: "At high levels, can reduce oxygen delivery and cause symptoms such as headache or dizziness."
                }
            };
            const categories = ["Good", "Fair", "Moderate", "Poor", "Very Poor"];

            return Object.entries(this.limits).reduce((elevated, [key, thresholds]) => {
                const value = this.pollutants[key];
                if (typeof value !== "number" || value <= thresholds[0]) {
                    return elevated;
                }

                const categoryIndex = thresholds.findIndex(threshold => value <= threshold);
                const category = categories[categoryIndex === -1 ? categories.length - 1 : categoryIndex];
                elevated.push({
                    key,
                    name: this.pollutantNames[key],
                    ...details[key],
                    value: Number(value.toFixed(1)),
                    category,
                    goodLimit: thresholds[0],
                    aboveGoodLimit: Number((value - thresholds[0]).toFixed(1))
                });
                return elevated;
            }, []);
        }
    }
});

app.mount("#app");
