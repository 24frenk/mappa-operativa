/* ============================================================
   VERSIONE UNIFICATA — OFFLINE + ONLINE
   La modalità è determinata da IS_ONLINE_VERSION (in index.html)
============================================================ */

console.log("Avvio app.js — Modalità:", IS_ONLINE_VERSION ? "ONLINE" : "OFFLINE");

/* ============================================================
   COSTANTI GLOBALI
============================================================ */

const EMOJI = {
    postazione: "📍",
    ambulanza: "🚑",
    squadra: "⛑️",
    pma: "🏥"
};

/* ============================================================
   VARIABILI GLOBALI
============================================================ */

let state = {
    boxes: [],
    scale: 1,
    mapSrc: "mappa.jpg"
};

let selectedBox = null; // box attualmente aperto nel popup

/* ============================================================
   AVVIO
============================================================ */

window.onload = () => {
    if (IS_ONLINE_VERSION) {
        loadOnlineData();
        initOnlineUI();
    } else {
        loadOfflineState();
        initOfflineUI();
    }
};
/* ============================================================
   BLOCCO 2 — MAPPA, ZOOM, CARICAMENTO IMMAGINE
============================================================ */

/* ------------------------------------------------------------
   Inizializzazione UI offline
------------------------------------------------------------ */
function initOfflineUI() {
    console.log("UI Offline pronta");

    // Carica mappa iniziale
    applyMap();

    // Eventi pulsanti aggiunta caselle
    document.getElementById("btn-add-postazione").onclick = () => addBox("postazione");
    document.getElementById("btn-add-ambulanza").onclick = () => addBox("ambulanza");
    document.getElementById("btn-add-squadra").onclick = () => addBox("squadra");
    document.getElementById("btn-add-pma").onclick = () => addBox("pma");

    // Carica mappa
    document.getElementById("btn-load-map").onclick = () => {
        document.getElementById("map-file-input").click();
    };

    document.getElementById("map-file-input").onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (ev) => {
            state.mapSrc = ev.target.result;
            applyMap();
            saveOfflineState();
        };
        reader.readAsDataURL(file);
    };

    // Zoom
    document.getElementById("zoom-range").oninput = (e) => {
        const value = parseInt(e.target.value);
        state.scale = value / 100;
        document.getElementById("zoom-value").innerText = value + "%";
        applyZoom();
        saveOfflineState();
    };

    applyZoom();
    renderSidebar();
    renderAllBoxes();
}

/* ------------------------------------------------------------
   Inizializzazione UI online
------------------------------------------------------------ */
function initOnlineUI() {
    console.log("UI Online pronta");

    applyMap();
    applyZoom(); // zoom fisso al 100% online

    renderSidebar();
    renderAllBoxes();
}

/* ------------------------------------------------------------
   Applica immagine mappa
------------------------------------------------------------ */
function applyMap() {
    const mapContainer = document.getElementById("map-container");

    // Rimuove immagine precedente
    const oldImg = document.getElementById("map-image");
    if (oldImg) oldImg.remove();

    const img = document.createElement("img");
    img.id = "map-image";
    img.src = state.mapSrc;
    img.onload = () => {
        console.log("Mappa caricata:", state.mapSrc);
    };

    mapContainer.appendChild(img);
}

/* ------------------------------------------------------------
   Applica zoom
------------------------------------------------------------ */
function applyZoom() {
    const mapContainer = document.getElementById("map-container");
    mapContainer.style.transform = `scale(${state.scale})`;
}
/* ============================================================
   BLOCCO 3 — CREAZIONE CASELLE + RENDERING
============================================================ */

/* ------------------------------------------------------------
   Aggiunge una nuova casella (solo offline)
------------------------------------------------------------ */
function addBox(type) {
    const newBox = {
        id: crypto.randomUUID(),
        type: type,
        title: generateDefaultTitle(type),
        x: 100,
        y: 100,
        stato: "none", // none | standby | intervento | supporto
        radio: "",
        sanitario: "",
        membri: [],
        note: "",
        ambulanze: [],
        squadre: []
    };

    state.boxes.push(newBox);
    renderBox(newBox);
    renderSidebar();
    saveOfflineState();

    openPopup(newBox.id);
}

