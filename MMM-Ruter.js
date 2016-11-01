/* Magic Mirror
 * Module: Ruter
 *
 * By Cato Antonsen (https://github.com/CatoAntonsen)
 * MIT Licensed.
 */
 
Module.register("MMM-Ruter",{

	// Default module config.
	defaults: {
		showHeader: false, 				// Set this to true to show header above the journeys (default is false)
		showPlatform: false,			// Set this to true to get the names of the platforms (default is false)
		maxItems: 5,					// Number of journeys to display (default is 5)
		humanizeTimeTreshold: 15, 		// If time to next journey is below this value, it will be displayed as "x minutes" instead of time (default is 15 minutes)
		serviceReloadInterval: 30000, 	// Refresh rate in MS for how often we call Ruter's web service. NB! Don't set it too low! (default is 30 seconds)
		timeReloadInterval: 1000, 		// Refresh rate how often we check if we need to update the time shown on the mirror (default is every second)
		animationSpeed: 1000, 			// How fast the animation changes when updating mirror (default is 1 second)
		fade: true,						// Set this to true to fade list from light to dark. (default is true)
		fadePoint: 0.25 				// Start on 1/4th of the list. 
	},

	getStyles: function () {
		return ["ruter.css"];
	},

	getScripts: function() {
		return ["moment.js"];
	},

	getTranslations: function() {
		return {
			en: "translations/en.json",
			nb: "translations/nb.json"
		}
	},

	start: function() {
		console.log(this.translate("STARTINGMODULE") + ": " + this.name);

		this.journeys = [];
		this.previousTime = [];

		this.sendSocketNotification("CONFIG", this.config);
		
		var self = this;
		
		setInterval(function() {
			self.updateDomIfNeeded();
		}, this.config.timeReloadInterval);

	},

	socketNotificationReceived: function(notification, payload) {
		if (notification === "RUTER_UPDATE") {
			this.journeys = payload;
		}
	},
	
	getDom: function() {
		if (this.journeys.length > 0) {
			
			var table = document.createElement("table");
			table.className = "ruter small";
			
			if (this.config.showHeader) {
				table.appendChild(this.getTableHeaderRow());
			}
			
			for(var i = 0; i < this.journeys.length; i++) {

				var tr = this.getTableRow(this.journeys[i]);
				
				// Create fade effect. <-- stolen from default "calendar" module
				if (this.config.fade && this.config.fadePoint < 1) {
					if (this.config.fadePoint < 0) {
						this.config.fadePoint = 0;
					}
					var startingPoint = this.journeys.length * this.config.fadePoint;
					var steps = this.journeys.length - startingPoint;
					if (i >= startingPoint) {
						var currentStep = i - startingPoint;
						tr.style.opacity = 1 - (1 / steps * currentStep);
					}
				}
				
				table.appendChild(tr);
			}
			
			return table;
		} else {
			var wrapper = document.createElement("div");
			wrapper.innerHTML = this.translate("LOADING");
			wrapper.className = "small dimmed";
		}

		return wrapper;
	},
	
	getTableHeaderRow: function() {
		var thLine = document.createElement("th");
		thLine.className = "light";
		thLine.appendChild(document.createTextNode(this.translate("LINEHEADER")));

		var thDestination = document.createElement("th");
		thDestination.className = "light";
		thDestination.appendChild(document.createTextNode(this.translate("DESTINATIONHEADER")));
		
		var thPlatform = document.createElement("th");
		thPlatform.className = "light";
		thPlatform.appendChild(document.createTextNode(this.translate("PLATFORMHEADER")));
		
		var thTime = document.createElement("th");
		thTime.className = "light time"
		thTime.appendChild(document.createTextNode(this.translate("TIMEHEADER")));

		var thead = document.createElement("thead");
		thead.addClass = "xsmall dimmed";
		thead.appendChild(thLine);
		thead.appendChild(thDestination);
		if (this.config.showPlatform) { thead.appendChild(thPlatform); }
		thead.appendChild(thTime);
		
		return thead;
	},
	
	getTableRow: function(journey) {
		var tdLine = document.createElement("td");
		var txtLine = document.createTextNode(journey.lineName);
		tdLine.appendChild(txtLine);
		
		var tdDestination = document.createElement("td");
		tdDestination.className = "destination bright";
		tdDestination.appendChild(document.createTextNode(journey.destinationName));
		
		if (this.config.showPlatform) {
			var tdPlatform = document.createElement("td");
			tdPlatform.className = "platform";
			tdPlatform.appendChild(document.createTextNode(journey.platform));
		}
		
		var tdTime = document.createElement("td");
		tdTime.className = "time light";
		tdTime.appendChild(document.createTextNode(this.formatTime(journey.time)));
		
		var tr = document.createElement("tr");
		tr.appendChild(tdLine);
		tr.appendChild(tdDestination);
		if (this.config.showPlatform) { tr.appendChild(tdPlatform); }
		tr.appendChild(tdTime);
		
		return tr;
	},
	
	updateDomIfNeeded: function() {
		var needUpdate = false;
		
		for(var i=0; i < this.journeys.length; i++)  {
			var time = this.formatTime(this.journeys[i].time);	
			if (this.previousTime[i] != time) {
				needUpdate = true;
				this.previousTime[i] = time;
			}
		}
		
		if (needUpdate) {
			this.updateDom(this.config.animationSpeed);
		}
	},
	
	formatTime: function(t) {
		var min = moment.duration(moment(t) - moment.now()).minutes();
		if (min == 0) {
			return this.translate("NOW")
		} else if (min == 1) {
			return this.translate("1MIN");
		} else if (min < this.config.humanizeTimeTreshold) {
			return min + " " + this.translate("MINUTES");
		} else {
			return moment(t).format("LT");
		}
	}
});
