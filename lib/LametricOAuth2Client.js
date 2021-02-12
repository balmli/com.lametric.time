'use strict';

const { OAuth2Client, OAuth2Error } = require('homey-oauth2app');

module.exports = class LametricOAuth2Client extends OAuth2Client {

    async onHandleNotOK({ body }) {
        throw new OAuth2Error(body.error);
    }

    async getDevices() {
        return this.get({
            path: '/users/me/devices'
        });
    }

    async getIcons() {
        return this.get({
            path: `/icons?page=0&page_size=5000&fields=id,title,code,thumb&order=popular`
        });
    }


}