/* ------------------------------------------------------------
   Titoli predefiniti
------------------------------------------------------------ */
function generateDefaultTitle(type) {
    switch (type) {
        case "postazione": return "Nuova Postazione";
        case "ambulanza": return "Nuova Ambulanza";
        case "squadra": return "Nuova Squadra";
        case "pma": return "Nuovo PMA";
    }
}

/* ------------------------------------------------------------
   Renderizza tutte le caselle (usato al caricamento)
------------------------------------------------------------ */
function renderAllBoxes() {
    const map = document.getElementById("map-container");
    map.querySelectorAll(".box").forEach(b => b.remove());

    state.boxes.forEach(box => renderBox(box));
}

/* ------------------------------------------------------------
   Renderizza una singola casella sulla mappa
------------------------------------------------------------ */
function renderBox(box) {
    const map = document.getElementById("map-container");

    // Se esiste già, rimuovila
    const old = document.getElementById("box-" + box.id);
    if (old) old.remove();

    const div = document.createElement("div");
    div.className = "box";
    div.id = "box-" + box.id;

    // Colore in base allo stato
    if (box.stato === "standby") div.classList.add("yellow");
    if (box.stato === "supporto") div.classList.add("orange");
    if (box.stato === "intervento") div.classList.add("red");

    div.style.left = box.x + "px";
    div.style.top = box.y + "px";

    div.innerHTML = `
        <div class="box-header">${EMOJI[box.type]} ${box.title}</div>
    `;

    // Doppio click → popup
    div.ondblclick = () => openPopup(box.id);

    // Drag solo offline
    if (!IS_ONLINE_VERSION) enableDrag(div, box);

    map.appendChild(div);
}

/* ------------------------------------------------------------
   Drag & drop (solo offline)
------------------------------------------------------------ */
function enableDrag(div, box) {
    let offsetX = 0;
    let offsetY = 0;
    let dragging = false;

    div.onmousedown = (e) => {
        dragging = true;
        offsetX = e.clientX - div.offsetLeft;
        offsetY = e.clientY - div.offsetTop;
    };

    window.onmousemove = (e) => {
        if (!dragging) return;
        box.x = e.clientX - offsetX;
        box.y = e.clientY - offsetY;
        div.style.left = box.x + "px";
        div.style.top = box.y + "px";
    };

    window.onmouseup = () => {
        if (dragging) {
            dragging = false;
            saveOfflineState();
        }
    };
}
/* ============================================================
   BLOCCO 4 — POPUP UNIFICATO (OFFLINE + ONLINE)
============================================================ */

/* ------------------------------------------------------------
   Apre popup per una casella
------------------------------------------------------------ */
function openPopup(id) {
    selectedBox = state.boxes.find(b => b.id === id);
    if (!selectedBox) return;

    document.getElementById("popup").style.display = "flex";

    buildPopupContent(selectedBox);
    configurePopupFooter(selectedBox);
}

/* ------------------------------------------------------------
   Chiude popup
------------------------------------------------------------ */
function closePopup() {
    document.getElementById("popup").style.display = "none";
    selectedBox = null;
}

document.getElementById("popup-close").onclick = closePopup;

