import { AsusWRTConnectedDevice } from "node-asuswrt/lib/models/AsusWRTConnectedDevice";

export function getConnectedDisconnectedToken(device: AsusWRTConnectedDevice): {name: string, ip: string, mac: string, nickname: string, vendor: string, rssi: number} {
  return {
    name: device.name,
    ip: device.ip,
    mac: device.mac,
    nickname: device.nickName,
    vendor: device.vendor,
    rssi: device.rssi
  }
}

export function getMissingConnectedDevices(oldList: AsusWRTConnectedDevice[], newList: AsusWRTConnectedDevice[]): AsusWRTConnectedDevice[] {
    const missingEntities: AsusWRTConnectedDevice[] = [];
    oldList.forEach(device => {
      if (!newList.some((device2) => device2.mac === device.mac)) {
        missingEntities.push(device);
      }
    });
    return missingEntities;
  }

export function getNewConnectedDevices(oldList: AsusWRTConnectedDevice[], newList: AsusWRTConnectedDevice[]): AsusWRTConnectedDevice[] {
    const newEntities: AsusWRTConnectedDevice[] = [];
    newList.forEach(device => {
        if (!oldList.some((device2) => device2.mac === device.mac)) {
        newEntities.push(device);
        }
    });
    return newEntities;
}

export async function wait(milliseconds: number) {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
}