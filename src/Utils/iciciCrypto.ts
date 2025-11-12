import crypto from "crypto";
import fs from "fs";
import path from "path";

const iciciPublicKey = fs.readFileSync(
  path.resolve("./keys/icici_public.pem"),
  "utf8"
);
const clientPrivateKey = fs.readFileSync(
  path.resolve("./keys/client_private.pem"),
  "utf8"
);
// console.log(iciciPublicKey,"publickeyicici")
// console.log(clientPrivateKey,"privitekey client")
export function encryptForIcici(data: any) {
  const randomKey = crypto.randomBytes(16);
  const iv = crypto.randomBytes(16);

  const encryptedKey = crypto
    .publicEncrypt(
      { key: iciciPublicKey, padding: crypto.constants.RSA_PKCS1_PADDING },
      randomKey
    )
    .toString("base64");

  const payload = JSON.stringify(data);
  const dataToEncrypt = Buffer.concat([iv, Buffer.from(payload, "utf8")]);

  const cipher = crypto.createCipheriv("aes-128-cbc", randomKey, iv);
  let encrypted = cipher.update(dataToEncrypt);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  const encryptedData = encrypted.toString("base64");

  return { encryptedKey, encryptedData };
}

export function decryptFromIcici(encryptedKey: any, encryptedData: any) {
  const decryptedKey = crypto.privateDecrypt(
    { key: clientPrivateKey, padding: crypto.constants.RSA_PKCS1_PADDING },
    Buffer.from(encryptedKey, "base64")
  );

  const encryptedBytes = Buffer.from(encryptedData, "base64");
  const iv = encryptedBytes.subarray(0, 16);
  const encryptedPayload = encryptedBytes.subarray(16);

  const decipher = crypto.createDecipheriv("aes-128-cbc", decryptedKey, iv);
  let decrypted = decipher.update(encryptedPayload);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  const result = decrypted.subarray(16).toString("utf8");

  return JSON.parse(result);
}
