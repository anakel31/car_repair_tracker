// --- ЗАГАЛЬНІ ФУНКЦІЇ --- //
const WIALON_TOKEN = '783f97bc76ff1204b0d949403cdfcc556889EF1DDC767B4AC9DEDB4B392EF8AE66503E97';
const WIALON_RESOURCE = 600909294;
const WIALON_TEMPLATE = 1;
const MEGA_GPS_API_KEY = "S182743S365301";

const APP_LOGIN = "admin";
const APP_PASSWORD = "12345";

// Проверка авторизации на всех страницах, кроме login.html
if (!window.location.pathname.endsWith("login.html") && sessionStorage.getItem('loggedIn') !== 'true') {
  window.location.href = "login.html";
}

// Логика для login.html
window.addEventListener('DOMContentLoaded', () => {
  if (!window.location.pathname.endsWith("login.html")) return;
  const form = document.getElementById('login-form');
  const loginInput = document.getElementById('login-input');
  const passInput = document.getElementById('password-input');
  const errorDiv = document.getElementById('login-error');
  if (!form || !loginInput || !passInput || !errorDiv) return;

  form.onsubmit = e => {
    e.preventDefault();
    if (loginInput.value === APP_LOGIN && passInput.value === APP_PASSWORD) {
      sessionStorage.setItem('loggedIn', 'true');
      window.location.href = "index.html";
    } else {
      errorDiv.style.display = "block";
    }
  };
});
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

// обработка index.html
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
    if (
      selectedPart === "Страховка" ||
      selectedPart === "Технічний огляд" ||
      selectedPart === "Тахограф"
    ) {
      unitLabel.textContent = "днів";
      document.getElementById("reminder-date").style.display = "inline-block";
      document.getElementById("reminder-value").style.display = "none";
    } else {
      unitLabel.textContent = "кілометрів";
      document.getElementById("reminder-date").style.display = "none";
      document.getElementById("reminder-value").style.display = "inline-block";
    }
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
    const reminder_unit = document.getElementById("unit-label")?.textContent || "";
    const comment = form["comment"].value.trim();

    // Новое:
    const reminder_date = form["reminder-date"] ? form["reminder-date"].value : "";
    // Новое для километров:
    let reminder_value = "";
    if (reminder && reminder_unit === "кілометрів") {
      reminder_value = form["reminder-value"] ? Number(form["reminder-value"].value) : "";
    }

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
      reminder_unit: reminder ? reminder_unit : "",
      reminder_date: reminder ? reminder_date : "",
      reminder_value: reminder ? reminder_value : "",
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
  const carLink = carLinks.find(link => link.car === car);
  let kmPassed = null;
  if (carLink) {
    // Используем универсальную функцию для любого трекера
    kmPassed = await getPartMileageUniversal(
      carLink,
      prev.date,
      carLink.tracker_type === "wialon" ? {
        token: WIALON_TOKEN,
        reportResourceId: WIALON_RESOURCE,
        reportTemplateId: WIALON_TEMPLATE,
        reportObjectId: carLink.tracker_id
      } : null,
      currDate // до текущей даты замены
    );
  }

  // Добавляем к комментарию
  let addComment = `Попередня заміна: ${prev.date}. Пройдено ${daysPassed} дн.`;