/* ------------------------------------------------------------
   Costruisce contenuto popup (campi dinamici)
------------------------------------------------------------ */
function buildPopupContent(box) {
    const content = document.getElementById("popup-content");
    const title = document.getElementById("popup-title");

    title.innerHTML = `${EMOJI[box.type]} ${box.title}`;

    // ONLINE → tutto readonly
    const readonly = IS_ONLINE_VERSION;

    let html = "";

    /* ------------------------------
       CAMPO TITOLO
    ------------------------------ */
    html += `
        <div class="popup-section">
            <div class="popup-section-title">Nome</div>
            ${readonly
                ? `<div class="popup-readonly">${box.title}</div>`
                : `<input id="popup-title-input" value="${box.title}">`
            }
        </div>
    `;

    /* ------------------------------
       AMBULANZA / SQUADRA
    ------------------------------ */
    if (box.type === "ambulanza" || box.type === "squadra") {

        html += `
            <div class="popup-section">
                <div class="popup-section-title">Radio</div>
                ${readonly
                    ? `<div class="popup-readonly">${box.radio || "-"}</div>`
                    : `<input id="popup-radio-input" value="${box.radio}">`
                }
            </div>

            <div class="popup-section">
                <div class="popup-section-title">Sanitario</div>
                ${readonly
                    ? `<div class="popup-readonly">${box.sanitario || "-"}</div>`
                    : `<input id="popup-sanitario-input" value="${box.sanitario}">`
                }
            </div>

            <div class="popup-section">
                <div class="popup-section-title">Membri</div>
                ${readonly
                    ? `<div class="popup-readonly-list">${box.membri.map(m => `<div>${m}</div>`).join("") || "-"}</div>`
                    : `<textarea id="popup-membri-input" placeholder="Un membro per riga">${box.membri.join("\n")}</textarea>`
                }
            </div>
        `;
    }

    /* ------------------------------
       POSTAZIONE
    ------------------------------ */
    if (box.type === "postazione") {
        html += `
            <div class="popup-section">
                <div class="popup-section-title">Ambulanze presenti</div>
                <div class="popup-readonly-list">
                    ${box.ambulanze.map(a => `<div>🚑 ${a}</div>`).join("") || "-"}
                </div>
            </div>

            <div class="popup-section">
                <div class="popup-section-title">Squadre presenti</div>
                <div class="popup-readonly-list">
                    ${box.squadre.map(s => `<div>⛑️ ${s}</div>`).join("") || "-"}
                </div>
            </div>
        `;
    }

    /* ------------------------------
       PMA
    ------------------------------ */
    if (box.type === "pma") {
        html += `
            <div class="popup-section">
                <div class="popup-section-title">Note PMA</div>
                ${readonly
                    ? `<div class="popup-readonly">${box.note || "-"}</div>`
                    : `<textarea id="popup-note-input">${box.note}</textarea>`
                }
            </div>
        `;
    }

    /* ------------------------------
       NOTE GENERALI (solo amb/squadra)
    ------------------------------ */
    if (box.type === "ambulanza" || box.type === "squadra") {
        html += `
            <div class="popup-section">
                <div class="popup-section-title">Note</div>
                ${readonly
                    ? `<div class="popup-readonly">${box.note || "-"}</div>`
                    : `<textarea id="popup-note-input">${box.note}</textarea>`
                }
            </div>
        `;
    }

    content.innerHTML = html;
}

/* ------------------------------------------------------------
   Configura footer popup (bottoni)
------------------------------------------------------------ */
function configurePopupFooter(box) {
    const footer = document.getElementById("popup-footer");

    if (IS_ONLINE_VERSION) {
        footer.style.display = "none";
        return;
    }

    footer.style.display = "flex";

    const btnSave = document.getElementById("popup-save-btn");
    const btnStandby = document.getElementById("popup-standby-btn");
    const btnIntervento = document.getElementById("popup-end-intervento-btn");
    const btnSupporto = document.getElementById("popup-end-supporto-btn");
    const btnRemove = document.getElementById("popup-remove-btn");

    // Reset visibilità
    btnStandby.style.display =
    btnIntervento.style.display =
    btnSupporto.style.display =
    btnRemove.style.display = "none";

    // AMBULANZA / SQUADRA → footer completo
    if (box.type === "ambulanza" || box.type === "squadra") {
        btnStandby.style.display = "inline-block";
        btnIntervento.style.display = "inline-block";
        btnSupporto.style.display = "inline-block";
        btnRemove.style.display = "inline-block";
    }

    // POSTAZIONE / PMA → solo SALVA
    // (già gestito nascondendo gli altri)

    /* ------------------------------
       EVENTI BOTTONI
    ------------------------------ */
    btnSave.onclick = () => savePopup(box);
    btnStandby.onclick = () => changeState(box, "standby");
    btnIntervento.onclick = () => changeState(box, "intervento");
    btnSupporto.onclick = () => changeState(box, "supporto");
    btnRemove.onclick = () => removeBox(box);
}

