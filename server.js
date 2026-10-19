const express = require("express");
const app = express();
app.use(express.static("public"));

app.listen(3000, () => {
    console.log("Server running on port 3000");
});

app.get("/api/weather", (req, res) =>{

    const city = req.query.city;

    console.log("Weather requested for:", city);

    res.json({
        city,
        forecast: [
            { day: "Monday", temperature: 15 },
            { day: "Tuesday", temperature: 17 },
            { day: "Wednesday", temperature: 12 }
        ]
    });
});

app.get("/api/test", (req, res) => {
    res.json({
        city: "Dublin",
        temperature: 15,
        condition: "Cloudy"
    });
});