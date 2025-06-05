require('dotenv').config();
const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Configurações (armazene no .env)
const TUYA_CONFIG = {
  clientId: process.env.TUYA_CLIENT_ID,
  clientSecret: process.env.TUYA_CLIENT_SECRET,
  baseUrl: process.env.TUYA_BASE_URL || 'https://openapi.tuyaeu.com'
};

// Helper para calcular assinatura
function calculateSignature(message, secret) {
  return crypto.createHmac('sha256', secret)
    .update(message)
    .digest('hex')
    .toUpperCase();
}

// Rota para obter token
app.get('/api/tuya/token', async (req, res) => {
  try {
    const timestamp = Date.now();
    const nonce = crypto.randomBytes(16).toString('hex');
    const stringToSign = TUYA_CONFIG.clientId + timestamp + nonce;
    const signature = calculateSignature(stringToSign, TUYA_CONFIG.clientSecret);

    const response = await axios.get(`${TUYA_CONFIG.baseUrl}/v1.0/token?grant_type=2`, {
      headers: {
        'client_id': TUYA_CONFIG.clientId,
        'sign': signature,
        't': timestamp.toString(),
        'sign_method': 'HMAC-SHA256',
        'nonce': nonce
      }
    });

    res.json(response.data);
  } catch (error) {
    console.error('Token error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to get token' });
  }
});

// Rota para status do dispositivo
app.get('/api/tuya/device/:deviceId/status', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const tokenResponse = await axios.get(`${req.protocol}://${req.get('host')}/api/tuya/token`);
    
    if (!tokenResponse.data.success) {
      throw new Error(tokenResponse.data.msg || 'Failed to get token');
    }

    const { access_token, expire_time } = tokenResponse.data.result;
    const timestamp = Date.now();
    const nonce = crypto.randomBytes(16).toString('hex');
    const stringToSign = access_token + timestamp + nonce;
    const signature = calculateSignature(stringToSign, TUYA_CONFIG.clientSecret);

    const response = await axios.get(`${TUYA_CONFIG.baseUrl}/v1.0/devices/${deviceId}/status`, {
      headers: {
        'client_id': TUYA_CONFIG.clientId,
        'access_token': access_token,
        'sign': signature,
        't': timestamp.toString(),
        'sign_method': 'HMAC-SHA256',
        'nonce': nonce
      }
    });

    res.json(response.data);
  } catch (error) {
    console.error('Device error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to get device status' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
});