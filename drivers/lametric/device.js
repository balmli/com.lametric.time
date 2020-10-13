'use strict';

const { OAuth2Device } = require('homey-oauth2app');
const LametricClient = require('../../lib/LametricClient');

module.exports = class LametricDevice extends OAuth2Device {

    async onOAuth2Init() {
        await this._migrate();
        this.registerCapabilityListener('volume_set', value => this.onSetVolume(value));
        await this._cacheIcons();
        this.addFetchTimeout(1);
    }

    async _migrate() {
        try {
            if (!this.hasCapability('volume_set')) {
                await this.addCapability('volume_set');
            }
        } catch (err) {
            this.log('Migration error', err);
        }
    }

    async onDiscoveryResult(discoveryResult) {
        const drDeviceId = await this.getClient().getDeviceId(discoveryResult);
        return drDeviceId === this.getData().id;
    }

    async onDiscoveryAvailable(discoveryResult) {
        this.log('onDiscoveryAvailable', discoveryResult);
        await this.updateDiscovery(discoveryResult);
    }

    async onDiscoveryAddressChanged(discoveryResult) {
        this.log('onDiscoveryAddressChanged', discoveryResult);
        await this.updateDiscovery(discoveryResult);
    }

    async updateDiscovery(discoveryResult) {
        if (this.getSetting('ip_address') !== discoveryResult.address) {
            await this.setSettings({ ip_address: discoveryResult.address }).catch(err => this.log('updateDiscovery failed', err));
            delete this.lametricClient;
        }
    }

    async _cacheIcons() {
        try {
            let results = await this.oAuth2Client.getIcons();
            this._icons = results.data.map(icon => ({
                image: icon.thumb.small,
                name: icon.title + ' (' + icon.id + ')',
                code: icon.code
            }));
        } catch (err) {
            this._icons = [];
            this.log('_cacheIcons error', err);
        }
    }

    getIcons() {
        return this._icons;
    }

    async onOAuth2Deleted() {
        this._deleted = true;
        this.clearFetchTimeout();
    }

    async onSettings(event) {
        if (event.changedKeys.includes('ip_address') ||
            event.changedKeys.includes('lifetime')) {
            delete this.lametricClient;
        }
    }

    getClient() {
        if (!this.lametricClient) {
            this.lametricClient = new LametricClient({
                ip: this.getSetting('ip_address'),
                api_key: this.getStoreValue('api_key'),
                lifetime: this.getSetting('lifetime'),
                log: this.log,
                i18n: this.homey.i18n
            });
        }
        return this.lametricClient;
    }

    async addFetchTimeout(seconds) {
        if (this._deleted) {
            return;
        }
        this.clearFetchTimeout();
        let interval = seconds;
        if (!interval) {
            interval = this.getSetting('poll_interval') || 30;
        }
        this.fetchTimeout = this.homey.setTimeout(() => this.fetchState(), 1000 * interval);
    }

    clearFetchTimeout() {
        if (this.fetchTimeout) {
            this.homey.clearTimeout(this.fetchTimeout);
            this.fetchTimeout = undefined;
        }
    }

    async fetchState() {
        if (this._deleted) {
            return;
        }
        try {
            this.clearFetchTimeout();
            const volumeState = await this.getClient().getAudioState();
            this._volumeState = volumeState;
            const range = volumeState.volume_range.max - volumeState.volume_range.min;
            const volume = volumeState.volume / range;
            this.setCapabilityValue('volume_set', volume).catch(err => this.log('setting volume_set failed', err));
        } catch (err) {
            this.log('fetchState error', err);
        } finally {
            this.addFetchTimeout();
        }
    }

    async onSetVolume(value) {
        try {
            this.clearFetchTimeout();
            if (this._volumeState) {
                const range = this._volumeState.volume_range.max - this._volumeState.volume_range.min;
                const volume = Math.max(Math.min(value * range, this._volumeState.volume_limit.max), this._volumeState.volume_limit.min);
                this.getClient().updateAudioState({ volume });
            }
        } finally {
            this.addFetchTimeout();
        }
    }

};