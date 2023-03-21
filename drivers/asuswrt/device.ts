import Homey from 'homey';
import { AsusWRTConnectedDevice } from 'node-asuswrt/lib/models/AsusWRTConnectedDevice';
import { AsusWRTLoad } from 'node-asuswrt/lib/models/AsusWRTLoad';
import { AsusWRTOperationMode } from 'node-asuswrt/lib/models/AsusWRTOperationMode';
import { AsusWRTTrafficData } from 'node-asuswrt/lib/models/AsusWRTTrafficData';
import { AsusWRTWANStatus } from 'node-asuswrt/lib/models/AsusWRTWANStatus';
import { AccessPointCapabilities, RouterCapabilities } from './capabilities';
import { getConnectedDisconnectedToken, getMissingConnectedDevices, getNewConnectedDevices, wait } from './utils';

export class AsusWRTDevice extends Homey.Device {

  private triggerNewFirmwareAvailable!: (tokens: any) => void;
  private triggerExternalIPChanged!: (device: any, tokens: any, state: any) => void;
  private triggerWanTypeChanged!: (device: any, tokens: any, state: any) => void;

  private triggerDeviceConnected!: (tokens: any) => void;
  private trigger24GDeviceConnected!: (tokens: any) => void;
  private trigger5GDeviceConnected!: (tokens: any) => void;
  private triggerWiredDeviceConnected!: (tokens: any) => void;

  private triggerDeviceDisconnected!: (tokens: any) => void;
  private trigger24GDeviceDisconnected!: (tokens: any) => void;
  private trigger5GDeviceDisconnected!: (tokens: any) => void;
  private triggerWiredDeviceDisconnected!: (tokens: any) => void;

  private firmwareVersion: string = '';
  private newVersion: string = '';

  private wiredClients: AsusWRTConnectedDevice[] = [];
  private wireless24GClients: AsusWRTConnectedDevice[] = [];
  private wireless5GClients: AsusWRTConnectedDevice[] = [];

  public getWiredClients(): AsusWRTConnectedDevice[] {
    return this.wiredClients;
  }
  public getWireless24GClients(): AsusWRTConnectedDevice[] {
    return this.wireless24GClients;
  }
  public getWireless5GClients(): AsusWRTConnectedDevice[] {
    return this.wireless5GClients;
  }

  public async setConnectedClients(wiredClients: AsusWRTConnectedDevice[], wireless24GClients: AsusWRTConnectedDevice[], wireless5GClients: AsusWRTConnectedDevice[]) {
    const oldWiredClients = this.wiredClients;
    const oldWireless24GClients = this.wireless24GClients;
    const oldWireless5GClients = this.wireless5GClients;

    this.wiredClients = wiredClients;
    this.wireless24GClients = wireless24GClients;
    this.wireless5GClients = wireless5GClients;

    // trigger any device
    getMissingConnectedDevices(oldWiredClients.concat(oldWireless24GClients, oldWireless5GClients), wiredClients.concat(wireless24GClients, wireless5GClients)).forEach(missingDevice => this.triggerDeviceDisconnected(getConnectedDisconnectedToken(missingDevice)));
    getNewConnectedDevices(oldWiredClients.concat(oldWireless24GClients, oldWireless5GClients), wiredClients.concat(wireless24GClients, wireless5GClients)).forEach(newDevice => this.triggerDeviceConnected(getConnectedDisconnectedToken(newDevice)));

    // trigger wired device
    getMissingConnectedDevices(oldWiredClients, wiredClients).forEach(missingDevice => this.triggerWiredDeviceDisconnected(getConnectedDisconnectedToken(missingDevice)));
    getNewConnectedDevices(oldWiredClients, wiredClients).forEach(newDevice => this.triggerWiredDeviceConnected(getConnectedDisconnectedToken(newDevice)));
    
    // trigger 2.4ghz device
    getMissingConnectedDevices(oldWireless24GClients, wireless24GClients).forEach(missingDevice => this.trigger24GDeviceDisconnected(getConnectedDisconnectedToken(missingDevice)));
    getNewConnectedDevices(oldWireless24GClients, wireless24GClients).forEach(newDevice => this.trigger24GDeviceConnected(getConnectedDisconnectedToken(newDevice)));
    
    // trigger 5ghz device
    getMissingConnectedDevices(oldWireless5GClients, wireless5GClients).forEach(missingDevice => this.trigger5GDeviceDisconnected(getConnectedDisconnectedToken(missingDevice)));
    getNewConnectedDevices(oldWireless5GClients, wireless5GClients).forEach(newDevice => this.trigger5GDeviceConnected(getConnectedDisconnectedToken(newDevice)));
    
    if (this.hasCapability('meter_online_devices')) {
      await this.setCapabilityValue('meter_online_devices', this.wiredClients.length + this.wireless24GClients.length + this.wireless5GClients.length);
    }
  }