/* ------------------------------------------------------------
   Salva popup (solo offline)
------------------------------------------------------------ */
function savePopup(box) {
    if (IS_ONLINE_VERSION) return;

    const titleInput = document.getElementById("popup-title-input");
    if (titleInput) box.title = titleInput.value;

    const radioInput = document.getElementById("popup-radio-input");
    if (radioInput) box.radio = radioInput.value;

    const sanitarioInput = document.getElementById("popup-sanitario-input");
    if (sanitarioInput) box.sanitario = sanitarioInput.value;

    const membriInput = document.getElementById("popup-membri-input");
    if (membriInput) box.membri = membriInput.value.split("\n").filter(x => x.trim() !== "");

    const noteInput = document.getElementById("popup-note-input");
    if (noteInput) box.note = noteInput.value;

    saveOfflineState();
    renderBox(box);
    renderSidebar();
    closePopup();
}

/* ------------------------------------------------------------
   Cambia stato (solo amb/squadra)
------------------------------------------------------------ */
function changeState(box, stato) {
    box.stato = stato;
    saveOfflineState();
    renderBox(box);
    renderSidebar();
    closePopup();
}

/* ------------------------------------------------------------
   Rimuove casella
------------------------------------------------------------ */
function removeBox(box) {
    state.boxes = state.boxes.filter(b => b.id !== box.id);
    saveOfflineState();
    renderAllBoxes();
    renderSidebar();
    closePopup();
}
/* ============================================================
   BLOCCO 5 — SIDEBAR
============================================================ */

/* ------------------------------------------------------------
   Render principale sidebar
------------------------------------------------------------ */
function renderSidebar() {
    const container = document.getElementById("sidebar-content");
    container.innerHTML = "";

    // Ordine categorie
    renderCategory(container, "pma", "PMA");
    renderCategory(container, "postazione", "Postazioni");
    renderCategory(container, "ambulanza", "Ambulanze");
    renderCategory(container, "squadra", "Squadre");
}

/* ------------------------------------------------------------
   Render categoria (PMA, Postazioni, Ambulanze, Squadre)
------------------------------------------------------------ */
function renderCategory(container, type, label) {
    const items = state.boxes.filter(b => b.type === type);

    if (items.length === 0) return;

    const title = document.createElement("div");
    title.className = "sidebar-category-title";
    title.innerText = `${label} (${items.length})`;
    container.appendChild(title);

    const categoryDiv = document.createElement("div");
    categoryDiv.className = "sidebar-category";

    items.forEach(box => {
        categoryDiv.appendChild(renderSidebarUnit(box));
    });

    container.appendChild(categoryDiv);
}

