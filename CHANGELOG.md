# MMM-Ruter Change Log

## [1.3.0] - 2017-08-19
- The name of the stop will now automatically be fetched if you set `showStopName`. But you can still override it with the stop config value: `stopName`. See [documentation](README.md "MMM-Ruter Documentation") for more information.

## [1.2.0] - 2017-08-13
- Added the option to display a custom stop name in the list. New module config value: `showStopName` and new stop config value: `stopName`. See [documentation](README.md "MMM-Ruter Documentation") for more information.
- Fixed time format

## [1.1.0] - 2017-04-17

- Now it's possible to add multiple instances of the module
- Added some padding between line number and stop name
- Set default animationSpeed to 0 to prevent "blinking" when module updates often
- Moved all service calls and logic from node_helper.js ("backend") to MMM-Ruter.js ("frontent") to simplify a rather complex logic. My initial goal by putting everything in the backend, was to reduce number of calls to the service. That was not a good design decision...


## [1.0.2] - 2016-11-01

- Added timeToThere config value to stops
- Fixed duplication of journeys if manually refreshed

## [1.0.1] - 2016-10-24

- Fixed stupid this/self-bug in the refresh-code that I managed to introduce just before initial commit

## [1.0.0] - 2016-10-23

- Initial version
