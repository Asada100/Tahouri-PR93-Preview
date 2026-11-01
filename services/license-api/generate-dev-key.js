// TEST/DEVELOPMENT ONLY
"use strict";
const fs=require("fs");
const crypto=require("crypto");
const path=require("path");
const target=path.join(__dirname,"dev-private-key.pem");
if(fs.existsSync(target)){
  console.log("Development private key already exists:",target);
  process.exit(0);
}
const {privateKey}=crypto.generateKeyPairSync("rsa",{modulusLength:2048,publicExponent:0x10001});
fs.writeFileSync(target,privateKey.export({type:"pkcs8",format:"pem"}),{encoding:"utf8",mode:0o600});
console.log("Development private key created:",target);
console.log("This file is ignored by Git and must never be shipped with the app.");