/* Magic Mirror
 * Node Helper: Ruter
 *
 * By Cato Antonsen (https://github.com/CatoAntonsen)
 * MIT Licensed.
 */

var NodeHelper = require("node_helper");
var http = require("http");
var async = require("async");
var crypto = require("crypto");


module.exports = NodeHelper.create({
	start: function() {
		console.log("Starting module: " + this.name);
		this.allStops = [];
		this.lastMD5 = [];
		this.config = null;

	},

	socketNotificationReceived: function(notification, config) {
		if (notification === "CONFIG") {
			this.config = config;
			this.initPolling();
			return;
		}
	},

	initPolling: function() {
		for(var i=0; i < this.config.stops.length; i++) {
			this.allStops.push(this.config.stops[i]);
		}
		
		this.startPolling();
		
		setInterval(function() {
			this.startPolling();
		}, this.config.serviceReloadInterval);
	},
	
	startPolling: function() {
		var self = this;
		
		async.map(this.allStops, this.getStopInfo, function(err, result) {
			var stops = [];
			for(var i=0; i < result.length; i++) {
				stops = stops.concat(result[i]);
			}
			stops.sort(function(a,b) {
				var dateA = new Date(a.time);
				var dateB = new Date(b.time);
				return dateA - dateB;
			});

			stops = stops.slice(0, self.config.maxItems);
			
			if (self.hasChanged("stops", stops)) {
				console.log("Updating journeys to mirror");
				self.sendSocketNotification("RUTER_UPDATE", stops);
			}
		});
	},
	
	hasChanged: function(key, value) {
		var md5sum = crypto.createHash("md5");
		md5sum.update(JSON.stringify(value));
		var md5Hash = md5sum.digest("hex");
		if (md5Hash != this.lastMD5[key]) {
			this.lastMD5[key] = md5Hash;
			return true;
		} else {
			return false;
		}
	},
	
	getStopInfo: function(stopItem, callback) {
		var str = "";

		var responseCallback = function(response) {
			
			response.on("data", function(chunk) {
				str += chunk;
			});
			
			response.on("end", function() {

				var shouldAddPlatform = function(platform, platformFilter) {
					if (platformFilter == null || platformFilter.length == 0) { return true; } // If we don't add any interesting platformFilter, then we asume we'll show all
					for(var i=0; i < platformFilter.length; i++) {
						if (platformFilter[i] === platform) { return true; }
					}
					
					return false;
				};
			
				var stops = JSON.parse(str);

				var allStopItems = new Array();

				for(var j = 0; j < stops.length; j++) {
					var journey = stops[j].MonitoredVehicleJourney;
					
					if (shouldAddPlatform(journey.MonitoredCall.DeparturePlatformName, stopItem.platformFilter)) {
						var numBlockParts = null;
						if (journey.TrainBlockPart != null) {
							numBlockParts = journey.TrainBlockPart.NumberOfBlockParts;
						}
						allStopItems.push({
							stopId: stopItem.stopId,
							lineName: journey.PublishedLineName,
							destinationName: journey.DestinationName,
							time: journey.MonitoredCall.ExpectedDepartureTime,
							platform: journey.MonitoredCall.DeparturePlatformName
						});
					}
				};

				callback(null, allStopItems);
			});
			
			response.on("error", function(error) {
				console.error("------------->" + error)
			});
		}

		var options = {
			host: "reisapi.ruter.no",
			path: "/StopVisit/GetDepartures/" + stopItem.stopId 
		};
	
		http.request(options, responseCallback).end();	
	}
});
