// --- ЗАГАЛЬНІ ФУНКЦІЇ --- //
// --- Работа с локальным файлом (только для десктопа через Node.js/Electron) --- //

async function universalReadJsonFile(apiUrl, fileUrl) {
  // Сначала пробуем через API
  try {
    const res = await fetch(apiUrl);
    if (res.ok) return await res.json();
  } catch {}
  // Если не получилось — пробуем как статический файл
  try {
    const res = await fetch(fileUrl);
    if (res.ok) return await res.json();
  } catch {}
  return [];
}

// --- Работа с привязками авто (cars.json) --- //
async function getCarLinks() {
  return await universalReadJsonFile('/api/cars', 'cars.json');
}

async function setCarLinks(links) {
  await writeCarsFile(links);
}

// --- Работа с историей ремонтов (history.json) --- //
async function getRepairHistory() {
  return await universalReadJsonFile('/api/history', 'history.json');
}

async function setRepairHistory(history) {
  await writeHistoryFile(history);
}

// --- Функции для чтения/записи файлов --- //
async function writeCarsFile(data) {
  try {
    const res = await fetch('/api/cars', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.ok;
  } catch {
    alert("Ошибка записи привязок!");
    return false;
  }
}

async function writeHistoryFile(data) {
  try {
    const res = await fetch('/api/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.ok;
  } catch {
    alert("Ошибка записи истории!");
    return false;
  }
}
// --- ФУНКЦІЇ ДЛЯ index.html --- //

async function populateCarSelect() {
  const select = document.getElementById("car-select");
  if (!select) return;

  try {
    const links = await getCarLinks();
    select.innerHTML = '<option value="">-- Оберіть авто --</option>';
    links.forEach(link => {
      const option = document.createElement("option");
      option.value = link.car;
      option.textContent = link.car;
      select.appendChild(option);
    });
  } catch (err) {
    console.error("Не вдалося завантажити список авто:", err);
  }
}

async function renderRepairHistory() {
  const container = document.getElementById("repair-history");
  if (!container) return;

  const history = await getRepairHistory();

  if (history.length === 0) {
    container.innerHTML = "<p>Історія ремонту порожня.</p>";
    return;
  }

  container.innerHTML = history.slice().reverse().map(item => {
    return `
      <div style="border:1px solid #ccc; padding:10px; margin-bottom:10px;">
        <strong>Авто:</strong> ${item.car}<br>
        <strong>Запчастина:</strong> ${item.part}<br>
        <strong>Нагадування:</strong> ${item.reminder ? "Так" : "Ні"}<br>
        <strong>Коментар:</strong> ${item.comment || "<i>немає</i>"}<br>
        <strong>Дата:</strong> ${item.date}
      </div>
    `;
  }).join("");
}

async function setupIndexPage() {
  await populateCarSelect();
  await renderRepairHistory();

  // Устанавливаем сегодняшнюю дату при открытии страницы
  const dateInput = document.getElementById("replace-date");
  if (dateInput) {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    dateInput.value = `${yyyy}-${mm}-${dd}`;
  }

  // Напоминания: инициализация только если элементы есть на странице
  const partSelect = document.getElementById("part-select");
  const reminderCheckbox = document.getElementById("reminder");
  const reminderSettings = document.getElementById("reminder-settings");
  const unitLabel = document.getElementById("unit-label");

  function updateReminderVisibility() {
    if (!partSelect || !reminderCheckbox || !reminderSettings || !unitLabel) return;
    const selectedPart = partSelect.value;
    const isChecked = reminderCheckbox.checked;

    if (isChecked) {
      reminderSettings.style.display = "block";
      unitLabel.textContent = selectedPart === "Страховка" || selectedPart === "Технічний огляд"
        ? "днів"
        : "кілометрів";
    } else {
      reminderSettings.style.display = "none";
    }
  }

  if (reminderCheckbox && partSelect) {
    reminderCheckbox.addEventListener("change", updateReminderVisibility);
    partSelect.addEventListener("change", updateReminderVisibility);
    updateReminderVisibility();
  }

  const form = document.getElementById("repair-form");
  if (!form) return;

  form.addEventListener("submit", async function(event) {
    event.preventDefault();

    const car = form["car"].value;
    const part = form["part"].value;
    const date = form["replace-date"].value;
    const reminder = form["reminder"].checked;
    const reminder_value = form["reminder-value"] ? form["reminder-value"].value : "";
    const reminder_unit = document.getElementById("unit-label")?.textContent || "";
    const comment = form["comment"].value.trim();

    if (!car || !part || !date) {
      alert("Будь ласка, заповніть всі обов'язкові поля.");
      return;
    }

    const history = await getRepairHistory();
    const newRepair = {
      car,
      part,
      date,
      reminder,
      reminder_value: reminder ? reminder_value : "",
      reminder_unit: reminder ? reminder_unit : "",
      comment
    };

    // --- Новый блок: если есть предыдущая замена этой запчасти на этом авто ---
const prev = history
  .filter(item => item.car === car && item.part === part)
  .sort((a, b) => new Date(b.date) - new Date(a.date))[0];

if (prev) {
  // Считаем разницу в днях
  const prevDate = new Date(prev.date + 'T22:00:00');
  const currDate = new Date(date + 'T22:00:00');
  const daysPassed = Math.round((currDate - prevDate) / (1000 * 60 * 60 * 24));

  // Считаем разницу в километрах (если есть привязка)
  const carLinks = await getCarLinks();
  const carLink = carLinks.find(link => link.car === car && link.tracker_type === "mega-gps");
  let kmPassed = null;
  if (carLink) {
    kmPassed = await getMileageMegaGPS(
      carLink.tracker_id,
      Math.floor(prevDate.getTime() / 1000),
      Math.floor(currDate.getTime() / 1000)
    );
  }

  // Добавляем к комментарию
  let addComment = `Попередня заміна: ${prev.date}. Пройдено ${daysPassed} дн.`;
  if (kmPassed !== null) addComment += `, ${Math.round(kmPassed)} км.`;
  newRepair.comment = (newRepair.comment ? newRepair.comment + " | " : "") + addComment;
}

    await setRepairHistory([...history, newRepair]);
    await renderRepairHistory();
    form.reset();
  });
}

// --- ФУНКЦІЇ ДЛЯ link.html --- //

async function setupLinkPage() {
  const form = document.getElementById("link-form");
  if (!form) return;

  const container = document.getElementById("linked-cars");

  async function renderLinkedCars() {
    const links = await getCarLinks();

    if (links.length === 0) {
      container.innerHTML = "<p>Немає прив’язаних авто.</p>";
      return;
    }

    container.innerHTML = "<ul>" + links.map(link => `
      <li>
        🚗 <strong>${link.car}</strong> — тип: <em>${link.tracker_type}</em>, ID: <code>${link.tracker_id}</code>
      </li>
    `).join("") + "</ul>";
  }

  form.addEventListener("submit", async function(event) {
    event.preventDefault();

    const car = form["car-name"].value.trim();
    const trackerType = form["tracker-type"].value;
    const trackerId = form["tracker-id"].value.trim();

    if (!car || !trackerType || !trackerId) {
      alert("Будь ласка, заповніть всі поля.");
      return;
    }

    const links = await getCarLinks();
    const duplicate = links.find(l => l.car === car && l.tracker_id === trackerId);
    if (duplicate) {
      alert("Ця прив’язка вже існує.");
      return;
    }

    const newLink = { car, tracker_type: trackerType, tracker_id: trackerId };
    links.push(newLink);
    await setCarLinks(links);

    await renderLinkedCars();
    form.reset();
  });

  await renderLinkedCars();
}

// --- ВИЗОВ ЗАЛЕЖНО ВІД СТОРІНКИ --- //

document.addEventListener("DOMContentLoaded", async function() {
  if (document.getElementById("repair-form")) {
    await setupIndexPage();
  } else if (document.getElementById("link-form")) {
    await setupLinkPage();
  } else if (document.getElementById("car-checkboxes")) {
    await setupHistoryPage();
  }
});

// --- ІСТОРІЯ --- //

async function setupHistoryPage() {
  const checkboxesContainer = document.getElementById("car-checkboxes");
  const latestReplContainer = document.getElementById("latest-replacements");
  const fullHistoryContainer = document.getElementById("full-history");

  const links = await getCarLinks();
  const history = await getRepairHistory();

  if (links.length === 0) {
    checkboxesContainer.innerHTML = "<p>Немає збережених авто.</p>";
    latestReplContainer.innerHTML = "";
    fullHistoryContainer.innerHTML = "";
    return;
  }
  checkboxesContainer.innerHTML = "";

  links.forEach(link => {
    const label = document.createElement("label");
    label.innerHTML = `
      <input type="checkbox" name="car-filter" value="${link.car}" />
      ${link.car}
    `;
    checkboxesContainer.appendChild(label);
    checkboxesContainer.appendChild(document.createElement("br"));
  });

  checkboxesContainer.addEventListener("change", () => {
    const selectedCars = Array.from(document.querySelectorAll('input[name="car-filter"]:checked')).map(cb => cb.value);
    showHistory(selectedCars);
  });

  function showHistory(selectedCars) {
    latestReplContainer.innerHTML = "";
    fullHistoryContainer.innerHTML = "";

    const filtered = history.filter(item => selectedCars.includes(item.car));

    const latestByCarPart = {};
    filtered.forEach(entry => {
      const key = `${entry.car}__${entry.part}`;
      if (!latestByCarPart[key] || new Date(entry.date) > new Date(latestByCarPart[key].date)) {
        latestByCarPart[key] = entry;
      }
    });

    latestReplContainer.innerHTML = Object.values(latestByCarPart).map(item => `
      <div style="border:1px solid #aaa; padding:10px; margin-bottom:10px;">
        🚗 <strong>${item.car}</strong><br>
        🔧 <strong>${item.part}</strong><br>
        📅 Дата заміни: ${item.date}<br>
        🔁 Нагадування: ${item.reminder ? `через ${item.reminder_value} ${item.reminder_unit}` : "Ні"}<br>
        💬 Коментар: ${item.comment || "<i>немає</i>"}
      </div>
    `).join("") || "<p>Немає даних.</p>";

    const sorted = filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

    fullHistoryContainer.innerHTML = sorted.map(item => `
      <div style="border:1px solid #ccc; padding:8px; margin-bottom:8px;">
        <strong>${item.date}</strong> — ${item.car} — ${item.part}<br>
        🔁 ${item.reminder ? `Нагадати через ${item.reminder_value} ${item.reminder_unit}` : "Без нагадування"}<br>
        💬 ${item.comment || "<i>немає коментаря</i>"}
      </div>
    `).join("") || "<p>Немає записів.</p>";
  }
}

async function renderRemindersTable() {
  const tableBody = document.querySelector('#reminders-table tbody');
  if (!tableBody) return;
  const history = await getRepairHistory();
  const carLinks = await getCarLinks();

  // Фильтруем только записи с напоминанием
  const reminders = history.filter(item => item.reminder && (item.reminder_value || item.reminder_unit));

  // Оставляем только последние записи по каждой паре "авто+запчастина"
  const latestByCarPart = {};
  reminders.forEach(item => {
    const key = `${item.car}__${item.part}`;
    if (!latestByCarPart[key] || new Date(item.date) > new Date(latestByCarPart[key].date)) {
      latestByCarPart[key] = item;
    }
  });

  const latestReminders = Object.values(latestByCarPart);

  tableBody.innerHTML = '';
  for (const item of latestReminders) {
    const carLink = carLinks.find(link => link.car === item.car && link.tracker_type === "mega-gps");
    let days = '';
    let km = '';
    let kmLeft = null;
    if (item.reminder_unit === 'днів') {
      const repairDate = new Date(item.date + 'T22:00:00');
      const now = new Date();
      const diff = Math.ceil((repairDate.getTime() + item.reminder_value * 24 * 3600 * 1000 - now.getTime()) / (24 * 3600 * 1000));
      days = diff > 0 ? diff : 0;
    }
    if (item.reminder_unit === 'кілометрів' && carLink) {
      const mileage = await getPartMileage(carLink.tracker_id, item.date);
      if (mileage != null) {
        kmLeft = item.reminder_value - mileage;
        kmLeft = kmLeft > 0 ? kmLeft : 0;
        km = kmLeft;
      } else {
        km = '—';
      }
      if (kmLeft !== null && kmLeft > 0) {
        const last30 = await getLast30DaysMileage(carLink.tracker_id);
        if (last30 && last30 > 0) {
          const avgPerDay = last30 / 30;
          days = avgPerDay > 0 ? Math.floor(kmLeft / avgPerDay) : '—';
        } else {
          days = '—';
        }
      } else if (kmLeft === 0) {
        days = 0;
      } else {
        days = '—';
      }
    }
    tableBody.innerHTML += `
      <tr>
        <td>${item.car}</td>
        <td>${item.part}</td>
        <td style="text-align:center;">${days}</td>
        <td style="text-align:center;">${km}</td>
      </tr>
    `;
  }
  if (latestReminders.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center;">Немає активних нагадувань</td></tr>`;
  }
}

async function getLast30DaysMileage(tracker_id) {
  const apiKey = 'S182743S365301';
  const now = new Date();
  const to = Math.floor(now.getTime() / 1000);
  const from = Math.floor(new Date(now.getTime() - 30 * 24 * 3600 * 1000).getTime() / 1000);
  return await getMileageMegaGPS(tracker_id, from, to);
}
// Получить пробег за период через MEGA-GPS (через сервер-прокси)
async function getMileageMegaGPS(tracker_id, from, to) {
  const apiKey = 'S182743S365301';
  try {
    const res = await fetch('/proxy/megagps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tracker_id, from, to, apiKey })
    });
    if (!res.ok) return null;
    const text = await res.text();
    // Ответ в формате CSV, ищем строку с km10
    // Пример: id;km10;maxspeed;enginetime\n23647;1234;80;3600
    const lines = text.trim().split('\n');
    if (lines.length < 2) return null;
    const fields = lines[1].split(';');
    const km10 = parseInt(fields[1], 10);
    return km10 / 10; // километры
  } catch {
    return null;
  }
}

// Получить пробег с момента ремонта
async function getPartMileage(tracker_id, repairDate) {
  const fromDate = new Date(repairDate + 'T22:00:00');
  const from = Math.floor(fromDate.getTime() / 1000);
  const to = Math.floor(Date.now() / 1000);
  return await getMileageMegaGPS(tracker_id, from, to);
}

// Вызовите после загрузки страницы
document.addEventListener("DOMContentLoaded", () => {
  renderRemindersTable();
});