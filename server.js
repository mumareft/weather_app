import express from "express";

const app = express();

app.get("/", (req, res) => {
    res.send("Hello from my weather server!");
});

app.listen(3000, () => {
    console.log("Server running on port 3000");
});

app.get("/api/test", (req, res) => {
    res.json({
        city: "Dublin",
        temperature: 15,
        condition: "Cloudy"
    });
});