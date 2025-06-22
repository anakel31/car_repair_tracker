// --- ЗАГАЛЬНІ ФУНКЦІЇ --- //

function getCarLinks() {
  return JSON.parse(localStorage.getItem("car_tracker_links") || "[]");
}

function setCarLinks(links) {
  localStorage.setItem("car_tracker_links", JSON.stringify(links));
}

function getRepairHistory() {
  return JSON.parse(localStorage.getItem("repair_history") || "[]");
}

function setRepairHistory(history) {
  localStorage.setItem("repair_history", JSON.stringify(history));
}

// ⬇️ Вставь свой реальный URL ниже
const sheetURL = "https://script.google.com/macros/s/AKfycbyIkivFze3mkNaKszIUSzR_wLtpbaIsdSj5i1CyYrmckPbotBXnZurtnZBZECAxhecJ/exec";

// --- ФУНКЦІЇ ДЛЯ index.html --- //

function populateCarSelect() {
  const select = document.getElementById("car-select");
  if (!select) return;

  const links = getCarLinks();
  select.innerHTML = '<option value="">-- Оберіть авто --</option>';

  links.forEach(link => {
    const option = document.createElement("option");
    option.value = link.car;
    option.textContent = link.car;
    select.appendChild(option);
  });
}

function renderRepairHistory() {
  const container = document.getElementById("repair-history");
  if (!container) return;

  const history = getRepairHistory();

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

function setupIndexPage() {
  populateCarSelect();
  renderRepairHistory();

  const form = document.getElementById("repair-form");
  if (!form) return;

  form.addEventListener("submit", function(event) {
    event.preventDefault();

    const car = form.car.value;
    const part = form.part.value;
    const reminder = form.reminder.checked;
    const comment = form.comment.value.trim();
    const reminderValue = reminder ? document.getElementById("reminder-value").value : null;
    const reminderUnit = reminder ? (part === "Страховка" || part === "Технічний огляд" ? "днів" : "км") : null;
    const date = document.getElementById("replace-date").value;

    if (!car || !part) {
      alert("Будь ласка, виберіть авто та запчастину.");
      return;
    }

    const newEntry = {
      car,
      part,
      reminder,
      reminder_value: reminderValue,
      reminder_unit: reminderUnit,
      comment,
      date
    };

    fetch(sheetURL, {
      method: "POST",
      body: JSON.stringify(newEntry),
      headers: {
        "Content-Type": "application/json"
      }
    })
    .then(res => res.text())
    .then(result => {
      console.log("Google Sheets response:", result);
      const history = getRepairHistory();
      history.push(newEntry);
      setRepairHistory(history);
      renderRepairHistory();
      form.reset();
      populateCarSelect();
    })
    .catch(err => {
      console.error("Помилка при відправленні в Google Таблицю:", err);
      alert("Не вдалося надіслати дані в Google Таблицю.");
    });
  });
}

// --- ФУНКЦІЇ ДЛЯ link.html --- //

function setupLinkPage() {
  const form = document.getElementById("link-form");
  if (!form) return;

  const container = document.getElementById("linked-cars");

  function renderLinkedCars() {
    const links = getCarLinks();

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

  form.addEventListener("submit", function(event) {
    event.preventDefault();

    const car = form["car-name"].value.trim();
    const trackerType = form["tracker-type"].value;
    const trackerId = form["tracker-id"].value.trim();

    if (!car || !trackerType || !trackerId) {
      alert("Будь ласка, заповніть всі поля.");
      return;
    }

    const links = getCarLinks();
    const duplicate = links.find(l => l.car === car && l.tracker_id === trackerId);
    if (duplicate) {
      alert("Ця прив’язка вже існує.");
      return;
    }

    links.push({ car, tracker_type: trackerType, tracker_id: trackerId });
    setCarLinks(links);
    renderLinkedCars();
    form.reset();
  });

  renderLinkedCars();
}

// --- ВИЗОВ ЗАЛЕЖНО ВІД СТОРІНКИ --- //

document.addEventListener("DOMContentLoaded", function() {
  if (document.getElementById("repair-form")) {
    setupIndexPage();
  } else if (document.getElementById("link-form")) {
    setupLinkPage();
  } else if (document.getElementById("car-checkboxes")) {
    setupHistoryPage();
  }
});

// --- ФУНКЦІЇ ДЛЯ reminder.html --- //

const partSelect = document.getElementById("part-select");
const reminderCheckbox = document.getElementById("reminder");
const reminderSettings = document.getElementById("reminder-settings");
const unitLabel = document.getElementById("unit-label");

function updateReminderVisibility() {
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
}

// Устанавливаем сегодняшнюю дату
const dateInput = document.getElementById("replace-date");
if (dateInput) {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  dateInput.value = `${yyyy}-${mm}-${dd}`;
}

// --- ІСТОРІЯ --- //

function setupHistoryPage() {
  const checkboxesContainer = document.getElementById("car-checkboxes");
  const latestReplContainer = document.getElementById("latest-replacements");
  const fullHistoryContainer = document.getElementById("full-history");

  const links = getCarLinks();
  const history = getRepairHistory();

  if (links.length === 0) {
    checkboxesContainer.innerHTML = "<p>Немає збережених авто.</p>";
    return;
  }

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
