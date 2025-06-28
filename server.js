const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

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