/* ------------------------------------------------------------
   Render singola unità nella sidebar
------------------------------------------------------------ */
function renderSidebarUnit(box) {
    const div = document.createElement("div");
    div.className = "sidebar-unit";

    // Colore coerente con la casella
    if (box.stato === "standby") div.classList.add("yellow");
    if (box.stato === "supporto") div.classList.add("orange");
    if (box.stato === "intervento") div.classList.add("red");

    /* ------------------------------
       TITOLO
    ------------------------------ */
    const title = document.createElement("div");
    title.className = "sidebar-unit-title";
    title.innerText = `${EMOJI[box.type]} ${box.title}`;
    div.appendChild(title);

    /* ------------------------------
       INFO SPECIFICHE PER TIPO
    ------------------------------ */

    // AMBULANZA / SQUADRA
    if (box.type === "ambulanza" || box.type === "squadra") {
        addLine(div, `Stato: ${formatStato(box.stato)}`);
        addLine(div, `Radio: ${box.radio || "-"}`);
        addLine(div, `Sanitario: ${box.sanitario || "-"}`);

        if (box.membri.length > 0) {
            addLine(div, "Membri:");
            box.membri.forEach(m => addSubLine(div, m));
        }

        if (box.note) {
            addLine(div, "Note:");
            addSubLine(div, box.note);
        }
    }

    // POSTAZIONE
    if (box.type === "postazione") {
        addLine(div, "Ambulanze:");
        if (box.ambulanze.length === 0) addSubLine(div, "-");
        box.ambulanze.forEach(a => addSubLine(div, `🚑 ${a}`));

        addLine(div, "Squadre:");
        if (box.squadre.length === 0) addSubLine(div, "-");
        box.squadre.forEach(s => addSubLine(div, `⛑️ ${s}`));
    }

    // PMA
    if (box.type === "pma") {
        addLine(div, "Note:");
        addSubLine(div, box.note || "-");
    }

    /* ------------------------------
       Interazione
    ------------------------------ */
    div.ondblclick = () => openPopup(box.id);

    return div;
}

/* ------------------------------------------------------------
   Helpers per righe sidebar
------------------------------------------------------------ */
function addLine(parent, text) {
    const line = document.createElement("div");
    line.className = "sidebar-unit-line";
    line.innerText = text;
    parent.appendChild(line);
}

function addSubLine(parent, text) {
    const line = document.createElement("div");
    line.className = "sidebar-unit-subline";
    line.innerText = text;
    parent.appendChild(line);
}

/* ------------------------------------------------------------
   Formattazione stato
------------------------------------------------------------ */
function formatStato(s) {
    if (s === "standby") return "Standby";
    if (s === "intervento") return "Intervento";
    if (s === "supporto") return "Supporto";
    return "-";
}
/* ============================================================
   BLOCCO 6 — SALVATAGGIO / CARICAMENTO / SYNC AUTOMATICO
============================================================ */

/* ------------------------------------------------------------
   SALVATAGGIO OFFLINE
------------------------------------------------------------ */
function saveOfflineState() {
    if (IS_ONLINE_VERSION) return;

    localStorage.setItem("mappa_state", JSON.stringify(state));

    updateSyncStatus("yellow", "In attesa di sincronizzazione…");

    debounceSync();
}

/* ------------------------------------------------------------
   CARICAMENTO OFFLINE
------------------------------------------------------------ */
function loadOfflineState() {
    const saved = localStorage.getItem("mappa_state");
    if (saved) {
        state = JSON.parse(saved);
    }
}

/* ------------------------------------------------------------
   CARICAMENTO ONLINE (data.json)
------------------------------------------------------------ */
async function loadOnlineData() {
    try {
        const res = await fetch("data.json?cache=" + Date.now());
        const json = await res.json();
        state = json;

        updateSyncStatus("green", "Ultimo aggiornamento: " + getTime());
    } catch (err) {
        console.error("Errore caricamento online:", err);
        updateSyncStatus("red", "Errore caricamento dati");
    }
}

/* ============================================================
   SYNC AUTOMATICO GITHUB (OFFLINE)
============================================================ */

let syncTimer = null;

function debounceSync() {
    if (syncTimer) clearTimeout(syncTimer);
    syncTimer = setTimeout(() => {
        performSync();
    }, 1500);
}

