'use strict';

const { OAuth2Driver } = require('homey-oauth2app');

module.exports = class LametricDriver extends OAuth2Driver {

    onOAuth2Init() {
    }

    async onPairListDevices({ oAuth2Client }) {
        const devices = await oAuth2Client.getDevices();
        return devices.map(device => {
            return {
                name: device.name,
                data: {
                    id: device.id
                },
                settings: {
                    ip_address: device.ipv4_internal
                },
                store: {
                    api_key: device.api_key
                }
            }
        });
    }

}
