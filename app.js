'use strict';

const { OAuth2App } = require('homey-oauth2app');
const LametricOAuth2Client = require('./lib/LametricOAuth2Client');
const { SOUNDS } = require('./lib/constants');

module.exports = class LametricTimeApp extends OAuth2App {

    async onOAuth2Init() {
        this.enableOAuth2Debug();
        this.setOAuth2Config({
            client: LametricOAuth2Client,
            apiUrl: 'https://developer.lametric.com/api/v2',
            tokenUrl: 'https://developer.lametric.com/api/v2/oauth2/token',
            authorizationUrl: 'https://developer.lametric.com/api/v2/oauth2/authorize',
            scopes: ['basic', 'devices_read', 'devices_write'],
        });

        await this._initFlows();
    }

    async _initFlows() {
        this.homey.flow.getActionCard('show_widget')
            .registerRunListener((args, state) => args.device.getClient().showWidget(args.widget))
            .registerArgumentAutocompleteListener('widget', async (query, args) => {
                let results = await args.device.getClient().getWidgets();
                return results.filter(result => result.name.toLowerCase().includes(query.toLowerCase()));
            });

        this.homey.flow.getActionCard('notificationText')
            .registerRunListener((args, state) => args.device.getClient().sendNotification(args));

        this.homey.flow.getActionCard('notificationTextIcon')
            .registerRunListener((args, state) => args.device.getClient().sendNotification(args))
            .registerArgumentAutocompleteListener('icon', async (query, args) => args.device.getIcons().filter(result => result.name.toLowerCase().includes(query.toLowerCase())));

        this.homey.flow.getActionCard('notificationTextSound')
            .registerRunListener((args, state) => args.device.getClient().sendNotification(args))
            .registerArgumentAutocompleteListener('sound', async (query, args) => SOUNDS.filter(result => result.name.toLowerCase().includes(query.toLowerCase())));

        this.homey.flow.getActionCard('notificationTextIconSound')
            .registerRunListener((args, state) => args.device.getClient().sendNotification(args))
            .registerArgumentAutocompleteListener('icon', async (query, args) => args.device.getIcons().filter(result => result.name.toLowerCase().includes(query.toLowerCase())))
            .registerArgumentAutocompleteListener('sound', async (query, args) => SOUNDS.filter(result => result.name.toLowerCase().includes(query.toLowerCase())));

        this.homey.flow.getActionCard('clear_notification_queue').registerRunListener((args, state) => args.device.getClient().clearNotifications());
        this.homey.flow.getActionCard('next_widget').registerRunListener((args, state) => args.device.getClient().next());
        this.homey.flow.getActionCard('prev_widget').registerRunListener((args, state) => args.device.getClient().prev());
        this.homey.flow.getActionCard('set_brightness').registerRunListener((args, state) => args.device.getClient().updateDisplayState(args.brightness, 'manual'));
        this.homey.flow.getActionCard('set_brightness_auto').registerRunListener((args, state) => args.device.getClient().updateDisplayState(100, 'auto'));
    }
}