/* ------------------------------------------------------------
   Esegue sync automatico
------------------------------------------------------------ */
async function performSync() {
    const repo = localStorage.getItem("repo_name");
    const token = localStorage.getItem("repo_token");

    if (!repo || !token) {
        updateSyncStatus("red", "Configura la sincronizzazione");
        return;
    }

    updateSyncStatus("yellow", "Sincronizzazione in corso…");

    try {
        const content = btoa(JSON.stringify(state, null, 2));

        const sha = await getCurrentFileSHA(repo, token);

        const res = await fetch(`https://api.github.com/repos/${repo}/contents/data.json`, {
            method: "PUT",
            headers: {
                "Authorization": `token ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: "Sync automatico mappa",
                content: content,
                sha: sha
            })
        });

        if (!res.ok) throw new Error("Errore sync");

        updateSyncStatus("green", "Sincronizzato alle " + getTime());

    } catch (err) {
        console.error("Errore sync:", err);
        updateSyncStatus("red", "Errore sincronizzazione");
    }
}

/* ------------------------------------------------------------
   Recupera SHA del file su GitHub
------------------------------------------------------------ */
async function getCurrentFileSHA(repo, token) {
    try {
        const res = await fetch(`https://api.github.com/repos/${repo}/contents/data.json`, {
            headers: { "Authorization": `token ${token}` }
        });

        if (!res.ok) return null;

        const json = await res.json();
        return json.sha;
    } catch {
        return null;
    }
}

/* ============================================================
   STATO SYNC (PALLINI)
============================================================ */
function updateSyncStatus(color, text) {
    const dot = document.getElementById("sync-dot");
    const label = document.getElementById("sync-text");

    dot.classList.remove("sync-green", "sync-yellow", "sync-red");

    if (color === "green") dot.classList.add("sync-green");
    if (color === "yellow") dot.classList.add("sync-yellow");
    if (color === "red") dot.classList.add("sync-red");

    label.innerText = text;
}

function getTime() {
    const d = new Date();
    return d.toLocaleTimeString("it-IT", { hour12: false });
}

/* ============================================================
   POPUP IMPOSTAZIONI (repo + token)
============================================================ */

document.getElementById("settings-btn")?.addEventListener("click", () => {
    document.getElementById("settings-modal").style.display = "flex";

    document.getElementById("settings-repo").value =
        localStorage.getItem("repo_name") || "";

    document.getElementById("settings-token").value =
        localStorage.getItem("repo_token") || "";
});

document.getElementById("settings-close")?.addEventListener("click", () => {
    document.getElementById("settings-modal").style.display = "none";
});

document.getElementById("settings-save-btn")?.addEventListener("click", () => {
    const repo = document.getElementById("settings-repo").value.trim();
    const token = document.getElementById("settings-token").value.trim();

    localStorage.setItem("repo_name", repo);
    localStorage.setItem("repo_token", token);

    document.getElementById("settings-modal").style.display = "none";

    updateSyncStatus("yellow", "In attesa di sincronizzazione…");
    debounceSync();
});
/* ============================================================
   BLOCCO 7 — UTILITY FINALI
============================================================ */

/* ------------------------------------------------------------
   UTF‑8 → Base64 sicuro per GitHub
------------------------------------------------------------ */
function utf8ToBase64(str) {
    return btoa(unescape(encodeURIComponent(str)));
}

/* ------------------------------------------------------------
   Base64 → UTF‑8 (non usato spesso ma utile)
------------------------------------------------------------ */
function base64ToUtf8(str) {
    return decodeURIComponent(escape(atob(str)));
}

/* ------------------------------------------------------------
   Safe JSON stringify
------------------------------------------------------------ */
function safeJSONString(obj) {
    try {
        return JSON.stringify(obj, null, 2);
    } catch (e) {
        console.error("Errore stringify JSON:", e);
        return "{}";
    }
}
/* ============================================================
   BLOCCO 8 — INIZIALIZZAZIONE FINALE
============================================================ */

/* ------------------------------------------------------------
   Chiudi popup con ESC
------------------------------------------------------------ */
window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closePopup();
});

/* ------------------------------------------------------------
   Evita che la mappa trascini il browser
------------------------------------------------------------ */
document.getElementById("map-wrapper").addEventListener("mousedown", (e) => {
    e.preventDefault();
});

/* ------------------------------------------------------------
   Rerender dopo caricamento immagine mappa
------------------------------------------------------------ */
document.addEventListener("DOMContentLoaded", () => {
    const img = document.getElementById("map-image");
    if (img) {
        img.onload = () => {
            renderAllBoxes();
        };
    }
});
