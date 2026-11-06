/** Read-only Liquid Controls LCP frames. No delivery commands are built here. */

const ESC = 0x1b;
const TILDE = 0x7e;
export const LCP_HOST_NODE = 255;
export const FIELD_DECIMALS = 39;
export const FIELD_GROSS = 44;
export const FIELD_NET = 45;

export interface LcpFrame {
  to: number;
  from: number;
  status: number;
  data: Uint8Array;
}

export function updateCrc(crc: number, byte: number): number {
  crc &= 0xffff;
  for (let bit = 7; bit >= 0; bit--) {
    const overflow = (crc & 0x8000) !== 0;
    crc = ((crc << 1) & 0xffff) | ((byte >> bit) & 1);
    if (overflow) crc ^= 0x1021;
  }
  return crc & 0xffff;
}

function appendByte(out: number[], byte: number, crc: number, includeInCrc: boolean): number {
  if (byte === ESC || byte === TILDE) {
    out.push(ESC);
    if (includeInCrc) crc = updateCrc(crc, ESC);
  }
  out.push(byte & 0xff);
  if (includeInCrc) crc = updateCrc(crc, byte & 0xff);
  return crc & 0xffff;
}

export function buildFrame(to: number, status: number, data: number[], host = LCP_HOST_NODE): Uint8Array {
  const out: number[] = [TILDE, TILDE];
  let crc = 0x7e7e;
  const head = [to & 0xff, host & 0xff, status & 0xff, data.length & 0xff];
  for (const byte of head) crc = appendByte(out, byte, crc, true);
  for (const byte of data) crc = appendByte(out, byte & 0xff, crc, true);
  appendByte(out, crc & 0xff, 0, false);
  appendByte(out, (crc >> 8) & 0xff, 0, false);
  return Uint8Array.from(out);
}

export class LcpSession {
  private idBit = 0;
  private synced = false;
  private readonly meterNode: number;

  constructor(meterNode: number) {
    this.meterNode = meterNode;
  }

  /** A new request. The same bytes must be resent when retrying; this toggles the message id. */
  command(data: number[]): { bytes: Uint8Array; idBit: number } {
    const idBit = this.idBit & 1;
    const status = (this.synced ? 0 : 0x02) | idBit;
    this.synced = true;
    this.idBit ^= 1;
    return { bytes: buildFrame(this.meterNode, status, data), idBit };
  }
}

export function pullFrames(buffer: Uint8Array): { frames: LcpFrame[]; rest: Uint8Array } {
  const frames: LcpFrame[] = [];
  let index = 0;
  while (index + 1 < buffer.length) {
    if (buffer[index] !== TILDE || buffer[index + 1] !== TILDE) {
      index++;
      continue;
    }
    const parsed = parseAt(buffer, index);
    if (parsed === 'need-more') break;
    if (parsed === 'bad') {
      index += 2;
      continue;
    }
    frames.push(parsed.frame);
    index = parsed.next;
  }
  const rest = buffer.slice(index);
  return { frames, rest: rest.length > 8192 ? rest.slice(-2) : rest };
}

function parseAt(buffer: Uint8Array, header: number): 'need-more' | 'bad' | { frame: LcpFrame; next: number } {
  let pos = header + 2;
  let crc = 0x7e7e;
  const logical: number[] = [];
  let dataLen = -1;

  while (dataLen < 0 || logical.length < 4 + dataLen) {
    if (pos >= buffer.length) return 'need-more';
    let byte = buffer[pos++];
    crc = updateCrc(crc, byte);
    if (byte === ESC) {
      if (pos >= buffer.length) return 'need-more';
      byte = buffer[pos++];
      crc = updateCrc(crc, byte);
    }
    logical.push(byte);
    if (logical.length === 4) dataLen = logical[3];
  }

  const crcBytes: number[] = [];
  while (crcBytes.length < 2) {
    if (pos >= buffer.length) return 'need-more';
    let byte = buffer[pos++];
    if (byte === ESC) {
      if (pos >= buffer.length) return 'need-more';
      byte = buffer[pos++];
    }
    crcBytes.push(byte);
  }

  const received = ((crcBytes[1] << 8) | crcBytes[0]) & 0xffff;
  if (received !== (crc & 0xffff)) return 'bad';
  return {
    frame: {
      to: logical[0],
      from: logical[1],
      status: logical[2],
      data: Uint8Array.from(logical.slice(4, 4 + dataLen))
    },
    next: pos
  };
}

export function readInt32BE(bytes: Uint8Array): number {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return view.getInt32(0, false);
}

export function readUint16BE(hi: number, lo: number): number {
  return ((hi << 8) | lo) & 0xffff;
}

export function asciiField(bytes: Uint8Array): string {
  let text = '';
  for (const byte of bytes) {
    if (byte === 0) break;
    text += String.fromCharCode(byte);
  }
  return text.trim();
}

export function deliveryLabel(code: number): { deliveryStatus: 'idle' | 'active' | 'completed'; detail: string } {
  if (code & 0x0004) return { deliveryStatus: 'active', detail: 'Fuel is flowing' };
  if (code & 0x0008) return { deliveryStatus: 'active', detail: 'Delivery is active on the register' };
  if (code & 0x0400) return { deliveryStatus: 'active', detail: 'Delivery is starting' };
  if (code & 0x0001) return { deliveryStatus: 'completed', detail: 'Delivery ticket is pending on the register' };
  if (code & 0x0800) return { deliveryStatus: 'idle', detail: 'A delivery is queued on the register' };
  return { deliveryStatus: 'idle', detail: 'No delivery in progress' };
}
