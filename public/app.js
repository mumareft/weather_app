
const app = Vue.createApp({
    data() {
        return {
            loading: false,
            error: "",
            city: "",
            countryCode: "",
            message: "",
            forecast: [],
            aqi: null
        };
    },
    methods: {
        async checkWeather() {

            this.error = "";
            this.message = "";
            this.forecast = [];
            this.aqi = null;
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
        }
    }
});

app.mount("#app");
