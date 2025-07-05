// --- ЗАГАЛЬНІ ФУНКЦІЇ --- //
const WIALON_TOKEN = '783f97bc76ff1204b0d949403cdfcc556889EF1DDC767B4AC9DEDB4B392EF8AE66503E97';
const WIALON_RESOURCE = 600909294;
const WIALON_TEMPLATE = 1;
const MEGA_GPS_API_KEY = "S182743S365301";

let mileageCache = {};
try {
  mileageCache = JSON.parse(localStorage.getItem('mileageCache') || '{}');
} catch { mileageCache = {}; }
function saveMileageCache() {
  localStorage.setItem('mileageCache', JSON.stringify(mileageCache));
}

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

const PART_SUBTYPES = {
  "Ходова частина перед": ["Рульові наконечники", "Рессор сайлентблок", "Стабілізатор втулки", "Шкворня ремкомплект", "Цапфа", "Гальмівні колодки", "Гальмівні диски", "Рессора ліва", "Рессора права", "Гальмівна камера", "Гальмівний шланг", "Резина", "Амортизатори", "Інше"],
  "Ходова частина зад": ["Пневмоподушка", "Стабілізатор", "Сайлентблок", "Інше"],
  "Електроніка освітлення": ["Ліва", "Права", "Обидві"],
  "Гідроборт": ["Ліва", "Права", "Обидві"],
  "Фари": ["Ліва", "Права", "Обидві"]
  // добавьте другие при необходимости
};



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

  // Устанавливаем сегодняшнюю дату при открытии страницы (только если поле пустое)
  const dateInput = document.getElementById("replace-date");
  if (dateInput && !dateInput.value) {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    dateInput.value = `${yyyy}-${mm}-${dd}`;
  }

  // --- Подтипы запчастин ---
  const partSelect = document.getElementById('part-select');
  const subpartContainer = document.getElementById('subpart-container');
  const subpartSelect = document.getElementById('subpart-select');

  function updateSubpartVisibility() {
    if (!partSelect || !subpartContainer || !subpartSelect) return;
    const selectedPart = partSelect.value;
    if (PART_SUBTYPES[selectedPart]) {
      subpartContainer.style.display = "block";
      subpartSelect.innerHTML = PART_SUBTYPES[selectedPart]
        .map(sub => `<option value="${sub}">${sub}</option>`)
        .join('');
    } else {
      subpartContainer.style.display = "none";
      subpartSelect.innerHTML = '';
    }
  }

  if (partSelect) {
    partSelect.addEventListener('change', updateSubpartVisibility);
    updateSubpartVisibility();
  }

  // --- Напоминания ---
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

  // --- Обработка формы ---
  const form = document.getElementById("repair-form");
  if (!form) return;

  form.addEventListener("submit", async function(event) {
    event.preventDefault();

    showSaveStatus("Збереження");

    let partValue = "";
    if (
      subpartContainer &&
      subpartContainer.style.display === "block" &&
      subpartSelect &&
      subpartSelect.value
    ) {
      partValue = subpartSelect.value;
    } else if (partSelect && partSelect.value) {
      partValue = partSelect.value;
    }

    const car = form["car"].value;
    const part = partValue;
    const date = form["replace-date"].value;
    const reminder = form["reminder"].checked;
    const reminder_unit = document.getElementById("unit-label")?.textContent || "";
    const comment = form["comment"].value.trim();

    const reminder_date = form["reminder-date"] ? form["reminder-date"].value : "";
    let reminder_value = "";
    if (reminder && reminder_unit === "кілометрів") {
      reminder_value = form["reminder-value"] ? Number(form["reminder-value"].value) : "";
    }

    // Проверка обязательных полей
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

    // --- Добавляем инфо о предыдущей замене ---
    const prev = history
      .filter(item => item.car === car && item.part === part)
      .sort((a, b) => new Date(b.date) - new Date(a.date))[0];

    if (prev) {
      const prevDate = new Date(prev.date + 'T22:00:00');
      const currDate = new Date(date + 'T22:00:00');
      const daysPassed = Math.round((currDate - prevDate) / (1000 * 60 * 60 * 24));
      const carLinks = await getCarLinks();
      const carLink = carLinks.find(link => link.car === car);
      let kmPassed = null;
      if (carLink) {
        kmPassed = await getPartMileageUniversal(
          carLink,
          prev.date,
          carLink.tracker_type === "wialon" ? {
            token: WIALON_TOKEN,
            reportResourceId: WIALON_RESOURCE,
            reportTemplateId: WIALON_TEMPLATE,
            reportObjectId: carLink.tracker_id
          } : null,
          currDate
        );
      }
      let addComment = `Попередня заміна: ${prev.date}. Пройдено ${daysPassed} дн.`;
      if (kmPassed !== null && !isNaN(kmPassed)) addComment += `, ${Math.round(kmPassed)} км.`;
      newRepair.comment = (newRepair.comment ? newRepair.comment + " | " : "") + addComment;
    }

    Object.keys(mileageCache).forEach(key => delete mileageCache[key]);
    saveMileageCache();

    await setRepairHistory([...history, newRepair]);
    form.reset();

    // Восстановить дату после сброса формы
    const dateInput = form["replace-date"];
    if (dateInput) {
      dateInput.value = date;
    }

    if (subpartContainer && subpartSelect) {
      subpartContainer.style.display = "none";
      subpartSelect.innerHTML = '';
    }

    await renderRemindersTable();
    await renderRepairHistory();

    showSaveStatus("Збережено");
    setTimeout(hideSaveStatus, 2000);
    
  });

  await renderRemindersTable();
}

