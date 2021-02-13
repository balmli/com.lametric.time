# Control your LaMetric Time

With this app you can:

- Send notifications, with icon and sound
- Activate a specific widget
- Control the Alarm clock, Radio, Timer, Stopwatch and Weather apps
- Set the volume
- Set the brightness of the display


## Details about actions (then):

#### 'Notification (icon code)' and 'Notification (icon code and sound)'

Icon codes can be defined as 'Icon ID' or in 'binary format'.
 
Icon ID looks like <prefix>XXX, where <prefix> is “i” (for static icon) or “a” (for animation). 
XXX - is the number of the icon and can be found at https://developer.lametric.com/icons.
 
Binary icon string must be in this format (png):

"data:image/png;base64,<base64 encoded png binary>"

or gif:

"data:image/gif;base64,<base64 encoded gif binary>"

## Release Notes:

#### 1.2.1

- Trim spaces from icon code

#### 1.2.0

- Supporting 5000 of the most popular icons
- Added two actions to specify your own icons

#### 1.1.0

- Added flows to set clockface

#### 1.0.0

- Fixed Homey Community ID

#### 0.9.2

- Removed SSDP discovery

#### 0.9.1

- First release
