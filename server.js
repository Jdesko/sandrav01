require('dotenv').config();
const express = require('express');
const axios = require('axios');
const CryptoJS = require('crypto-js');
const app = express();

const TUYA_CONFIG = {
  clientId: process.env.TUYA_CLIENT_ID,
  clientSecret: process.env.TUYA_CLIENT_SECRET,
  baseUrl: process.env.TUYA_BASE_URL || 'https://openapi.tuyaeu.com'
};

app.use(express.json());

// Rota proxy para o frontend
app.get('/api/device-status', async (req, res) => {
  try {
    const token = await getTuyaToken();
    const deviceId = req.query.deviceId;
    
    const response = await axios.get(`${TUYA_CONFIG.baseUrl}/v1.0/iot-03/devices${deviceId}/status`, {
      headers: createTuyaHeaders(token)
    });

    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Funções auxiliares
async function getTuyaToken() {
  const timestamp = Date.now();
  const sign = CryptoJS.HmacSHA256(TUYA_CONFIG.clientId + timestamp, TUYA_CONFIG.clientSecret)
    .toString(CryptoJS.enc.Base64);

  const response = await axios.get(`${TUYA_CONFIG.baseUrl}/v1.0/token?grant_type=1`, {
    headers: {
      'client_id': TUYA_CONFIG.clientId,
      'secret': TUYA_CONFIG.clientSecret,
      'sign': sign,
      't': timestamp,
      'sign_method': 'HMAC-SHA256'
    }
  });

  return response.data.result.access_token;
}

function createTuyaHeaders(token) {
  const timestamp = Date.now();
  return {
    'client_id': TUYA_CONFIG.clientId,
    'access_token': token,
    'sign': CryptoJS.HmacSHA256(TUYA_CONFIG.clientId + token + timestamp, TUYA_CONFIG.clientSecret)
      .toString(CryptoJS.enc.Base64),
    't': timestamp,
    'sign_method': 'HMAC-SHA256'
  };
}

app.listen(3000, () => console.log('Proxy server running on port 3000'));