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
const sheetURL =     "https://script.google.com/macros/s/AKfycbyIkivFze3mkNaKszIUSzR_wLtpbaIsdSj5i1CyYrmckPbotBXnZurtnZBZECAxhecJ/exec";
const sheetCarsURL = "https://script.google.com/macros/s/AKfycbyIkivFze3mkNaKszIUSzR_wLtpbaIsdSj5i1CyYrmckPbotBXnZurtnZBZECAxhecJ/exec";
// --- ФУНКЦІЇ ДЛЯ index.html --- //

async function populateCarSelect(){
  const select = document.getElementById("car-select");
  if (!select) return;

  try {
    const links = await fetchCarLinksFromSheet();
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

async function setupIndexPage() {
  await populateCarSelect();
  renderRepairHistory();

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

    try {
      const res = await fetch(sheetURL, {
        method: "POST",
        body: JSON.stringify(newEntry),
        headers: {
          "Content-Type": "application/json"
        }
      });

      const result = await res.text();
      console.log("Google Sheets response:", result);

      if (result.toLowerCase().includes("error")) {
        alert("Помилка при відправленні в Google Таблицю: " + result);
      } else {
        const history = getRepairHistory();
        history.push(newEntry);
        setRepairHistory(history);
        renderRepairHistory();
        form.reset();
        await populateCarSelect();
        if (reminderSettings) reminderSettings.style.display = "none";
      }
    } catch (err) {
      console.error("Помилка при відправленні в Google Таблицю:", err);
      alert("Не вдалося надіслати дані в Google Таблицю.");
    }
  });
}

// --- ФУНКЦІЇ ДЛЯ link.html --- //

function setupLinkPage() {
  const form = document.getElementById("link-form");
  if (!form) return;

  const container = document.getElementById("linked-cars");

  async function renderLinkedCars() {
    let links;
    try {
      links = await fetchCarLinksFromSheet();
    } catch {
      links = getCarLinks();
    }

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

    const links = getCarLinks();
    const duplicate = links.find(l => l.car === car && l.tracker_id === trackerId);
    if (duplicate) {
      alert("Ця прив’язка вже існує.");
      return;
    }

    const newLink = { car, tracker_type: trackerType, tracker_id: trackerId };

    try {
      const result = await addCarLinkToSheet(newLink);
      console.log("Google Sheets response:", result);
      alert("Прив'язка авто додана!");

      links.push(newLink);
      setCarLinks(links);

      await renderLinkedCars();
      form.reset();
    } catch (err) {
      console.error("Помилка при відправленні прив’язки в Google Таблицю:", err);
      alert("Не вдалося додати прив'язку до Google Таблиці.");
    }
  });

  renderLinkedCars();
}

// --- ВИЗОВ ЗАЛЕЖНО ВІД СТОРІНКИ --- //

document.addEventListener("DOMContentLoaded", async function() {
  if (document.getElementById("repair-form")) {
    await setupIndexPage();
  } else if (document.getElementById("link-form")) {
    await setupLinkPage();
  } else if (document.getElementById("car-checkboxes")) {
    setupHistoryPage();
  }
});

// --- ІСТОРІЯ --- //

function setupHistoryPage() {
  const checkboxesContainer = document.getElementById("car-checkboxes");
  const latestReplContainer = document.getElementById("latest-replacements");
  const fullHistoryContainer = document.getElementById("full-history");

  const links = getCarLinks();
  const history = getRepairHistory();

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

// --- Google Sheets helpers --- //

function addCarLinkToSheet(carLink) {
  return fetch(sheetCarsURL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(carLink)
  })
  .then(res => res.text());
}

async function fetchCarLinksFromSheet() {
  try {
    const res = await fetch(sheetCarsURL);
    if (!res.ok) throw new Error("Не вдалося завантажити дані авто");
    const data = await res.json();
    setCarLinks(data);
    return data;
  } catch (err) {
    console.error(err);
    return getCarLinks();
  }
}