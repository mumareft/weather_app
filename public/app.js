
const app = Vue.createApp({
    data() {
        return {
            city: "",
            message: ""
        };
    },
    methods: {
        checkWeather() {
            alert("Checking weather for "+this.city);
            // this.message = "Weather information for " + this.city;
        }
    }
});

app.mount("#app");
