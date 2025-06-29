const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const axios = require('axios');

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

// Разрешаем CORS для локального доступа
app.use(cors());
app.use(express.json());

// Статические файлы (ваш сайт)
app.use(express.static(__dirname));

// Получить все данные
app.get('/api/data', (req, res) => {
  fs.readFile(DATA_FILE, 'utf8', (err, data) => {
    if (err) return res.json([]);
    res.json(JSON.parse(data || '[]'));
  });
});

// Записать новые данные (перезаписать весь файл)
app.post('/api/data', (req, res) => {
  fs.writeFile(DATA_FILE, JSON.stringify(req.body, null, 2), 'utf8', err => {
    if (err) return res.status(500).send('Ошибка записи');
    res.send('OK');
  });
});

app.listen(PORT, () => {
  console.log(`Сервер запущен: http://localhost:${PORT}`);
});

app.post('/api/cars', (req, res) => {
  fs.writeFile('cars.json', JSON.stringify(req.body, null, 2), err => {
    if (err) return res.status(500).send('Error');
    res.send('OK');
  });
});

app.post('/api/history', (req, res) => {
  fs.writeFile('history.json', JSON.stringify(req.body, null, 2), err => {
    if (err) return res.status(500).send('Error');
    res.send('OK');
  });
});

app.get('/api/cars', (req, res) => {
  fs.readFile('cars.json', 'utf8', (err, data) => {
    if (err) return res.json([]);
    res.json(JSON.parse(data || '[]'));
  });
});

app.get('/api/history', (req, res) => {
  fs.readFile('history.json', 'utf8', (err, data) => {
    if (err) return res.json([]);
    res.json(JSON.parse(data || '[]'));
  });
});

app.post('/proxy/megagps', async (req, res) => {
  try {
    const { tracker_id, from, to, apiKey } = req.body;
    const params = new URLSearchParams({
      s: apiKey,
      c: 2,
      i: tracker_id,
      x: from,
      y: to
    });
    const response = await axios.post('http://mega-gps.com/api3', params);
    res.send(response.data);
  } catch (e) {
    res.status(500).send('Proxy error');
  }
});


app.post('/proxy/wialon', async (req, res) => {
  try {
    const { token, reportResourceId, reportTemplateId, reportObjectId, from, to } = req.body;
    // Получить sid
    const loginRes = await axios.post(
      'https://wialon.gps-garant.com.ua/wialon/ajax.html',
      `svc=token/login&params=${encodeURIComponent(JSON.stringify({ token }))}`,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    const sid = loginRes.data.eid;
    if (!sid) {
      console.error('Wialon login error:', loginRes.data);
      return res.status(500).send('Wialon login error');
    }

    // Выполнить отчёт
    const execReport = await axios.post(
      'https://wialon.gps-garant.com.ua/wialon/ajax.html',
      `svc=report/exec_report&params=${encodeURIComponent(JSON.stringify({
        reportResourceId,
        reportTemplateId,
        reportObjectId,
        reportObjectSecId: 0,
        interval: { from, to, flags: 0 }
      }))}&sid=${sid}`,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    if (execReport.data.error) {
      console.error('Wialon exec_report error:', execReport.data);
      return res.status(500).send('Wialon exec_report error');
    }

    // Получить строки результата
    const getRows = await axios.post(
      'https://wialon.gps-garant.com.ua/wialon/ajax.html',
      `svc=report/get_result_rows&params=${encodeURIComponent(JSON.stringify({ tableIndex: 0, indexFrom: 0, indexTo: 0 }))}&sid=${sid}`,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    if (getRows.data.error) {
      console.error('Wialon get_result_rows error:', getRows.data);
      return res.status(500).send('Wialon get_result_rows error');
    }
    res.json(getRows.data);
  } catch (e) {
    console.error('Wialon proxy error:', e);
    res.status(500).send('Wialon proxy error');
  }
});