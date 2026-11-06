import { Injectable, NgZone, inject, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { BluetoothSerial } from '@e-is/capacitor-bluetooth-serial';
import {
  FIELD_DECIMALS,
  FIELD_GROSS,
  FIELD_NET,
  LCP_HOST_NODE,
  LcpSession,
  asciiField,
  deliveryLabel,
  pullFrames,
  readInt32BE,
  readUint16BE,
} from './lcr';
import { DriverStateService } from './driver-state.service';
import { ToastService } from './toast.service';

export interface NearbyMeter {
  name: string;
  address: string;
}

export interface LiveRegister {
  productName: string;
  decimals: number;
  gross: number | null;
  net: number | null;
  deliveryStatus: 'idle' | 'active' | 'completed';
  detail: string;
}

@Injectable({ providedIn: 'root' })
export class BluetoothMeterService {
  private readonly zone = inject(NgZone);
  private readonly state = inject(DriverStateService);
  private readonly toast = inject(ToastService);

  readonly android = Capacitor.getPlatform() === 'android';
  readonly scanning = signal(false);
  readonly connecting = signal(false);
  readonly connectingAddress = signal('');
  readonly connected = signal(false);
  readonly devices = signal<NearbyMeter[]>([]);
  readonly deviceName = signal('');
  readonly deviceAddress = signal('');
  readonly productName = signal('');
  readonly decimals = signal(1);
  readonly gross = signal<number | null>(null);
  readonly net = signal<number | null>(null);
  readonly deliveryStatus = signal<LiveRegister['deliveryStatus']>('idle');
  readonly detail = signal('Connect the register to start reading.');

  private address = '';
  private meterNode = 250;
  private session: LcpSession | null = null;
  private rx = new Uint8Array(0);
  private timer?: ReturnType<typeof setInterval>;
  private polling = false;

  async scan(): Promise<NearbyMeter[]> {
    this.assertAndroid();
    this.zone.run(() => this.scanning.set(true));
    try {
      const result = await BluetoothSerial.scan();
      const devices = (result.devices ?? [])
        .map(device => ({
          name: (device.name || '').trim() || 'Unnamed device',
          address: device.address || device.id,
        }))
        .filter(device => !!device.address);
      const unique = [...new Map(devices.map(device => [device.address, device])).values()]
        .sort((a, b) => this.rank(b.name) - this.rank(a.name) || a.name.localeCompare(b.name));
      this.zone.run(() => this.devices.set(unique));
      return unique;
    } finally {
      this.zone.run(() => this.scanning.set(false));
    }
  }

  async connect(device: NearbyMeter, node: number): Promise<void> {
    this.assertAndroid();
    if (!device.address) throw new Error('Choose a meter first.');
    if (this.connected() && this.deviceAddress() === device.address) return;
    this.zone.run(() => {
      this.connecting.set(true);
      this.connectingAddress.set(device.address);
    });
    try {
      if (this.address && this.address !== device.address) await this.disconnect();
      await BluetoothSerial.connect({ address: device.address });
      this.address = device.address;
      const status = await BluetoothSerial.isConnected({ address: device.address });
      if (!status.connected) throw new Error('The phone could not open a Bluetooth serial link to that device.');
      const identity = await this.startSession(node);
      this.zone.run(() => {
        this.connected.set(true);
        this.deviceName.set(device.name);
        this.deviceAddress.set(device.address);
        this.productName.set(identity.productName);
        this.decimals.set(identity.decimals);
        this.gross.set(null);
        this.net.set(null);
        this.deliveryStatus.set('idle');
        this.detail.set('Requesting the register…');
        this.state.connectMeter();
      });
      this.startPolling();
    } catch (error) {
      await this.disconnect();
      throw error;
    } finally {
      this.zone.run(() => {
        this.connecting.set(false);
        this.connectingAddress.set('');
      });
    }
  }

  async disconnect(): Promise<void> {
    this.stopPolling();
    const address = this.address;
    this.address = '';
    this.session = null;
    this.rx = new Uint8Array(0);
    this.zone.run(() => {
      this.connected.set(false);
      this.deviceName.set('');
      this.deviceAddress.set('');
      this.productName.set('');
      this.gross.set(null);
      this.net.set(null);
      this.deliveryStatus.set('idle');
      this.detail.set('Connect the register to start reading.');
      this.state.disconnectMeter();
    });
    if (!address || !this.android) return;
    try {
      await BluetoothSerial.disconnect({ address });
    } catch {
      /* already closed */
    }
  }

  formatGallons(value: number | null): string {
    if (value === null || Number.isNaN(value)) return '—';
    const places = Math.min(4, Math.max(0, this.decimals()));
    return value.toFixed(places);
  }

  private async startSession(node: number): Promise<{ productName: string; decimals: number }> {
    if (!Number.isInteger(node) || node < 1 || node > 250) throw new Error('Register number must be from 1 to 250.');
    this.meterNode = node;
    this.session = new LcpSession(node);
    this.rx = new Uint8Array(0);
    this.decimals.set(1);
    await sleep(250);
    await this.discard();
    const identity = await this.request([0x00]);
    if (!identity.length || identity[0] !== 0) throw new Error('The register did not accept that number. Leave it at 250 unless you were given a different one.');
    const productName = asciiField(identity.slice(2)) || 'LCR register';
    let decimals = 1;
    try {
      const places = await this.request([0x20, FIELD_DECIMALS]);
      const value = places.length >= 3 && places[0] === 0 ? places[2] : 1;
      decimals = value >= 0 && value <= 4 ? value : 1;
    } catch {
      decimals = 1;
    }
    this.decimals.set(decimals);
    return { productName, decimals };
  }

  private async readRegister(): Promise<LiveRegister> {
    const status = await this.request([0x28]);
    if (status.length < 6 || status[0] !== 0) throw new Error('The register did not return a reading.');
    const code = readUint16BE(status[4], status[5]);
    const state = deliveryLabel(code);
    const gross = await this.readVolume(FIELD_GROSS);
    let net: number | null = null;
    try {
      net = await this.readVolume(FIELD_NET);
    } catch {
      net = null;
    }
    return {
      productName: this.productName(),
      decimals: this.decimals(),
      gross,
      net,
      deliveryStatus: state.deliveryStatus,
      detail: state.detail,
    };
  }

  private startPolling(): void {
    this.stopPolling();
    void this.poll();
    this.timer = setInterval(() => void this.poll(), 1200);
  }

  private stopPolling(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
  }

  private async poll(): Promise<void> {
    if (this.polling || !this.connected()) return;
    this.polling = true;
    try {
      const live = await this.readRegister();
      this.zone.run(() => {
        this.gross.set(live.gross);
        this.net.set(live.net);
        this.decimals.set(live.decimals);
        this.deliveryStatus.set(live.deliveryStatus);
        this.detail.set(live.detail);
      });
    } catch (error) {
      const text = meterError(error);
      this.zone.run(() => this.detail.set(text));
      if (/not connected|disconnected/i.test(text)) {
        this.stopPolling();
        this.address = '';
        this.session = null;
        this.rx = new Uint8Array(0);
        this.zone.run(() => {
          this.connected.set(false);
          this.state.disconnectMeter();
        });
        void this.toast.error('The meter closed the Bluetooth link.');
      }
    } finally {
      this.polling = false;
    }
  }

  private async readVolume(field: number): Promise<number> {
    const data = await this.request([0x20, field]);
    if (data.length < 6 || data[0] !== 0) throw new Error('The register did not return the gallons.');
    const raw = readInt32BE(data.slice(2, 6));
    return raw / Math.pow(10, this.decimals());
  }

  private async request(data: number[]): Promise<Uint8Array> {
    if (!this.session) throw new Error('Meter session is not open.');
    const command = this.session.command(data);
    try {
      return await this.roundTrip(command.bytes, command.idBit);
    } catch (first) {
      try {
        return await this.roundTrip(command.bytes, command.idBit);
      } catch {
        throw first;
      }
    }
  }

  private async roundTrip(frame: Uint8Array, idBit: number): Promise<Uint8Array> {
    const options = { address: this.address, value: toBase64(frame), encoding: 'base64' };
    await BluetoothSerial.write(options);
    const deadline = Date.now() + 1200;
    while (Date.now() < deadline) {
      const chunk = await this.readBytes();
      if (chunk.length) this.rx = Uint8Array.from(concat(this.rx, chunk));
      const pulled = pullFrames(this.rx);
      this.rx = Uint8Array.from(pulled.rest);
      const hit = pulled.frames.find(frameIn =>
        (frameIn.status & 0x80) !== 0 &&
        (frameIn.status & 0x01) === idBit &&
        frameIn.to === LCP_HOST_NODE &&
        frameIn.from === this.meterNode
      );
      if (hit) {
        if ((hit.status & 0x04) !== 0) throw new Error('The register is busy. Try the reading again.');
        return hit.data;
      }
      await sleep(50);
    }
    throw new Error('The register did not answer. Choose the register in the list and try again.');
  }

  private async discard(): Promise<void> {
    const chunk = await this.readBytes();
    if (chunk.length) this.rx = new Uint8Array(0);
  }

  private async readBytes(): Promise<Uint8Array> {
    const result = await BluetoothSerial.read({ address: this.address });
    return fromBase64(result.value ?? '');
  }

  private assertAndroid(): void {
    if (!this.android) {
      throw new Error('Bluetooth to the meter works on the Android app. This browser preview cannot reach the register.');
    }
  }

  private rank(name: string): number {
    const label = name.toLowerCase();
    if (label.includes('lcr') || label.includes('iq') || label.includes('liquid')) return 2;
    if (label.includes('meter')) return 1;
    return 0;
  }
}

export function meterError(error: unknown): string {
  const text = error instanceof Error
    ? error.message
    : error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
      ? error.message
      : String(error);
  if (/bluetooth is disabled/i.test(text)) return 'Turn Bluetooth on, then try again.';
  if (/permission denied/i.test(text)) return 'Allow Nearby devices for this app, then scan again.';
  return text;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function concat(left: Uint8Array, right: Uint8Array): Uint8Array {
  const out = new Uint8Array(left.length + right.length);
  out.set(left, 0);
  out.set(right, left.length);
  return out;
}

function toBase64(bytes: Uint8Array): string {
  let text = '';
  for (const byte of bytes) text += String.fromCharCode(byte);
  return btoa(text);
}

function fromBase64(value: string): Uint8Array {
  if (!value) return new Uint8Array();
  const text = atob(value);
  const out = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) out[i] = text.charCodeAt(i);
  return out;
}
