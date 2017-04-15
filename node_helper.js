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
var moment = require("moment");

function addFieldIfNotExist(object, fieldname) {
    if (!object.hasOwnProperty(fieldname)) {
        object[fieldname] = {};
	};
    return object;
};


module.exports = NodeHelper.create({
	start: function() {
		console.log("Starting module: " + this.name);

		this.config = {}; // config struct for each module
		this.allStops = {}; // list of stops for each module
		this.lastMD5 = {}; // hash of last received arrival list
		this.poller = {}; // poll function for each module
	},

	socketNotificationReceived: function(notification, config) {
		if (notification === "CONFIG") {
			this.config[config.identifier] = config;
			this.allStops[config.identifier] = [];
			this.lastMD5[config.identifier] = [];
			this.initPolling(config.identifier);
			return;
		}
	},

	initPolling: function(identifier) {
		var self = this;

		this.allStops[identifier]=[];
		for(var i=0; i < this.config[identifier].stops.length; i++) {
			this.allStops[identifier].push(this.config[identifier].stops[i]);
		}
		
		this.startPolling(identifier);

		// Reset interval if defined

		this.poller[identifier] = setInterval(function() {
			self.startPolling(identifier);
		}, this.config[identifier].serviceReloadInterval);
	},
	
	startPolling: function(identifier) {
		var self = this;

		if (this.allStops.hasOwnProperty(identifier)) {


		async.map(this.allStops[identifier], this.getStopInfo, function(err, result) {
			var stops = [];
			for(var i=0; i < result.length; i++) {
				stops = stops.concat(result[i]);
			}
			stops.sort(function(a,b) {
				var dateA = new Date(a.time);
				var dateB = new Date(b.time);
				return dateA - dateB;
			});

			stops = stops.slice(0, self.config[identifier].maxItems);

			if (self.hasChanged("stops", stops)) {
				console.log("Updating journeys to mirror");
				var packet = {
					stops: stops,
					target_identifier: identifier
				};
				self.sendSocketNotification("RUTER_UPDATE", packet);
			}
		});
			}
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
					
					if (shouldAddPlatform(journey.MonitoredCall.DeparturePlatformName, stopItem.platforms)) {
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

		var dateParam = ""
		if (stopItem.timeToThere) {
			console.log("Looking for journey in the funture: " + stopItem.timeToThere);
			var min = stopItem.timeToThere;
			dateParam = "?datetime=" + moment(moment.now()).add(min, "minute").format().substring(0, 16);
		} else {
			console.log("Looking for journey right now");
		}
		
		var options = {
			host: "reisapi.ruter.no",
			path: "/StopVisit/GetDepartures/" + stopItem.stopId + dateParam
		};
	
		http.request(options, responseCallback).end();	
	}
});
