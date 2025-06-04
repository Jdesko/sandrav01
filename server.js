require('dotenv').config();
const express = require('express');
const axios = require('axios');
const CryptoJS = require('crypto-js');
const cors = require('cors');
const app = express();

// Configuração Tuya - Defina no arquivo .env
const TUYA_CONFIG = {
  clientId: process.env.TUYA_CLIENT_ID,
  clientSecret: process.env.TUYA_CLIENT_SECRET,
  baseUrl: process.env.TUYA_BASE_URL || 'https://openapi.tuyaeu.com'
};

// Middlewares
app.use(cors());
app.use(express.json());

// Rota para obter status do dispositivo
app.get('/api/device-status', async (req, res) => {
  try {
    const { deviceId } = req.query;
    if (!deviceId) throw new Error("Device ID não fornecido");

    const token = await getTuyaToken();
    const response = await axios.get(`${TUYA_CONFIG.baseUrl}/v1.0/devices/${deviceId}/status`, {
      headers: createTuyaHeaders(token)
    });

    res.json(response.data);
  } catch (error) {
    console.error("Erro no backend:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// Função para obter token de acesso
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

  if (!response.data.success) {
    throw new Error(response.data.msg || "Falha ao obter token");
  }

  return response.data.result.access_token;
}

// Cria headers para requisições Tuya
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

// Inicia servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
  console.log(`Tuya API Base: ${TUYA_CONFIG.baseUrl}`);
});