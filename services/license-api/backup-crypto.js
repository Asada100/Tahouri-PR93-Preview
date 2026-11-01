"use strict";

const fs = require("node:fs");
const crypto = require("node:crypto");

const MAGIC = Buffer.from("TAHOURI-BACKUP-V1");
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

function readEncryptionKey(keyFile) {
    if (!keyFile) {
        throw new Error("TAHOURI_BACKUP_ENCRYPTION_KEY_FILE is required.");
    }
    if (!fs.existsSync(keyFile)) {
        throw new Error("Backup encryption key not found: " + keyFile);
    }

    const raw = fs.readFileSync(keyFile);
    const text = raw.toString("utf8").trim();

    let key;
    if (/^[0-9a-fA-F]{64}$/.test(text)) {
        key = Buffer.from(text, "hex");
    } else {
        key = Buffer.from(text, "base64");
    }

    if (key.length !== KEY_LENGTH) {
        throw new Error("Backup encryption key must decode to exactly 32 bytes.");
    }

    return key;
}

function encryptFile(source, destination, keyFile) {
    const key = readEncryptionKey(keyFile);
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    const plaintext = fs.readFileSync(source);
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const tag = cipher.getAuthTag();

    const output = Buffer.concat([MAGIC, iv, tag, ciphertext]);
    fs.writeFileSync(destination, output, { mode: 0o600 });
}

function decryptFile(source, destination, keyFile) {
    const key = readEncryptionKey(keyFile);
    const input = fs.readFileSync(source);

    const headerLength = MAGIC.length + IV_LENGTH + TAG_LENGTH;
    if (input.length <= headerLength || !input.subarray(0, MAGIC.length).equals(MAGIC)) {
        throw new Error("Invalid encrypted backup format.");
    }

    const ivStart = MAGIC.length;
    const tagStart = ivStart + IV_LENGTH;
    const dataStart = tagStart + TAG_LENGTH;
    const iv = input.subarray(ivStart, tagStart);
    const tag = input.subarray(tagStart, dataStart);
    const ciphertext = input.subarray(dataStart);

    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    fs.writeFileSync(destination, plaintext, { mode: 0o600 });
}

module.exports = {
    readEncryptionKey,
    encryptFile,
    decryptFile
};
