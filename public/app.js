
const app = Vue.createApp({
    data() {
        return {
            city: "",
            message: "",
        };
    },
    methods: {
        async checkWeather() {

            const response = await fetch("/api/weather?city="+encodeURIComponent(this.city));
            // alert("Checking weather for "+this.city);
            const data = await response.json();

            console.log(data);

            this.message = "Weather information for " + data.city;

            this.forecast = data.forecast;
        }
    }
});

app.mount("#app");
