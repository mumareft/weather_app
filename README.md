# Travel Weather Planner

A small web app for checking the weather and air quality at a travel destination, with practical packing suggestions for the next three days.

## Features

- Search for a city, optionally narrowing the result by country.
- View a three-day forecast with weather icons, temperatures, wind speeds, and rainfall.
- Switch between daytime and nighttime forecasts.
- Get packing suggestions based on the selected forecast period, including cold or warm clothing, rain, and strong wind.
- View the air-quality index, elevated pollutant measurements, potential health risks, and Good-category thresholds.
- Compare monthly mean temperature, precipitation totals, and mean wind speed across a selected historical year.

## Requirements

- Node.js 18 or later.
- An OpenWeather API key with access to Geocoding, 5 Day / 3 Hour Forecast, and Air Pollution APIs.
- Internet access for OpenWeather requests, Open-Meteo historical weather requests, Vue 3 (loaded from a CDN), and weather icons.

## Setup

1. Install the dependencies:

   ```sh
   npm install
   ```

2. Create a `.env` file in the project root and add your OpenWeather API key:

   ```env
   OPENWEATHER_API_KEY=your_openweather_api_key
   ```

   Keep the key private; do not commit `.env` to version control.

3. Start the server:

   ```sh
   node server.js
   ```

4. Open [http://localhost:3000](http://localhost:3000) in a browser.

## Project structure

```text
public/
  app.js       Vue app state, API calls, and packing recommendations
  index.html   Page markup
  style.css    Responsive page styles
server.js      Express server and OpenWeather API integration
```

The server exposes:

- `GET /api/weather?city=<city>&country=<optional ISO country code>` for the forecast and air-quality data.
- `GET /api/history?city=<city>&countryCode=<optional ISO country code>&year=<year>` for daily historical weather data for the selected year. The archive starts in 1940; current-year data ends five days before today.

The history endpoint uses Open-Meteo's geocoding and historical archive APIs; it does not require an additional API key.

## Development notes

The app has no automated test suite configured in `package.json`. `npm test` currently reports that no tests are specified.
