// Gera um payload PIX EMV estático (copia-e-cola) e URL de QR code via servidor público.

function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

const tag = (id: string, value: string) =>
  id + value.length.toString().padStart(2, "0") + value;

export interface PixInput {
  key: string;          // chave pix
  merchant: string;     // nome
  city: string;         // cidade
  amount?: number;      // valor opcional
  txid?: string;        // identificador (max 25)
}

export function buildPixPayload({ key, merchant, city, amount, txid = "AESTIQ" }: PixInput): string {
  const mai = tag("00", "BR.GOV.BCB.PIX") + tag("01", key);
  const fields = [
    tag("00", "01"),
    tag("26", mai),
    tag("52", "0000"),
    tag("53", "986"),
    ...(amount && amount > 0 ? [tag("54", amount.toFixed(2))] : []),
    tag("58", "BR"),
    tag("59", merchant.slice(0, 25)),
    tag("60", city.slice(0, 15)),
    tag("62", tag("05", txid.slice(0, 25))),
  ].join("");
  const partial = fields + "6304";
  return partial + crc16(partial);
}

export const qrUrl = (payload: string, size = 280) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=8&data=${encodeURIComponent(payload)}`;
