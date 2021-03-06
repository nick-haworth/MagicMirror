/* global Module */

/* Magic Mirror
 * Module: CurrentWeather
 *
 * By Michael Teeuw http://michaelteeuw.nl
 * MIT Licensed.
 */

Module.register("currentweather",{

	// Default module config.
	defaults: {
		postalCode: "SW4 6BE",
		apiKey: "204b868b16cd4f389af65a4bfd603f5d",
		units: config.units,
		updateInterval: 10 * 60 * 3000, // every 30 minutes
		animationSpeed: 1000,
		timeFormat: config.timeFormat,
		showPeriod: true,
		showPeriodUpper: false,
		showWindDirection: true,
		showWindDirectionAsArrow: false,
		useBeaufort: true,
		appendLocationNameToHeader: false,
		useKMPHwind: false,
		lang: config.language,
		decimalSymbol: ".",
		showHumidity: false,
		degreeLabel: false,
		showIndoorTemperature: false,
		showIndoorHumidity: false,
		showFeelsLike: true,
		initialLoadDelay: 0, // 0 seconds delay
		retryDelay: 10 * 60 * 3000, // every 30 minutes
		apiVersion: "v2.0",
		apiBase: "http://api.weatherbit.io",
		weatherEndpoint: "current",
		historicalWeatherEndpoint: "history/daily",
		appendLocationNameToHeader: true,
		calendarClass: "calendar",
		roundTemp: false,
		iconTable: {
			"200": "t01", // "storm with light rain",
			"201": "t02", // "Thunderstorm with rain",
			"202": "t03", // "Thunderstorm with heavy rain",
			"230": "t04", // "Thunderstorm with light drizzle",
			"231": "t04", // "Thunderstorm with drizzle",
			"232": "t04", // "Thunderstorm with heavy drizzle",
			"233": "t05", // "Thunderstorm with Hail",
			"300": "d01", // "Light Drizzle",
			"301": "d02", // "Drizzle",
			"302": "d03", // "Heavy Drizzle",
			"500": "r01", // "Light Rain",
			"501": "r02", // "Moderate Rain",
			"502": "r03", // "Heavy Rain",
			"511": "f01", // "Freezing rain",
			"520": "r04", // "Light shower rain",
			"521": "r05", // "Shower rain",
			"522": "r06", // "Heavy shower rain",
			"600": "s01", // "Light snow",
			"601": "s02", // "Snow",
			"602": "s03", // "Heavy Snow",
			"610": "s04", // "Mix snow/rain",
			"611": "s05", // "Sleet",
			"612": "s05", // "Heavy sleet",
			"621": "s01", // "Snow shower",
			"622": "s02", // "Heavy snow shower",
			"623": "s06", // "Flurries",
			"700": "a01", // "Mist",
			"711": "a02", // "Smoke",
			"721": "a03", // "Haze",
			"731": "a04", // "Sand/dust",
			"741": "a05", // "Fog",
			"751": "a06", // "Freezing Fog",
			"800": "c01", // "Clear sky",
			"801": "c02", // "Few clouds",
			"802": "c02", // "Scattered clouds",
			"803": "c03", // "Broken clouds",
			"804": "c04", // "Overcast clouds",
			"900": "u00"  // "Unknown Precipitation"
		},
	},

	// create a variable to hold the location name based on the API result.
	fetchedLocationName: "",

	// Define required scripts.
	getScripts: function() {
		return ["moment.js"];
	},

	// Define required scripts.
	getStyles: function() {
		return ["weather-icons.css", "currentweather.css"];
	},

	// Define required translations.
	getTranslations: function() {
		// The translations for the default modules are defined in the core translation files.
		// Therefor we can just return false. Otherwise we should have returned a dictionary.
		// If you're trying to build your own module including translations, check out the documentation.
		return false;
	},

	// Define start sequence.
	start: function() {
		Log.info("Starting module: " + this.name);

		// Set locale.
		moment.locale(config.language);

		this.windDirection = null;
		this.windDeg = null;
		this.temperature = null;
		this.weatherType = null;
		this.feelsLike = null;
		this.loaded = false;
		this.historicalTemperature = null;
		this.scheduleUpdate(this.config.initialLoadDelay);
	},

	// Override dom generator.
	getDom: function() {
		var wrapper = document.createElement("div");

		if (this.config.appid === "") {
			wrapper.innerHTML = "Please set the correct openweather <i>appid</i> in the config for module: " + this.name + ".";
			wrapper.className = "dimmed light small";
			return wrapper;
		}

		if (!this.loaded) {
			wrapper.innerHTML = this.translate("LOADING");
			wrapper.className = "dimmed light small";
			return wrapper;
		}

		var large = document.createElement("div");
		large.className = "large light";

		var weatherIcon = document.createElement("img");
		weatherIcon.src = this.apiBase + "/static/img/icons/" + this.weatherType + ".png"
		weatherIcon.width = "50"
		weatherIcon.height = "50"
		large.appendChild(weatherIcon);

		var degreeLabel = "";
		if (this.config.units === "metric" || this.config.units === "imperial") {
			degreeLabel += "°";
		}
		if(this.config.degreeLabel) {
			switch(this.config.units) {
			case "metric":
				degreeLabel += "C";
				break;
			case "imperial":
				degreeLabel += "F";
				break;
			case "default":
				degreeLabel += "K";
				break;
			}
		}

		if (this.config.decimalSymbol === "") {
			this.config.decimalSymbol = ".";
		}

		var temperature = document.createElement("span");
		temperature.className = "bright";
		temperature.innerHTML = " " + this.temperature.replace(".", this.config.decimalSymbol) + degreeLabel;
		large.appendChild(temperature);

		if (this.config.showIndoorTemperature && this.indoorTemperature) {
			var indoorIcon = document.createElement("span");
			indoorIcon.className = "fa fa-home";
			large.appendChild(indoorIcon);

			var indoorTemperatureElem = document.createElement("span");
			indoorTemperatureElem.className = "bright";
			indoorTemperatureElem.innerHTML = " " + this.indoorTemperature.replace(".", this.config.decimalSymbol) + degreeLabel;
			large.appendChild(indoorTemperatureElem);
		}

		if (this.config.showIndoorHumidity && this.indoorHumidity) {
			var indoorHumidityIcon = document.createElement("span");
			indoorHumidityIcon.className = "fa fa-tint";
			large.appendChild(indoorHumidityIcon);

			var indoorHumidityElem = document.createElement("span");
			indoorHumidityElem.className = "bright";
			indoorHumidityElem.innerHTML = " " + this.indoorHumidity + "%";
			large.appendChild(indoorHumidityElem);
		}
		temperatureChange.innerHTML = " (" + tempChangeValue + "&deg;C)";
		large.appendChild(temperatureChange);

		wrapper.appendChild(large);

		if (this.config.showFeelsLike){
			var small = document.createElement("div");
			small.className = "normal medium";

			var feelsLike = document.createElement("span");
			feelsLike.className = "dimmed";
			feelsLike.innerHTML = this.translate("FEELS") + " " + this.feelsLike + degreeLabel;
			small.appendChild(feelsLike);

			wrapper.appendChild(small);
		}

		return wrapper;
	},

	// Override getHeader method.
	getHeader: function() {
		if (this.config.appendLocationNameToHeader && this.data.header !== undefined) {
			return this.data.header + " " + this.fetchedLocationName;
		}

		if (this.config.useLocationAsHeader && this.config.location !== false) {
			return this.config.location;
		}

		return this.data.header;
	},

	/* updateWeather(compliments)
	 * Requests new data from openweather.org.
	 * Calls processWeather on succesfull response.
	 */
	updateWeather: function() {
		if (this.config.appid === "") {
			Log.error("CurrentWeather: APPID not set!");
			return;
		}

		var url = this.config.apiBase + "/" + this.config.apiVersion + "/" + this.config.weatherEndpoint + this.getParams();
		var self = this;
		var retry = true;

		var weatherRequest = new XMLHttpRequest();
		weatherRequest.open("GET", url, true);
		weatherRequest.onreadystatechange = function() {
			if (this.readyState === 4) {
				if (this.status === 200) {
					self.processWeather(JSON.parse(this.response).data[0]);
				} else if (this.status === 401) {
					self.updateDom(self.config.animationSpeed);

					Log.error(self.name + ": Incorrect APPID.");
					retry = true;
				} else {
					Log.error(self.name + ": Could not load weather.");
				}

				if (retry) {
					self.scheduleUpdate((self.loaded) ? -1 : self.config.retryDelay);
				}
			}
		};
		weatherRequest.send();
	},

	/* updateWeather(compliments)
	 * Requests new data from openweather.org.
	 * Calls processWeather on succesfull response.
	 */
	updateHistoricalWeather: function() {
		if (this.config.appid === "") {
			Log.error("CurrentWeather: APPID not set!");
			return;
		}

		var url = this.config.apiBase + "/" + this.config.apiVersion + "/" + this.config.historicalWeatherEndpoint + this.getHistoricalParams();
		var self = this;
		var retry = true;

		var historicalWeatherRequest = new XMLHttpRequest();
		historicalWeatherRequest.open("GET", url, true);
		historicalWeatherRequest.onreadystatechange = function() {
			if (this.readyState === 4) {
				if (this.status === 200) {
					self.processHistoricalWeather(JSON.parse(this.response).data[0]);
				} else if (this.status === 401) {
					self.updateDom(self.config.animationSpeed);

					Log.error(self.name + ": Incorrect APPID.");
					retry = true;
				} else {
					Log.error(self.name + ": Could not load weather.");
				}

				if (retry) {
					self.scheduleUpdate((self.loaded) ? -1 : self.config.retryDelay);
				}
			}
		};
		historicalWeatherRequest.send();
	},
	/* getParams(compliments)
	 * Generates an url with api parameters based on the config.
	 *
	 * return String - URL params.
	 */
	getParams: function() {
		var params = "?";
		if(this.config.locationID) {
			params += "id=" + this.config.locationID;
		} else if(this.config.location) {
			params += "q=" + this.config.location;
		} else if (this.firstEvent && this.firstEvent.geo) {
			params += "lat=" + this.firstEvent.geo.lat + "&lon=" + this.firstEvent.geo.lon;
		} else if (this.firstEvent && this.firstEvent.location) {
			params += "q=" + this.firstEvent.location;
		} else {
			this.hide(this.config.animationSpeed, {lockString:this.identifier});
			return;
		}

		params += "&units=" + this.config.units;
		params += "&lang=" + this.config.lang;
		params += "&APPID=" + this.config.appid;

	/* getHistoricalParams(compliments)
	 * Generates an url with api parameters based on the config.
	 *
	 * return String - URL params.
	 */
	getHistoricalParams: function() {
		var params = "?";
		params += "postal_code=" + this.config.postalCode;
		params += "&start_date=" + this.getHistoricalDate(1);
		params += "&end_date=" + this.getHistoricalDate(0);
		params += "&key=" + this.config.apiKey;
		return params;
	},

	/* getYesterdayDate()
	 *
	 * return String - yesterdays date.
	 */
	getHistoricalDate: function(history) {
		var date = new Date();
		var historyDate = new Date(date);
		historyDate.setDate(date.getDate() - history);
		var dd = historyDate.getDate();
		var mm = historyDate.getMonth()+1; //January is 0!
		var yyyy = historyDate.getFullYear();
		if(dd<10){dd='0'+dd} if(mm<10){mm='0'+mm} historyDate = yyyy+'-'+mm+'-'+dd;
		return historyDate;
	},

	/* processWeather(data)
	 * Uses the received data to set the various values.
	 *
	 * argument data object - Weather information received form openweather.org.
	 */
	processWeather: function(data) {

		if (!data || typeof data.temp === "undefined") {
			// Did not receive usable new data.
			// Maybe this needs a better check?
			return;
		}
		this.fetchedLocatioName = data.city_name
		this.temperature = this.roundValue(data.temp);
		this.feelsLike = this.roundValue(data.app_temp);
		this.windDirection = this.deg2Cardinal(data.wind_dir);
		this.windDeg = data.wind_spd;
		this.weatherType = this.config.iconTable[data.weather.code] + data.pod;
		this.show(this.config.animationSpeed, {lockString:this.identifier});
		this.loaded = true;
		this.updateDom(this.config.animationSpeed);
	},

		this.humidity = parseFloat(data.main.humidity);
		this.temperature = this.roundValue(data.main.temp);
		this.fetchedLocationName = data.name;
		this.feelsLike = 0;

		if (this.config.useBeaufort){
			this.windSpeed = this.ms2Beaufort(this.roundValue(data.wind.speed));
		} else if (this.config.useKMPHwind) {
			this.windSpeed = parseFloat((data.wind.speed * 60 * 60) / 1000).toFixed(0);
		} else {
			this.windSpeed = parseFloat(data.wind.speed).toFixed(0);
		}

		// ONLY WORKS IF TEMP IN C //
		var windInMph = parseFloat(data.wind.speed * 2.23694);

		var tempInF = 0;
		switch (this.config.units){
		case "metric": tempInF = 1.8 * this.temperature + 32;
			break;
		case "imperial": tempInF = this.temperature;
			break;
		case "default":
			var tc = this.temperature - 273.15;
			tempInF = 1.8 * tc + 32;
			break;
		}

		if (windInMph > 3 && tempInF < 50){
			// windchill
			var windChillInF = Math.round(35.74+0.6215*tempInF-35.75*Math.pow(windInMph,0.16)+0.4275*tempInF*Math.pow(windInMph,0.16));
			var windChillInC = (windChillInF - 32) * (5/9);
			// this.feelsLike = windChillInC.toFixed(0);

			switch (this.config.units){
			case "metric": this.feelsLike = windChillInC.toFixed(0);
				break;
			case "imperial": this.feelsLike = windChillInF.toFixed(0);
				break;
			case "default":
				var tc = windChillInC + 273.15;
				this.feelsLike = tc.toFixed(0);
				break;
			}

		} else if (tempInF > 80 && this.humidity > 40){
			// heat index
			var Hindex = -42.379 + 2.04901523*tempInF + 10.14333127*this.humidity
				- 0.22475541*tempInF*this.humidity - 6.83783*Math.pow(10,-3)*tempInF*tempInF
				- 5.481717*Math.pow(10,-2)*this.humidity*this.humidity
				+ 1.22874*Math.pow(10,-3)*tempInF*tempInF*this.humidity
				+ 8.5282*Math.pow(10,-4)*tempInF*this.humidity*this.humidity
				- 1.99*Math.pow(10,-6)*tempInF*tempInF*this.humidity*this.humidity;

			switch (this.config.units){
			case "metric": this.feelsLike = parseFloat((Hindex - 32) / 1.8).toFixed(0);
				break;
			case "imperial": this.feelsLike = Hindex.toFixed(0);
				break;
			case "default":
				var tc = parseFloat((Hindex - 32) / 1.8) + 273.15;
				this.feelsLike = tc.toFixed(0);
				break;
			}
		} else {
			this.feelsLike = parseFloat(this.temperature).toFixed(0);
		}

		if (!data || typeof data.temp === "undefined") {
			// Did not receive usable new data.
			// Maybe this needs a better check?
			return;
		}
		this.historicalTemperature = this.roundValue(data.temp);
		this.updateDom(this.config.animationSpeed);
	},

	/* scheduleUpdate()
	 * Schedule next update.
	 *
	 * argument delay number - Milliseconds before next update. If empty, this.config.updateInterval is used.
	 */
	scheduleUpdate: function(delay) {
		var nextLoad = this.config.updateInterval;
		if (typeof delay !== "undefined" && delay >= 0) {
			nextLoad = delay;
		}

		var self = this;
		setTimeout(function() {
			self.updateHistoricalWeather();
			self.updateWeather();
		}, nextLoad);
	},

	deg2Cardinal: function(deg) {
		if (deg>11.25 && deg<=33.75){
			return "NNE";
		} else if (deg > 33.75 && deg <= 56.25) {
			return "NE";
		} else if (deg > 56.25 && deg <= 78.75) {
			return "ENE";
		} else if (deg > 78.75 && deg <= 101.25) {
			return "E";
		} else if (deg > 101.25 && deg <= 123.75) {
			return "ESE";
		} else if (deg > 123.75 && deg <= 146.25) {
			return "SE";
		} else if (deg > 146.25 && deg <= 168.75) {
			return "SSE";
		} else if (deg > 168.75 && deg <= 191.25) {
			return "S";
		} else if (deg > 191.25 && deg <= 213.75) {
			return "SSW";
		} else if (deg > 213.75 && deg <= 236.25) {
			return "SW";
		} else if (deg > 236.25 && deg <= 258.75) {
			return "WSW";
		} else if (deg > 258.75 && deg <= 281.25) {
			return "W";
		} else if (deg > 281.25 && deg <= 303.75) {
			return "WNW";
		} else if (deg > 303.75 && deg <= 326.25) {
			return "NW";
		} else if (deg > 326.25 && deg <= 348.75) {
			return "NNW";
		} else {
			return "N";
		}
	},

	/* function(temperature)
	 * Rounds a temperature to 1 decimal or integer (depending on config.roundTemp).
	 *
	 * argument temperature number - Temperature.
	 *
	 * return string - Rounded Temperature.
	 */
	roundValue: function(temperature) {
		var decimals = this.config.roundTemp ? 0 : 1;
		return parseFloat(temperature).toFixed(decimals);
	}

});