// --- ФУНКЦІЇ ДЛЯ link.html --- //

function showSaveStatus(text) {
  const el = document.getElementById('save-status');
  if (!el) return;
  el.textContent = text;
  el.style.display = 'block';
}
function hideSaveStatus() {
  const el = document.getElementById('save-status');
  if (!el) return;
  el.style.display = 'none';
}

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

  async function showHistory(selectedCars) {
    latestReplContainer.innerHTML = "";
    fullHistoryContainer.innerHTML = "";

    const filtered = history.filter(item => selectedCars.includes(item.car));

    // 1. Находим последние записи по каждой паре "авто+запчастина"
    const latestByCarPart = {};
    filtered.forEach(entry => {
      const key = `${entry.car}__${entry.part}`;
      if (!latestByCarPart[key] || new Date(entry.date) > new Date(latestByCarPart[key].date)) {
        latestByCarPart[key] = entry;
      }
    });

    // 2. Формируем массив последних записей
    const latestArr = Object.values(latestByCarPart);

    // 3. Формируем массив устаревших записей (полная история)
    const latestKeys = new Set(latestArr.map(item => `${item.car}__${item.part}__${item.date}`));
    const fullHistoryArr = filtered.filter(item => !latestKeys.has(`${item.car}__${item.part}__${item.date}`));

    // 4. Для каждой последней замены получаем пробег (с кешем)
    const carLinks = await getCarLinks();
    for (const item of latestArr) {
      const carLink = carLinks.find(link => link.car === item.car);
      if (carLink) {
        item._mileageSinceRepair = await getLastMileageForHistory(carLink, item.date);
      } else {
        item._mileageSinceRepair = null;
      }
    }

    // 5. Рендерим последние замены
    latestReplContainer.innerHTML = latestArr.map(item => {
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
      let mileageText = (item._mileageSinceRepair !== null && item._mileageSinceRepair !== undefined)
        ? `<br>Пробіг з моменту заміни: <b>${Math.round(item._mileageSinceRepair)} км</b>`
        : "";
      return `
        <div style="border:1px solid #aaa; padding:10px; margin-bottom:10px;">
          🚗 <strong>${item.car}</strong><br>
          🔧 <strong>${item.part}</strong><br>
          📅 Дата заміни: ${item.date}<br>
          🔁 Нагадування: ${reminderText}${mileageText}<br>
          💬 Коментар: ${item.comment || "<i>немає</i>"}
        </div>
      `;
    }).join("") || "<p>Немає даних.</p>";

    // 6. Рендерим полную историю (устаревшие записи)
    fullHistoryContainer.innerHTML = fullHistoryArr
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .map(item => {
        return `
          <div style="border:1px solid #ccc; padding:10px; margin-bottom:10px;">
            <strong>Авто:</strong> ${item.car}<br>
            <strong>Запчастина:</strong> ${item.part}<br>
            <strong>Нагадування:</strong> ${item.reminder ? "Так" : "Ні"}<br>
            <strong>Коментар:</strong> ${item.comment || "<i>немає</i>"}<br>
            <strong>Дата:</strong> ${item.date}
          </div>
        `;
      }).join("") || "<p>Історія порожня.</p>";
  }
}

