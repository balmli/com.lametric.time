'use strict';

const http = require('http.min');

module.exports = class LametricClient {

    constructor(options) {
        options = options || {};
        this.ip = options.ip;
        this.api_key = options.api_key;
        this.token = Buffer.from('dev:' + this.api_key).toString('base64');
        this.log = options.log || console.log;
        this.i18n = options.i18n;
    }

    getHeaders() {
        return {
            'Authorization': `Basic ${this.token}`
        };
    }

    get(path) {
        return http.get({
            uri: `http://${this.ip}:8080${path}`,
            json: true,
            headers: this.getHeaders()
        });
    }

    put(path, data) {
        return http.put({
            uri: `http://${this.ip}:8080${path}`,
            headers: this.getHeaders()
        }, data);
    }

    post(path, data) {
        return http.post({
            uri: `http://${this.ip}:8080${path}`,
            headers: this.getHeaders()
        }, data);
    }

    delete(path, data) {
        return http.delete({
            uri: `http://${this.ip}:8080${path}`,
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

    /*
        async getAppsArray() {
            const result = await this.getApps();
            const data = result.data;
            const apps = []
            Object.keys(data).forEach(appId => {
                const app = data[appId];
                app.id = appId;
                apps.push(app);
            });
            return apps;
        }
    */
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

    // --- Notifications

    async sendNotification(args) {
        this.log('sendNotification', args.priority, args.icontype, args.text);
        const result = await this.post(`/api/v2/device/notifications`, this._getNotificationBody(args));
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
            lifetime: 5000,
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

    async updateDisplayState(brightness = 100, brightness_mode = 'auto') {
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