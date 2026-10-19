
const app = Vue.createApp({
    data() {
        return {
            city: "",
            message: "",
            forecast: []
        };
    },
    methods: {
        async checkWeather() {

            if (this.city.trim() === "") {
                this.message = "Please enter a city";
                return;
            }

            try {
                const response = await fetch("/api/weather?city="+encodeURIComponent(this.city));
                
                if (!response.ok) {
                    throw new Error("Failed to fetch weather data");
                }

                const data = await response.json();

                this.message = "Weather information for " + data.city;

                this.forecast = data.forecast;
            } catch (error) {
                console.error("Error fetching weather data:", error);
                this.message = "Error fetching weather data.";
                this.forecast = [];
            }
        }
    }
});

app.mount("#app");