async function getLastMileageForHistory(carLink, repairDate) {
  // Округляем "до" до начала часа
  const toDate = new Date();
  toDate.setMinutes(0, 0, 0);
  const to = Math.floor(toDate.getTime() / 1000);

  // "С" - дата ремонта (T22:00:00 для совместимости)
  const fromDate = new Date(repairDate + 'T22:00:00');
  const from = Math.floor(fromDate.getTime() / 1000);

  if (carLink.tracker_type === "mega-gps") {
    return await getMileageMegaGPS(carLink.tracker_id, from, to);
  }
  if (carLink.tracker_type === "wialon") {
    return await getMileageWialonByProxy(
      WIALON_TOKEN,
      WIALON_RESOURCE,
      WIALON_TEMPLATE,
      carLink.tracker_id,
      from,
      to
    );
  }
  return null;
}


// Возвращает количество дней до напоминания (или Infinity, если не вычислить)
function getDaysLeftForReminder(item, carLinks) {
  if (item.reminder_unit === 'днів' && item.reminder_date) {
    const now = new Date();
    now.setMinutes(0, 0, 0);
    const target = new Date(item.reminder_date + 'T23:59:59');
    return Math.ceil((target.getTime() - now.getTime()) / (24 * 3600 * 1000));
  }
  if (item.reminder_unit === 'кілометрів') {
    const carLink = carLinks.find(link => link.car === item.car);
    if (!carLink) return Infinity;
    // Здесь синхронно не получить, но для сортировки используем последнее вычисленное значение
    // days вычисляется в renderRemindersTable, поэтому можно сохранить его в item._daysCache
    if (typeof item._daysCache === 'number') return item._daysCache;
    return Infinity;
  }
  return Infinity;
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

  let latestReminders = Object.values(latestByCarPart);
  // Сортируем по дате напоминания
 for (const item of latestReminders) {
  if (item.reminder_unit === 'кілометрів') {
    const carLink = carLinks.find(link => link.car === item.car);
    let kmLeft = null;
    let days = Infinity;
    if (carLink) {
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
        if (kmLeft > 0) {
          const last30 = await getLast30DaysMileage(carLink, wialonParams);
          if (last30 && last30 > 0) {
            const avgPerDay = last30 / 30;
            days = avgPerDay > 0 ? Math.floor(kmLeft / avgPerDay) : Infinity;
          }
        } else if (kmLeft === 0) {
          days = 0;
        }
      }
    }
    item._daysCache = days;
  }
}

