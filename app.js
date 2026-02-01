/* ============================================================
   CONFIGURAZIONE ONLINE (SOLO VISUALIZZAZIONE)
============================================================ */

const IS_ONLINE_VERSION = true;
const DATA_URL = "https://raw.githubusercontent.com/24frenk/mappa-operativa/main/data.json";

let scale = 1;

const EMOJI = {
    postazione: "📍",
    ambulanza: "🚑",
    squadra: "⛑️",
    pma: "🏥"
};

/* ============================================================
   NO-OP PER FUNZIONI DI EDITING (DISATTIVATE ONLINE)
============================================================ */

function addBox() { /* disattivato online */ }
function toggleMapLock() { /* disattivato online */ }
function savePopup() { /* disattivato online */ }
function toggleStandby() { /* disattivato online */ }
function terminaIntervento() { /* disattivato online */ }
function terminaSupporto() { /* disattivato online */ }
function removeCurrentUnit() { /* disattivato online */ }
function closePopup() {
    const p = document.getElementById("popup");
    if (p) p.style.display = "none";
}

/* ============================================================
   UI SYNC INFO
============================================================ */

function updateSyncUI(state, text) {
    const s = document.getElementById("sync-state");
    const l = document.getElementById("sync-last");

    if (s) s.innerText = "Stato: " + state;
    if (l) l.innerText = "Ultimo aggiornamento: " + text;
}

/* ============================================================
   RENDER MAPPA DA STATO (data.json)
============================================================ */

function clearMap() {
    const container = document.getElementById("map-container");
    if (!container) return;

    [...container.querySelectorAll(".box")].forEach(b => b.remove());
}

function applyScale(newScale) {
    scale = newScale || 1;
    const mc = document.getElementById("map-container");
    const slider = document.getElementById("mapScale");
    const lockBtn = document.getElementById("lockMapBtn");

    if (mc) mc.style.transform = `scale(${scale})`;
    if (slider) {
        slider.value = scale * 100;
        slider.disabled = true; // online: non modificabile
    }
    if (lockBtn) {
        lockBtn.innerText = "Mappa bloccata (solo visualizzazione)";
        lockBtn.disabled = true;
    }
}

function renderBoxesFromState(state) {
    const container = document.getElementById("map-container");
    if (!container) return;

    clearMap();

    (state.boxes || []).forEach(data => {
        const box = document.createElement("div");
        box.className = "box";
        box.dataset.type = data.type;
        box.dataset.name = data.name || "";
        box.dataset.standby = data.standby === "true" || data.standby === true ? "true" : "false";

        const interventi = (data.interventi || "").split("|").filter(x => x);
        const supporti = (data.supporti || "").split("|").filter(x => x);

        box.style.left = data.x || "200px";
        box.style.top = data.y || "200px";

        const header = document.createElement("div");
        header.className = "box-header";

        const title = document.createElement("div");
        title.className = "box-title";

        const baseLabel =
            data.type === "postazione" ? "Postazione" :
            data.type === "ambulanza" ? "Ambulanza" :
            data.type === "squadra" ? "Squadra" :
            "PMA";

        title.innerText = `${EMOJI[data.type]} ${data.name || baseLabel}`;
        header.appendChild(title);

        box.appendChild(header);

        if (box.dataset.standby === "true") {
            box.classList.add("yellow");
        } else if (interventi.length > 0) {
            box.classList.add("red");
        } else if (supporti.length > 0) {
            box.classList.add("orange");
        }

        container.appendChild(box);
    });
}
/* ============================================================
   FETCH PERIODICO DA GITHUB (data.json)
============================================================ */

async function fetchStateFromGitHub() {
    try {
        updateSyncUI("Caricamento", "—");

        const res = await fetch(DATA_URL + "?t=" + Date.now(), {
            cache: "no-store"
        });

        if (!res.ok) throw new Error("Errore fetch");

        const state = await res.json();

        applyScale(state.scale || 1);
        renderMapImage(state.mapImage);
        renderBoxesFromState(state);
        updateSidebar();

        const now = new Date().toLocaleTimeString("it-IT", { hour12: false });
        updateSyncUI("OK", now);

    } catch (err) {
        updateSyncUI("ERRORE", "Impossibile leggere data.json");
    }
}

