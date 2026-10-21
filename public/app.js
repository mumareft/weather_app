
const app = Vue.createApp({
    data() {
        return {
            loading: false,
            error: "",
            city: "",
            countryCode: "",
            message: "",
            forecast: [],
            aqi: null,
            pollutants: {},
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
        rainExpected() {
            return this.forecast.some(day=>day.rainfall>0);
        },
        averageTemperature() {
            if (this.forecast.length === 0) return null;
            const total = this.forecast.reduce((sum, day)=>sum+day.temperature,0);
            return total/this.forecast.length;
        },
        weatherCategory() {
            if (this.averageTemperature === null) return "";
            if (this.averageTemperature < 8) return "Cold";
            if (this.averageTemperature <= 24) return "Mild";
            return "Hot"
        },
        badPollutants() {
            const details = {
                so2: {
                    name: "Sulphur dioxide (SO₂)",
                    unit: "µg/m³",
                    risk: "May irritate the airways and worsen asthma symptoms, especially in sensitive people."
                },
                no2: {
                    name: "Nitrogen dioxide (NO₂)",
                    unit: "µg/m³",
                    risk: "May irritate the airways and aggravate asthma or other respiratory conditions."
                },
                pm10: {
                    name: "Particulate matter (PM₁₀)",
                    unit: "µg/m³",
                    risk: "Can irritate the lungs and worsen asthma or other breathing conditions."
                },
                pm2_5: {
                    name: "Fine particulate matter (PM₂.₅)",
                    unit: "µg/m³",
                    risk: "Fine particles can reach deep into the lungs and may affect respiratory and cardiovascular health."
                },
                o3: {
                    name: "Ozone (O₃)",
                    unit: "µg/m³",
                    risk: "Can irritate the lungs, cause coughing, and worsen asthma."
                },
                co: {
                    name: "Carbon monoxide (CO)",
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
