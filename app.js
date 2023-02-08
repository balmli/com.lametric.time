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

        this.homey.flow.getActionCard('alarm_set').registerRunListener((args, state) => args.device.getClient().alarmSet(args.time, args.radio === 'true'));
        this.homey.flow.getActionCard('alarm_enable').registerRunListener((args, state) => args.device.getClient().alarmEnable(args.enabled === 'true'));
        this.homey.flow.getActionCard('clock_face').registerRunListener((args, state) => args.device.getClient().clockFace(args.type));
        this.homey.flow.getActionCard('clock_face_custom').registerRunListener((args, state) => args.device.getClient().clockFaceCustom(args.icon));
        this.homey.flow.getActionCard('radio').registerRunListener((args, state) => args.device.getClient().radio(args.action));
        this.homey.flow.getActionCard('stopwatch').registerRunListener((args, state) => args.device.getClient().stopwatch(args.action));
        this.homey.flow.getActionCard('timer_set').registerRunListener((args, state) => args.device.getClient().timerSet(args.dura, args.start === 'true'));
        this.homey.flow.getActionCard('timer').registerRunListener((args, state) => args.device.getClient().timer(args.action));
        this.homey.flow.getActionCard('weather').registerRunListener((args, state) => args.device.getClient().weather(args.action));

        this.homey.flow.getActionCard('notificationText')
            .registerRunListener((args, state) => args.device.getClient().sendNotification(args));

        this.homey.flow.getActionCard('notificationTextIcon')
            .registerRunListener((args, state) => args.device.getClient().sendNotification(args))
            .registerArgumentAutocompleteListener('icon', async (query, args) => args.device.getIcons().filter(result => result.name.toLowerCase().includes(query.toLowerCase())));

        this.homey.flow.getActionCard('notificationTextIconCode')
            .registerRunListener((args, state) => args.device.getClient().sendNotification(args));

        this.homey.flow.getActionCard('notificationTextSound')
            .registerRunListener((args, state) => args.device.getClient().sendNotification(args))
            .registerArgumentAutocompleteListener('sound', async (query, args) => SOUNDS.filter(result => result.name.toLowerCase().includes(query.toLowerCase())));

        this.homey.flow.getActionCard('notificationTextIconSound')
            .registerRunListener((args, state) => args.device.getClient().sendNotification(args))
            .registerArgumentAutocompleteListener('icon', async (query, args) => args.device.getIcons().filter(result => result.name.toLowerCase().includes(query.toLowerCase())))
            .registerArgumentAutocompleteListener('sound', async (query, args) => SOUNDS.filter(result => result.name.toLowerCase().includes(query.toLowerCase())));

        this.homey.flow.getActionCard('notificationTextIconCodeSound')
            .registerRunListener((args, state) => args.device.getClient().sendNotification(args))
            .registerArgumentAutocompleteListener('sound', async (query, args) => SOUNDS.filter(result => result.name.toLowerCase().includes(query.toLowerCase())));

        this.homey.flow.getActionCard('clear_notification_queue').registerRunListener((args, state) => args.device.getClient().clearNotifications());
        this.homey.flow.getActionCard('next_widget').registerRunListener((args, state) => args.device.getClient().next());
        this.homey.flow.getActionCard('prev_widget').registerRunListener((args, state) => args.device.getClient().prev());
        this.homey.flow.getActionCard('set_brightness').registerRunListener((args, state) => args.device.getClient().updateDisplayState(args.brightness, 'manual'));
        this.homey.flow.getActionCard('set_brightness_auto').registerRunListener((args, state) => args.device.getClient().updateDisplayState(undefined, 'auto'));
        this.homey.flow.getActionCard('change_device_mode').registerRunListener((args, state) => args.device.getClient().changeDeviceMode(args.mode));
    }
}