if (kmPassed !== null && !isNaN(kmPassed)) addComment += `, ${Math.round(kmPassed)} км.`;
newRepair.comment = (newRepair.comment ? newRepair.comment + " | " : "") + addComment;
}

    await setRepairHistory([...history, newRepair]);
    form.reset();
  });
  await renderRepairHistory();
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

  // При загрузке показываем все авто
 // showHistory(links.map(link => link.car));

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

    latestReplContainer.innerHTML = Object.values(latestByCarPart).map(item => {
      let reminderText = "Ні";
      if (item.reminder) {
        if (item.reminder_unit === "днів" && item.reminder_date) {
          const now = new Date();
          const target = new Date(item.reminder_date + 'T23:59:59');
          const diff = Math.ceil((target.getTime() - now.getTime()) / (24 * 3600 * 1000));
          reminderText = diff > 0
            ? `через ${diff} днів`
            : "нагадування прострочене";
        } else if (item.reminder_unit === "кілометрів" && item.reminder_value) {
          reminderText = `через ${item.reminder_value} кілометрів`;
        }
      }
      return `
        <div style="border:1px solid #aaa; padding:10px; margin-bottom:10px;">
          🚗 <strong>${item.car}</strong><br>
          🔧 <strong>${item.part}</strong><br>
          📅 Дата заміни: ${item.date}<br>
          🔁 Нагадування: ${reminderText}<br>
          💬 Коментар: ${item.comment || "<i>немає</i>"}
        </div>
      `;
    }).join("") || "<p>Немає даних.</p>";

    const sorted = filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

    fullHistoryContainer.innerHTML = sorted.map(item => {
      let reminderText = "Без нагадування";
      if (item.reminder) {
        if (item.reminder_unit === "днів" && item.reminder_date) {
          const now = new Date();
          const target = new Date(item.reminder_date + 'T23:59:59');
          const diff = Math.ceil((target.getTime() - now.getTime()) / (24 * 3600 * 1000));
          reminderText = diff > 0
            ? `Нагадати через ${diff} днів`
            : "Нагадування прострочене";
        } else if (item.reminder_unit === "кілометрів" && item.reminder_value) {
          reminderText = `Нагадати через ${item.reminder_value} кілометрів`;
        }
      }
      return `
        <div style="border:1px solid #ccc; padding:8px; margin-bottom:8px;">
          <strong>${item.date}</strong> — ${item.car} — ${item.part}<br>
          🔁 ${reminderText}<br>
          💬 ${item.comment || "<i>немає коментаря</i>"}
        </div>
      `;
    }).join("") || "<p>Немає записів.</p>";
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
    const carLink = carLinks.find(link => link.car === item.car);
    let days = '';
    let km = '';
    let kmLeft = null;

    if (item.reminder_unit === 'днів' && item.reminder_date) {
      const now = new Date();
      const target = new Date(item.reminder_date + 'T23:59:59');
      const diff = Math.ceil((target.getTime() - now.getTime()) / (24 * 3600 * 1000));
      days = diff > 0 ? diff : 0;
      if (days > 30) continue; // фильтр по дням
    }

    if (item.reminder_unit === 'кілометрів' && carLink) {
      const wialonParams = carLink.tracker_type === "wialon" ? {
        token: WIALON_TOKEN,
        reportResourceId: WIALON_RESOURCE,
        reportTemplateId: WIALON_TEMPLATE,
        reportObjectId: carLink.tracker_id
      } : null;
      const mileage = await getPartMileageUniversal(carLink, item.date, wialonParams);

      if (mileage != null) {
        kmLeft = item.reminder_value - mileage;
        kmLeft = kmLeft > 0 ? kmLeft : 0;
        km = kmLeft;
      } else {
        km = '—';
      }
      if (kmLeft !== null && kmLeft > 0) {
        const last30 = await getLast30DaysMileage(carLink, wialonParams);
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
      if (typeof days === 'number' && days > 30) continue; // фильтр по дням
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


async function getLast30DaysMileage(carLink, wialonParams) {
  const now = new Date();
  const to = Math.floor(now.getTime() / 1000);
  const from = Math.floor(new Date(now.getTime() - 30 * 24 * 3600 * 1000).getTime() / 1000);

  if (carLink.tracker_type === "mega-gps") {
    return await getMileageMegaGPS(carLink.tracker_id, from, to);
  }
  if (carLink.tracker_type === "wialon" && wialonParams) {
  return await getMileageWialonByProxy(
    wialonParams.token,
    wialonParams.reportResourceId,
    wialonParams.reportTemplateId,
    wialonParams.reportObjectId,
    from,
    to
  );
  }
  return null;
}

// Получить пробег с момента ремонта
async function getPartMileage(tracker_id, repairDate) {
  const fromDate = new Date(repairDate + 'T22:00:00');
  const from = Math.floor(fromDate.getTime() / 1000);
  const to = Math.floor(Date.now() / 1000);
  return await getMileageMegaGPS(tracker_id, from, to);
}


async function getPartMileageUniversal(carLink, repairDate, wialonParams) {
  const fromDate = new Date(repairDate + 'T22:00:00');
  const from = Math.floor(fromDate.getTime() / 1000);
  const to = Math.floor(Date.now() / 1000);
  
  if (carLink.tracker_type === "mega-gps") {
    return await getMileageMegaGPS(carLink.tracker_id, from, to);
  }
  if (carLink.tracker_type === "wialon" && wialonParams) {
  return await getMileageWialonByProxy(
    wialonParams.token,
    wialonParams.reportResourceId,
    wialonParams.reportTemplateId,
    wialonParams.reportObjectId,
    from,
    to
  );
}
  return null;
}

// Получить пробег за период через Wialon (через сервер-прокси)
async function getMileageWialonByProxy(token, reportResourceId, reportTemplateId, reportObjectId, from, to) {
  try {
    const res = await fetch('/proxy/wialon', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, reportResourceId, reportTemplateId, reportObjectId, from, to })
    });
    if (!res.ok) return null;
    const data = await res.json();
    //console.log('Wialon response:', data);

    // Исправлено: data — это массив
    const row = Array.isArray(data) ? data[0] : (data.rows && data.rows[0]);
    if (row && row.c && row.c[4]) {
      const kmStr = row.c[4];
      const km = parseFloat(kmStr.replace(',', '.'));
      return isNaN(km) ? null : km;
    }
    return null;
  } catch {
    return null;
  }
}

async function getMileageMegaGPS(tracker_id, from, to) {
  try {
    const res = await fetch('/proxy/megagps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tracker_id,
        from,
        to,
        apiKey: MEGA_GPS_API_KEY // <-- только так!
      })
    });
    const text = await res.text();
    console.log('MegaGPS raw response:', text);

    const lines = text.trim().split('\n');
    if (lines.length < 2) {
      console.log('MegaGPS: нет данных');
      return null;
    }
    const header = lines[0].split(';');
    const idxId = header.indexOf('id');
    const idxKm = header.indexOf('km10');

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(';');
      if (cols[idxId] === String(tracker_id)) {
        const km10 = parseFloat(cols[idxKm].replace(',', '.'));
        const km = isNaN(km10) ? null : km10 / 10;
        console.log(`MegaGPS: пробег за период = ${km} км`);
        return km;
      }
    }
    return null;
  } catch (e) {
    console.log('MegaGPS ошибка:', e);
    return null;
  }
}

// Вызовите после загрузки страницы
document.addEventListener("DOMContentLoaded", () => {
  renderRemindersTable();
});