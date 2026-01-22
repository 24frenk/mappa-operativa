/* ============================================================
   SEZIONE 1 — FUNZIONI DISABILITATE (solo viewer)
============================================================ */

function saveStateToFile() {}
function enableEditing() {}
function disableEditing() {}
function saveState() {}
function addBox() {}
function deleteBox() {}
function updateBoxPosition() {}
function updateBoxSize() {}
function closePopup() {}


/* ============================================================
   SEZIONE 1B — EMOJI
============================================================ */

const EMOJI = {
    pma: "🏥",
    postazione: "📍",
    ambulanza: "🚑",
    squadra: "👥"
};


/* ============================================================
   SEZIONE 2 — CARICAMENTO STATO DA GITHUB
============================================================ */

async function loadStateFromGitHub() {
    try {
        const response = await fetch("state.json?cache=" + Date.now());
        const data = await response.json();

        renderMapFromState(data.state);
        renderBoxesFromState(data.state);
        updateTopBar(data.state);

    } catch (err) {
        console.error("Errore caricamento da GitHub:", err);
    }
}


/* ============================================================
   SEZIONE 3 — RENDER MAPPA
============================================================ */

function renderMapFromState(state) {
    const map = document.getElementById("map-image");
    if (state.mapImage) {
        map.src = state.mapImage;
    }
}


/* ============================================================
   SEZIONE 4 — RENDER BOXES
============================================================ */

function renderBoxesFromState(state) {
    document.querySelectorAll(".box").forEach(b => b.remove());

    state.boxes.forEach(data => {
        const box = document.createElement("div");
        box.className = `box ${data.color}`;
        box.style.left = data.x + "px";
        box.style.top = data.y + "px";
        box.style.width = data.width + "px";
        box.style.height = data.height + "px";

        box.innerHTML = `
            <div class="box-header">${EMOJI[data.type] || ""} ${data.name}</div>
            <div class="box-status">${data.status}</div>
        `;

        // DOPPIO CLICK → popup
        box.addEventListener("dblclick", () => openPopup(data));

        document.getElementById("map-container").appendChild(box);
    });
}


/* ============================================================
   SEZIONE 5 — POPUP
============================================================ */

function openPopup(data) {
    const popup = document.getElementById("popup");
    const content = document.getElementById("popup-content");

    content.innerHTML = `
        <h2>${EMOJI[data.type] || ""} ${data.name}</h2>
        <p><b>Tipo:</b> ${data.type}</p>
        <p><b>Stato:</b> ${data.status}</p>
        <p><b>Ultimo aggiornamento:</b> ${data.timestamp || "--"}</p>
    `;

    popup.style.display = "block";
}


/* ============================================================
   SEZIONE 6 — BARRA SUPERIORE
============================================================ */

function updateTopBar(state) {
    document.getElementById("last-update").innerText =
        new Date().toLocaleString("it-IT");

    document.getElementById("status").innerText =
        state.status || "—";
}


/* ============================================================
   SEZIONE 7 — SIDEBAR
============================================================ */

function updateSidebar(state) {
    const sidebar = document.getElementById("sidebar-content");
    sidebar.innerHTML = "";

    const groups = {
        pma: [],
        postazione: [],
        ambulanza: [],
        squadra: []
    };

    state.boxes.forEach(b => groups[b.type].push(b));

    for (const type in groups) {
        if (groups[type].length === 0) continue;

        const title = document.createElement("div");
        title.className = "sidebar-category-title";
        title.innerText = type.toUpperCase();
        sidebar.appendChild(title);

        groups[type].forEach(b => {
            const unit = document.createElement("div");
            unit.className = "sidebar-unit";

            unit.innerHTML = `
                <div class="sidebar-unit-title">${EMOJI[b.type]} ${b.name}</div>
                <div class="sidebar-unit-line">Stato: ${b.status}</div>
            `;

            sidebar.appendChild(unit);
        });
    }
}


/* ============================================================
   SEZIONE 8 — AUTO REFRESH
============================================================ */

setInterval(loadStateFromGitHub, 60000);


/* ============================================================
   SEZIONE 9 — AVVIO
============================================================ */

loadStateFromGitHub();
