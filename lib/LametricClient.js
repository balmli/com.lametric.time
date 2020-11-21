'use strict';

const http = require('http.min');

module.exports = class LametricClient {

    constructor(options) {
        options = options || {};
        this.ip = options.ip;
        this.lifetime = options.lifetime;
        this.token = Buffer.from('dev:' + options.api_key).toString('base64');
        this.log = options.log || console.log;
        this.i18n = options.i18n;
    }

    getHeaders() {
        return {
            'Authorization': `Basic ${this.token}`
        };
    }

    getUrl(path) {
        return `http://${this.ip}:8080${path}`;
    }

    get(path) {
        return http.get({
            uri: this.getUrl(path),
            json: true,
            headers: this.getHeaders()
        });
    }

    put(path, data) {
        return http.put({
            uri: this.getUrl(path),
            headers: this.getHeaders()
        }, data);
    }

    post(path, data) {
        return http.post({
            uri: this.getUrl(path),
            headers: this.getHeaders()
        }, data);
    }

    delete(path, data) {
        return http.delete({
            uri: this.getUrl(path),
            headers: this.getHeaders()
        });
    }

    async getDeviceId(discoveryResult) {
        try {
            const result = await http.get({
                uri: discoveryResult.headers.location
            });
            const data = result.data;
            const pos1 = data.indexOf('<deviceId>');
            const pos2 = data.indexOf('</deviceId>');
            return parseInt(data.substr(pos1 + 10, pos2 - pos1 - 10));
        } catch (err) {
            this.log('getDeviceId error', err);
        }
    }

    // --- Endpoints

    async apiVersion() {
        const result = await this.get('/api/v2');
        const data = result.data;
        this.log('Api version', data, JSON.stringify(data));
    }

    // --- Device

    async deviceState() {
        const result = await this.get('/api/v2/device');
        const data = result.data;
        this.log('Device state', data);
    }

    // --- Apps

    getApps() {
        return this.get('/api/v2/device/apps');
    }

    getApp(appId) {
        return this.get(`/api/v2/device/apps/${appId}`);
    }

    async getWidgets() {
        const result = await this.getApps();
        const data = result.data;
        const widgets = [];
        for (let appId of Object.keys(data)) {
            const app = data[appId];
            for (let widgetId of Object.keys(app.widgets)) {
                widgets.push({
                    id: widgetId,
                    appId: appId,
                    name: app.title
                });
            }
        }
        return widgets;
    }

    async next() {
        const result = await this.put(`/api/v2/device/apps/next`);
        if (result.response.statusCode !== 200) {
            const message = result.data.errors && result.data.errors.length > 0 ? result.data.errors[0].message : result.response.statusMessage;
            const statusCode = result.response.statusCode;
            throw new Error(this.i18n.__('errors.next_app', { message, statusCode }));
        }
        this.log('Next app', result.data);
    }

    async prev() {
        const result = await this.put(`/api/v2/device/apps/prev`);
        if (result.response.statusCode !== 200) {
            const message = result.data.errors && result.data.errors.length > 0 ? result.data.errors[0].message : result.response.statusMessage;
            const statusCode = result.response.statusCode;
            throw new Error(this.i18n.__('errors.prev_app', { message, statusCode }));
        }
        this.log('Previous app', result.data);
    }

    async showWidget(widget) {
        const result = await this.put(`/api/v2/device/apps/${widget.appId}/widgets/${widget.id}/activate`);
        if (result.response.statusCode !== 200) {
            const widgetName = widget.name;
            const statusCode = result.response.statusCode;
            const statusMessage = result.response.statusMessage;
            throw new Error(this.i18n.__('errors.show_widget', { widgetName, statusCode, statusMessage }));
        }
        const data = result.data;
        this.log('Show widget', data);
    }

    alarmSet(time, wake_with_radio) {
        return this.appAction({ appId: 'com.lametric.clock', id: 'clock.alarm' }, {
            enabled: true,
            time: `${time}`,
            wake_with_radio: wake_with_radio
        });
    }

    alarmEnable(enabled) {
        return this.appAction({ appId: 'com.lametric.clock', id: 'clock.alarm' }, {
            enabled: enabled
        });
    }

    clockFace(type) {
        if (!type || !(type === 'weather' || type === 'page_a_day' || type === 'none')) {
            throw new Error(this.i18n.__('errors.invalid_clock_face_type'));
        }
        return this.appAction({ appId: 'com.lametric.clock', id: 'clock.clockface' }, {
            type: type
        });
    }

    clockFaceCustom(icon) {
        if (!icon || !(icon.startsWith('data:image/png;base64,') || icon.startsWith('data:image/gif;base64,'))) {
            throw new Error(this.i18n.__('errors.invalid_clock_face_icon'));
        }
        return this.appAction({ appId: 'com.lametric.clock', id: 'clock.clockface' }, {
            icon: icon,
            type: 'custom'
        });
    }

    radio(action) {
        return this.appAction({ appId: 'com.lametric.radio', id: action });
    }

    stopwatch(action) {
        return this.appAction({ appId: 'com.lametric.stopwatch', id: action });
    }

    timerSet(duration, start_now) {
        return this.appAction({ appId: 'com.lametric.countdown', id: 'countdown.configure' }, {
            duration: duration,
            start_now: start_now
        });
    }

    timer(action) {
        return this.appAction({ appId: 'com.lametric.countdown', id: action });
    }

    weather(action) {
        return this.appAction({ appId: 'com.lametric.weather', id: action });
    }

    async appAction(action, params) {
        const body = {
            id: action.id,
            params: params ? params : {},
            activate: true
        };
        const widgets = await this.getWidgets();
        const widget = widgets.find(widget => widget.appId === action.appId);
        if (!widget) {
            throw new Error(this.i18n.__('errors.no_such_widget', { appId: action.appId }));
        }
        const result = await this.post(`/api/v2/device/apps/${action.appId}/widgets/${widget.id}/actions`, body);
        if (result.response.statusCode !== 201) {
            const statusCode = result.response.statusCode;
            const statusMessage = result.response.statusMessage;
            throw new Error(this.i18n.__('errors.app_action', { statusCode, statusMessage }));
        }
        const data = result.data;
        this.log('App action', action, body, data);
    }

    // --- Notifications

    async sendNotification(args) {
        this.log('sendNotification', args.priority, args.icontype, args.text);
        const body = this._getNotificationBody(args);
        const result = await this.post(`/api/v2/device/notifications`, body);
        if (result.response.statusCode !== 201) {
            const statusCode = result.response.statusCode;
            const statusMessage = result.response.statusMessage;
            throw new Error(this.i18n.__('errors.send_notification', { statusCode, statusMessage }));
        }
        const data = result.data;
        this.log('Send notification', data);
    }

    _getNotificationBody(args) {
        return {
            priority: args.priority ? args.priority : 'info',
            icon_type: args.icontype ? args.icontype : 'none',
            lifetime: this.lifetime * 1000,
            model: {
                frames: [
                    {
                        icon: args.icon ? args.icon.code : undefined,
                        text: args.text
                    }
                ],
                sound: args.sound ? {
                    category: args.sound.id.startsWith('alarm') ? 'alarms' : 'notifications',
                    id: args.sound.id,
                    repeat: args.repeat ? args.repeat : 1
                } : undefined,
                cycles: 3
            }
        };
    }

    getNotificationQueue() {
        return this.get('/api/v2/device/notifications');
    }

    async clearNotifications() {
        const response = await this.getNotificationQueue();
        const notifications = response.data;
        for (let notif of notifications) {
            const result = await this.delete(`/api/v2/device/notifications/${notif.id}`);
            if (result.response.statusCode !== 200) {
                const statusCode = result.response.statusCode;
                const statusMessage = result.response.statusMessage;
                throw new Error(this.i18n.__('errors.clear_notification_queue', { statusCode, statusMessage }));
            }
        }
        this.log(`Cleared ${notifications.length} notifications`);
    }

    // --- Display

    getDisplayState() {
        return this.get('/api/v2/device/display');
    }

    async updateDisplayState(brightness, brightness_mode = 'auto') {
        if (brightness !== undefined) {
            const resultDs = await this.getDisplayState();
            const ds = resultDs.data;
            brightness = Math.max(Math.min(brightness, ds.brightness_limit.max), ds.brightness_limit.min);
        }
        const result = await this.put(`/api/v2/device/display`, { brightness, brightness_mode });
        if (result.response.statusCode !== 200) {
            const statusCode = result.response.statusCode;
            const statusMessage = result.response.statusMessage;
            throw new Error(this.i18n.__('errors.update_display_state', { statusCode, statusMessage }));
        }
        const data = result.data;
        this.log('Updated display state', data);
    }

    // --- Audio

    async getAudioState() {
        const result = await this.get('/api/v2/device/audio');
        if (result.response.statusCode !== 200) {
            const statusCode = result.response.statusCode;
            const statusMessage = result.response.statusMessage;
            throw new Error(this.i18n.__('errors.get_volume_state', { statusCode, statusMessage }));
        }
        const data = result.data;
        this.log('Audio state', data);
        return data;
    }

    async updateAudioState({ volume }) {
        const result = await this.put('/api/v2/device/audio', { volume });
        if (result.response.statusCode !== 200) {
            const statusCode = result.response.statusCode;
            const statusMessage = result.response.statusMessage;
            throw new Error(this.i18n.__('errors.update_volume_state', { statusCode, statusMessage }));
        }
        this.log('Updated audio state', volume, result.data);
    }

}