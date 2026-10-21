
const app = Vue.createApp({
    data() {
        return {
            loading: false,
            error: "",
            city: "",
            countryCode: "",
            selectedPeriod: "day",
            message: "",
            forecast: [],
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
            }
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
        }
    },
    computed: {
        selectedForecast() {
            return this.forecast
                .map(day => day[this.selectedPeriod])
                .filter(periodForecast => periodForecast !== null);
        },
        rainExpected() {
            return this.selectedForecast.some(day => day.rainfall > 0);
        },
        averageTemperature() {
            if (this.selectedForecast.length === 0) return null;
            const total = this.selectedForecast.reduce((sum, day) => sum + day.temperature, 0);
            return total / this.selectedForecast.length;
        },
        weatherCategory() {
            if (this.averageTemperature === null) return "";
            if (this.averageTemperature < 8) return "Cold";
            if (this.averageTemperature <= 24) return "Mild";
            return "Hot"
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