  public async setFirmwareVersion(currentVersion: string, newVersion: string) {
    if (this.firmwareVersion !== '' && newVersion !== '' && this.newVersion !== newVersion) {
      this.triggerNewFirmwareAvailable({"version": newVersion});
    }
    this.firmwareVersion = currentVersion;
    this.newVersion = newVersion;
  }

  public async setLoad(load: AsusWRTLoad) {
    if (this.hasCapability('meter_cpu_usage')) {
      await this.setCapabilityValue('meter_cpu_usage', load.CPUUsagePercentage);
    }
    if (this.hasCapability('meter_mem_used')) {
      await this.setCapabilityValue('meter_mem_used', load.MemoryUsagePercentage);
    }
  }

  public async setUptimeDaysBySeconds(uptimeSeconds: number) {
    if (this.hasCapability('uptime_days')) {
      await this.setCapabilityValue('uptime_days', uptimeSeconds * 0.0000115741);
    }
  }

  public async setWANStatus(WANStatus: AsusWRTWANStatus) {
    if (this.hasCapability('external_ip')) {
      if (this.getCapabilityValue('external_ip') !== WANStatus.ipaddr) {
        this.triggerExternalIPChanged(this, { external_ip: WANStatus.ipaddr }, {});
      }
      await this.setCapabilityValue('external_ip', WANStatus.ipaddr);
    }
    if (this.hasCapability('alarm_wan_disconnected')) {
      await this.setCapabilityValue('alarm_wan_disconnected', WANStatus.status && WANStatus.status !== 1 ? true : false);
    }
    if (this.hasCapability('wan_type')) {
      if (this.getCapabilityValue('wan_type') !== WANStatus.type) {
        this.triggerWanTypeChanged(this, { wan_type: WANStatus.type }, {});
      }
      await this.setCapabilityValue('wan_type', WANStatus.type);
    }
  }

  public async setTrafficValues(trafficDataFirst: AsusWRTTrafficData, trafficDataSecond: AsusWRTTrafficData) {
    if (this.hasCapability('traffic_total_received')) {
      await this.setCapabilityValue('traffic_total_received', trafficDataSecond.trafficReceived);
    }
    if (this.hasCapability('traffic_total_sent')) {
      await this.setCapabilityValue('traffic_total_sent', trafficDataSecond.trafficSent);
    }
    if (this.hasCapability('realtime_download')) {
      await this.setCapabilityValue('realtime_download', trafficDataSecond.trafficReceived - trafficDataFirst.trafficReceived);
    }
    if (this.hasCapability('realtime_upload')) {
      await this.setCapabilityValue('realtime_upload', trafficDataSecond.trafficSent - trafficDataFirst.trafficSent);
    }
  }

  private async setCapabilities(operationMode: AsusWRTOperationMode) {
    const capabilityList = operationMode === AsusWRTOperationMode.Router ? RouterCapabilities : AccessPointCapabilities;
    capabilityList.forEach(async cap => {
      if (!this.hasCapability(cap)) {
        await wait(5000);
        await this.addCapability(cap);
        if (!this.hasCapability(cap)) {
          await wait(10000);
          await this.addCapability(cap);
        }
      }
    });
  }