// --- СОРТИРОВКА по ближайшим дням ---
latestReminders.sort((a, b) => {
  const daysA = getDaysLeftForReminder(a, carLinks);
  const daysB = getDaysLeftForReminder(b, carLinks);
  if (daysA !== daysB) return daysA - daysB;
  // если дни равны — сортируем по авто
  if (a.car < b.car) return -1;
  if (a.car > b.car) return 1;
  return 0;
});

  tableBody.innerHTML = '';
  for (const item of latestReminders) {
    const carLink = carLinks.find(link => link.car === item.car);
    let days = '';
    let km = '';
    let kmLeft = null;

    if (item.reminder_unit === 'днів' && item.reminder_date) {
      const now = new Date();
      now.setMinutes(0, 0, 0);
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


// Получить пробег за последние 30 дней (округление до часа)
async function getLast30DaysMileage(carLink, wialonParams) {
  const now = new Date();
  now.setMinutes(0, 0, 0); // округлить до начала часа
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

// Получить пробег с момента ремонта (округление до часа)
async function getPartMileage(tracker_id, repairDate) {
  const fromDate = new Date(repairDate + 'T22:00:00');
  const from = Math.floor(fromDate.getTime() / 1000);
  const toDate = new Date();
  toDate.setMinutes(0, 0, 0); // округлить до начала часа
  const to = Math.floor(toDate.getTime() / 1000);
  return await getMileageMegaGPS(tracker_id, from, to);
}

// Универсальная функция (округление до часа)
async function getPartMileageUniversal(carLink, repairDate, wialonParams) {
  const fromDate = new Date(repairDate + 'T22:00:00');
  const from = Math.floor(fromDate.getTime() / 1000);
  const toDate = new Date();
  toDate.setMinutes(0, 0, 0); // округлить до начала часа
  const to = Math.floor(toDate.getTime() / 1000);

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
  const cacheKey = `wialon_${reportObjectId}_${from}_${to}`;
  if (mileageCache[cacheKey] !== undefined) {
    return mileageCache[cacheKey];
  }
  // Попробуем из sessionStorage (на случай если кеш был обновлён в другой вкладке)
  try {
    const cacheFromStorage = JSON.parse(localStorage.getItem('mileageCache') || '{}');
    if (cacheFromStorage[cacheKey] !== undefined) {
      mileageCache[cacheKey] = cacheFromStorage[cacheKey];
      return mileageCache[cacheKey];
    }
  } catch {}
  try {
    const res = await fetch('/proxy/wialon', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, reportResourceId, reportTemplateId, reportObjectId, from, to })
    });
    if (!res.ok) {
      mileageCache[cacheKey] = null;
      saveMileageCache();
      return null;
    }
    const data = await res.json();
    const row = Array.isArray(data) ? data[0] : (data.rows && data.rows[0]);
    if (row && row.c && row.c[4]) {
      const kmStr = row.c[4];
      const km = parseFloat(kmStr.replace(',', '.'));
      const result = isNaN(km) ? null : km;
      mileageCache[cacheKey] = result;
      saveMileageCache();
      return result;
    }
    mileageCache[cacheKey] = null;
    saveMileageCache();
    return null;
  } catch {
    mileageCache[cacheKey] = null;
    saveMileageCache();
    return null;
  }
}

async function getMileageMegaGPS(tracker_id, from, to) {
  const cacheKey = `megagps_${tracker_id}_${from}_${to}`;
  if (mileageCache[cacheKey] !== undefined) {
    return mileageCache[cacheKey];
  }
  // Попробуем из sessionStorage (на случай если кеш был обновлён в другой вкладке)
  try {
    const cacheFromStorage = JSON.parse(localStorage.getItem('mileageCache') || '{}');
    if (cacheFromStorage[cacheKey] !== undefined) {
      mileageCache[cacheKey] = cacheFromStorage[cacheKey];
      return mileageCache[cacheKey];
    }
  } catch {}
  try {
    const res = await fetch('/proxy/megagps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tracker_id,
        from,
        to,
        apiKey: MEGA_GPS_API_KEY
      })
    });
    const text = await res.text();
    console.log('MegaGPS raw response:', text);

    const lines = text.trim().split('\n');
    if (lines.length < 2) {
      console.log('MegaGPS: нет данных');
      mileageCache[cacheKey] = null;
      saveMileageCache();
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
        mileageCache[cacheKey] = km;
        saveMileageCache();
        return km;
      }
    }
    mileageCache[cacheKey] = null;
    saveMileageCache();
    return null;
  } catch (e) {
    console.log('MegaGPS ошибка:', e);
    mileageCache[cacheKey] = null;
    saveMileageCache();
    return null;
  }
}