/* ============================================================
   RENDER MAPPA DI SFONDO
============================================================ */

function renderMapImage(mapImage) {
    const img = document.getElementById("map-image");
    if (!img) return;

    if (!mapImage) return;

    // Se è un nome file, lo carichiamo dalla root del repo GitHub Pages
    if (!mapImage.startsWith("http")) {
        img.src = mapImage;
    } else {
        img.src = mapImage;
    }
}

/* ============================================================
   SIDEBAR (SOLO VISUALIZZAZIONE)
============================================================ */

function updateSidebar() {
    const sidebar = document.getElementById("sidebar-content");
    if (!sidebar) return;

    sidebar.innerHTML = "";

    const boxes = [...document.querySelectorAll(".box")];

    const categories = {
        pma: [],
        postazione: [],
        ambulanza: [],
        squadra: []
    };

    boxes.forEach(box => {
        const type = box.dataset.type;
        if (categories[type]) categories[type].push(box);
    });

    function createCategory(label, items) {
        if (!items.length) return;

        const title = document.createElement("div");
        title.className = "sidebar-category-title";
        title.innerText = `${label} (${items.length})`;
        sidebar.appendChild(title);

        const container = document.createElement("div");
        container.className = "sidebar-category";

        items.sort((a, b) => {
            const na = (a.dataset.name || "").toLowerCase();
            const nb = (b.dataset.name || "").toLowerCase();
            return na.localeCompare(nb);
        });

        items.forEach(box => {
            const div = document.createElement("div");
            div.className = "sidebar-unit";

            const name = box.dataset.name || "";
            const type = box.dataset.type;

            const baseLabel =
                type === "postazione" ? "Postazione" :
                type === "ambulanza" ? "Ambulanza" :
                type === "squadra" ? "Squadra" :
                "PMA";

            const title = document.createElement("div");
            title.className = "sidebar-unit-title";
            title.innerText = `${EMOJI[type]} ${name || baseLabel}`;
            div.appendChild(title);

            if (box.classList.contains("yellow")) {
                const l = document.createElement("div");
                l.className = "sidebar-unit-line";
                l.innerHTML = "<b>Stato:</b> In standby";
                div.appendChild(l);
            }

            if (box.classList.contains("red")) {
                const l = document.createElement("div");
                l.className = "sidebar-unit-line";
                l.innerHTML = "<b>Intervento attivo</b>";
                div.appendChild(l);
            }

            if (box.classList.contains("orange")) {
                const l = document.createElement("div");
                l.className = "sidebar-unit-line";
                l.innerHTML = "<b>Supporto richiesto</b>";
                div.appendChild(l);
            }

            container.appendChild(div);
        });

        sidebar.appendChild(container);
    }

    createCategory("PMA", categories.pma);
    createCategory("Postazioni", categories.postazione);
    createCategory("Ambulanze", categories.ambulanza);
    createCategory("Squadre", categories.squadra);
}
/* ============================================================
   DISATTIVA TUTTI I CONTROLLI OFFLINE (ONLINE = VIEW ONLY)
============================================================ */

function disableOfflineControls() {
    const addButtons = document.querySelectorAll("#top-bar button");
    addButtons.forEach(btn => btn.disabled = true);

    const mapLoader = document.getElementById("mapLoader");
    if (mapLoader) mapLoader.disabled = true;

    const mapScale = document.getElementById("mapScale");
    if (mapScale) mapScale.disabled = true;

    const lockBtn = document.getElementById("lockMapBtn");
    if (lockBtn) {
        lockBtn.disabled = true;
        lockBtn.innerText = "Mappa bloccata (solo visualizzazione)";
    }
}

/* ============================================================
   AVVIO AUTOMATICO
============================================================ */

async function initOnlineView() {
    disableOfflineControls();
    await fetchStateFromGitHub();

    // Aggiornamento automatico ogni 10 secondi
    setInterval(fetchStateFromGitHub, 10000);
}

window.onload = initOnlineView;
