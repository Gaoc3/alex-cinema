const fs = require('fs');
const CryptoJS = require('crypto-js');

const SECRET_KEY = 'vA$c1n_S3cr3t_K3y_!2024';

fetch('http://localhost:3000/api/proxy?endpoint=transcoddedFiles/id/3103838/')
  .then(res => res.json())
  .then(data => {
    const bytes = CryptoJS.AES.decrypt(data.payload, SECRET_KEY);
    const decryptedStr = bytes.toString(CryptoJS.enc.Utf8);
    console.log(JSON.stringify(JSON.parse(decryptedStr), null, 2));
  })
  .catch(console.error);