  private registerFlowListeners() {
    // triggers
    const newFirmware = this.homey.flow.getDeviceTriggerCard('new-firmware-available');
    this.triggerNewFirmwareAvailable = (tokens) => {
      newFirmware
        .trigger(this, tokens)
        .catch(this.error);
    };

    const externalIPChanged = this.homey.flow.getDeviceTriggerCard('external-ip-changed');
    this.triggerExternalIPChanged = (device, tokens, state) => {
      externalIPChanged
        .trigger(device, tokens, state)
        .catch(this.error);
    };

    const wanTypeChanged = this.homey.flow.getDeviceTriggerCard('wan-type-changed');
    this.triggerWanTypeChanged = (device, tokens, state) => {
      wanTypeChanged
        .trigger(device, tokens, state)
        .catch(this.error);
    };

    const deviceConnected = this.homey.flow.getDeviceTriggerCard('device-connected-to-access-point');
    this.triggerDeviceConnected = (tokens) => {
      deviceConnected
        .trigger(this, tokens)
        .catch(this.error);
    };
    const deviceDisconnected = this.homey.flow.getDeviceTriggerCard('device-disconnected-from-access-point');
    this.triggerDeviceDisconnected = (tokens) => {
      deviceDisconnected
        .trigger(this, tokens)
        .catch(this.error);
    };

    const device24GConnected = this.homey.flow.getDeviceTriggerCard('24g-device-connected-to-access-point');
    this.trigger24GDeviceConnected = (tokens) => {
      device24GConnected
        .trigger(this, tokens)
        .catch(this.error);
    };
    const device24GDisconnected = this.homey.flow.getDeviceTriggerCard('24g-device-disconnected-from-access-point');
    this.trigger24GDeviceDisconnected = (tokens) => {
      device24GDisconnected
        .trigger(this, tokens)
        .catch(this.error);
    };

    const device5GConnected = this.homey.flow.getDeviceTriggerCard('5g-device-connected-to-access-point');
    this.trigger5GDeviceConnected = (tokens) => {
      device5GConnected
        .trigger(this, tokens)
        .catch(this.error);
    };
    const device5GDisconnected = this.homey.flow.getDeviceTriggerCard('5g-device-disconnected-from-access-point');
    this.trigger5GDeviceDisconnected = (tokens) => {
      device5GDisconnected
        .trigger(this, tokens)
        .catch(this.error);
    };

    const deviceWiredConnected = this.homey.flow.getDeviceTriggerCard('wired-device-connected-to-access-point');
    this.triggerWiredDeviceConnected = (tokens) => {
      deviceWiredConnected
        .trigger(this, tokens)
        .catch(this.error);
    };
    const deviceWiredDisconnected = this.homey.flow.getDeviceTriggerCard('wired-device-disconnected-from-access-point');
    this.triggerWiredDeviceDisconnected = (tokens) => {
      deviceWiredDisconnected
        .trigger(this, tokens)
        .catch(this.error);
    };
  }

  /**
   * onInit is called when the device is initialized.
   */
  async onInit() {
    await this.setCapabilities(this.getStoreValue('operationMode'));
    this.registerFlowListeners();
    this.log('AsusWRTDevice has been initialized');
  }

  /**
   * onAdded is called when the user adds the device, called just after pairing.
   */
  async onAdded() {
    await this.setCapabilities(this.getStoreValue('operationMode'));
    this.log('AsusWRTDevice has been added');
  }

  /**
   * onSettings is called when the user updates the device's settings.
   * @param {object} event the onSettings event data
   * @param {object} event.oldSettings The old settings object
   * @param {object} event.newSettings The new settings object
   * @param {string[]} event.changedKeys An array of keys changed since the previous version
   * @returns {Promise<string|void>} return a custom message that will be displayed
   */
  async onSettings({ oldSettings: {}, newSettings: {}, changedKeys: [] }): Promise<string|void> {
    this.log('AsusWRTDevice settings where changed');
  }

  /**
   * onRenamed is called when the user updates the device's name.
   * This method can be used this to synchronise the name to the device.
   * @param {string} name The new name
   */
  async onRenamed(name: string) {
    this.log('AsusWRTDevice was renamed');
  }

  /**
   * onDeleted is called when the user deleted the device.
   */
  async onDeleted() {
    this.log('AsusWRTDevice has been deleted');
  }

}

module.exports = AsusWRTDevice;
