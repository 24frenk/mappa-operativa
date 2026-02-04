/* ============================================================
   CONFIGURAZIONE ADMIN
============================================================ */

const IS_ONLINE_VERSION = true;
const ADMIN_PIN = "240895";

let scale = 1;
let mapLocked = false;
let currentBox = null;
let currentBoxData = null;

const EMOJI = {
    postazione: "📍",
    ambulanza: "🚑",
    squadra: "⛑️",
    pma: "🏥"
};

/* ============================================================
   LOGIN ADMIN
============================================================ */

function checkPIN() {
    const input = document.getElementById("admin-pin").value.trim();
    const error = document.getElementById("login-error");

    if (input === ADMIN_PIN) {
        document.getElementById("login-screen").style.display = "none";
        document.getElementById("top-bar").style.display = "flex";
        document.getElementById("main").style.display = "flex";

        loadState();
        loadFromGitHub();
    } else {
        error.innerText = "PIN errato";
    }
}

/* ============================================================
   CARICAMENTO MAPPA
============================================================ */

document.getElementById("mapLoader").addEventListener("change", function (e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (ev) {
        const dataURL = ev.target.result;
        document.getElementById("map-image").src = dataURL;

        try {
            localStorage.setItem("mapImage", dataURL);
        } catch (e) {}
    };
    reader.readAsDataURL(file);
});

/* ============================================================
   SCALA MAPPA E LOCK
============================================================ */

function toggleMapLock() {
    mapLocked = !mapLocked;
    document.getElementById("mapScale").disabled = mapLocked;
    document.getElementById("lockMapBtn").innerText = mapLocked ? "Sblocca mappa" : "Blocca mappa";
    saveState();
}

document.getElementById("mapScale").addEventListener("input", e => {
    scale = e.target.value / 100;
    document.getElementById("map-container").style.transform = `scale(${scale})`;
    saveState();
});

/* ============================================================
   CREAZIONE BOX (ripulito)
============================================================ */

function addBox(type) {
    const container = document.getElementById("map-container");

    const box = document.createElement("div");
    box.className = "box";
    box.dataset.type = type;
    box.dataset.locked = "false";
    box.dataset.standby = "false";

    box.dataset.name = "";
    box.dataset.interventi = "";
    box.dataset.supporti = "";
    box.dataset.note = "";
    box.dataset.membri = "[]";

    box.dataset.radio = "";
    box.dataset.sanMed = "false";
    box.dataset.sanInf = "false";
    box.dataset.sanNome = "";

    if (type === "postazione") {
        box.dataset.ambulanze = "[]";
        box.dataset.squadre = "[]";
    }

    box.style.left = "200px";
    box.style.top = "200px";

    box.ondblclick = e => {
        if (e.target.classList.contains("remove-btn")) return;
        openPopup(box);
    };

    const header = document.createElement("div");
    header.className = "box-header";

    const title = document.createElement("div");
    title.className = "box-title";
    title.innerText = `${EMOJI[type]} ${type.toUpperCase()}`;
    header.appendChild(title);

    const removeBtn = document.createElement("button");
    removeBtn.className = "remove-btn";
    removeBtn.innerText = "X";
    removeBtn.onclick = ev => {
        ev.stopPropagation();
        if (confirm("Rimuovere questa unità?")) {
            box.remove();
            saveState();
        }
    };
    header.appendChild(removeBtn);

    box.appendChild(header);

    box.onpointerdown = e => startDrag(e, box);

    container.appendChild(box);
    saveState();
}

/* ============================================================
   DRAG BOX
============================================================ */

function startDrag(e, box) {
    if (mapLocked || box.dataset.locked === "true") return;
    if (e.target.classList.contains("remove-btn")) return;

    e.preventDefault();

    let startX = e.clientX;
    let startY = e.clientY;
    let origX = parseInt(box.style.left) || 0;
    let origY = parseInt(box.style.top) || 0;

    function move(ev) {
        ev.preventDefault();
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;

        box.style.left = origX + dx + "px";
        box.style.top = origY + dy + "px";
    }

    function stop() {
        document.removeEventListener("pointermove", move);
        document.removeEventListener("pointerup", stop);
        saveState();
    }

    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", stop);
}

/* ============================================================
   POPUP: LETTURA DATI
============================================================ */

function readBoxData(box) {
    let membri = [];
    try { membri = JSON.parse(box.dataset.membri || "[]"); } catch {}

    let ambulanze = [];
    let squadre = [];
    if (box.dataset.type === "postazione") {
        try { ambulanze = JSON.parse(box.dataset.ambulanze || "[]"); } catch {}
        try { squadre = JSON.parse(box.dataset.squadre || "[]"); } catch {}
    }

    return {
        type: box.dataset.type,
        name: box.dataset.name || "",
        locked: box.dataset.locked === "true",
        standby: box.dataset.standby === "true",
        interventi: (box.dataset.interventi || "").split("|").filter(x => x),
        supporti: (box.dataset.supporti || "").split("|").filter(x => x),
        note: box.dataset.note || "",
        membri,
        ambulanze,
        squadre,
        radio: box.dataset.radio || "",
        sanMed: box.dataset.sanMed === "true",
        sanInf: box.dataset.sanInf === "true",
        sanNome: box.dataset.sanNome || ""
    };
}

/* ============================================================
   POPUP: SCRITTURA DATI
============================================================ */

function writeBoxData(box, data) {
    box.dataset.name = data.name || "";
    box.dataset.locked = data.locked ? "true" : "false";
    box.dataset.standby = data.standby ? "true" : "false";

    box.dataset.interventi = (data.interventi || []).join("|");
    box.dataset.supporti = (data.supporti || []).join("|");
    box.dataset.note = data.note || "";
    box.dataset.membri = JSON.stringify(data.membri || []);

    if (data.type === "postazione") {
        box.dataset.ambulanze = JSON.stringify(data.ambulanze || []);
        box.dataset.squadre = JSON.stringify(data.squadre || []);
    }

    box.dataset.radio = data.radio || "";
    box.dataset.sanMed = data.sanMed ? "true" : "false";
    box.dataset.sanInf = data.sanInf ? "true" : "false";
    box.dataset.sanNome = data.sanNome || "";
}

/* ============================================================
   AGGIORNAMENTO CASELLA
============================================================ */

function refreshBoxVisual(box, data) {
    const titleEl = box.querySelector(".box-title");

    const baseLabel =
        data.type === "postazione" ? "Postazione" :
        data.type === "ambulanza" ? "Ambulanza" :
        data.type === "squadra" ? "Squadra" :
        "PMA";

    titleEl.innerText = `${EMOJI[data.type]} ${data.name || baseLabel}`;

    box.classList.remove("red", "orange", "yellow");

    if (data.standby) {
        box.classList.add("yellow");
        return;
    }

    if (data.interventi.length > 0) {
        box.classList.add("red");
        return;
    }

    if (data.supporti.length > 0) {
        box.classList.add("orange");
        return;
    }
}

/* ============================================================
   POPUP: APERTURA
============================================================ */

function openPopup(box) {
    currentBox = box;
    currentBoxData = readBoxData(box);

    const type = currentBoxData.type;
    const title = document.getElementById("popup-title");

    const label =
        type === "postazione" ? "Postazione" :
        type === "ambulanza" ? "Ambulanza" :
        type === "squadra" ? "Squadra" :
        "PMA";

    title.innerText = `${EMOJI[type]} ${label}`;

    buildPopupContent(currentBoxData);
    updatePopupButtons(currentBoxData);

    if (type === "postazione") {
        document.getElementById("popup-standby-btn").style.display = "none";
        document.getElementById("popup-end-intervento-btn").style.display = "none";
        document.getElementById("popup-end-supporto-btn").style.display = "none";
    } else {
        document.getElementById("popup-standby-btn").style.display = "inline-block";
        document.getElementById("popup-end-intervento-btn").style.display = "inline-block";
        document.getElementById("popup-end-supporto-btn").style.display = "inline-block";
    }

    document.getElementById("popup").style.display = "block";
}

/* ============================================================
   POPUP: AGGIORNA TESTO BOTTONI
============================================================ */

function updatePopupButtons(data) {
    const removeBtn = document.getElementById("popup-remove-btn");

    removeBtn.innerText =
        data.type === "postazione" ? "Rimuovi postazione" :
        data.type === "ambulanza" ? "Rimuovi ambulanza" :
        data.type === "squadra" ? "Rimuovi squadra" :
        "Rimuovi PMA";
}

/* ============================================================
   FUNZIONI OPERATIVE: STANDBY / INTERVENTO / SUPPORTO
============================================================ */

function toggleStandby() {
    if (!currentBox || !currentBoxData) return;

    currentBoxData.standby = !currentBoxData.standby;

    if (currentBoxData.standby) {
        currentBoxData.interventi = [];
        currentBoxData.supporti = [];
    }

    writeBoxData(currentBox, currentBoxData);
    refreshBoxVisual(currentBox, currentBoxData);
    saveState();
}

function terminaIntervento() {
    if (!currentBox || !currentBoxData) return;

    currentBoxData.interventi = [];

    document.querySelectorAll(".popup-intervento").forEach(chk => {
        chk.checked = false;
    });

    writeBoxData(currentBox, currentBoxData);
    refreshBoxVisual(currentBox, currentBoxData);
    saveState();
}

function terminaSupporto() {
    if (!currentBox || !currentBoxData) return;

    currentBoxData.supporti = [];

    document.querySelectorAll(".popup-supporto").forEach(chk => {
        chk.checked = false;
    });

    writeBoxData(currentBox, currentBoxData);
    refreshBoxVisual(currentBox, currentBoxData);
    saveState();
}

/* ============================================================
   SALVATAGGIO POPUP
============================================================ */

function savePopup() {
    if (!currentBox || !currentBoxData) return;

    const type = currentBoxData.type;

    const nameInput = document.getElementById("popup-name");
    if (nameInput) currentBoxData.name = nameInput.value.trim();

    const lockInput = document.getElementById("popup-locked");
    if (lockInput) currentBoxData.locked = lockInput.checked;

    if (type === "ambulanza" || type === "squadra") {

        const note = document.getElementById("popup-note");
        currentBoxData.note = note ? note.value.trim() : "";

        const intChecks = [...document.querySelectorAll(".popup-intervento")];
        currentBoxData.interventi = intChecks.filter(c => c.checked).map(c => c.value);

        const supChecks = [...document.querySelectorAll(".popup-supporto")];
        currentBoxData.supporti = supChecks.filter(c => c.checked).map(c => c.value);

        const radio = document.getElementById("popup-radio");
        currentBoxData.radio = radio ? radio.value.trim() : "";

        const sanMed = document.getElementById("popup-san-med");
        currentBoxData.sanMed = sanMed ? sanMed.checked : false;

        const sanInf = document.getElementById("popup-san-inf");
        currentBoxData.sanInf = sanInf ? sanInf.checked : false;

        const sanNome = document.getElementById("popup-san-nome");
        currentBoxData.sanNome = sanNome ? sanNome.value.trim() : "";
    }

    if (type === "pma") {
        const note = document.getElementById("popup-note");
        currentBoxData.note = note ? note.value.trim() : "";
    }

    writeBoxData(currentBox, currentBoxData);
    refreshBoxVisual(currentBox, currentBoxData);
    saveState();
    closePopup();
}

/* ============================================================
   RIMOZIONE UNITÀ
============================================================ */

function removeCurrentUnit() {
    if (!currentBox) return;

    if (!confirm("Sei sicuro di voler rimuovere questa unità?")) return;

    currentBox.remove();
    saveState();
    closePopup();
}

/* ============================================================
   CHIUSURA POPUP
============================================================ */

function closePopup() {
    document.getElementById("popup").style.display = "none";
    currentBox = null;
    currentBoxData = null;
}

/* ============================================================
   SALVATAGGIO STATO COMPLETO + SYNC AUTOMATICO
============================================================ */

let syncTimeout = null;
let lastSync = 0;

function saveState() {
    const boxes = [...document.querySelectorAll(".box")].map(box => ({
        id: getBoxId(box),
        type: box.dataset.type,
        name: box.dataset.name,
        locked: box.dataset.locked,
        standby: box.dataset.standby,
        interventi: box.dataset.interventi,
        supporti: box.dataset.supporti,
        note: box.dataset.note,
        membri: box.dataset.membri,
        ambulanze: box.dataset.ambulanze,
        squadre: box.dataset.squadre,
        x: box.style.left,
        y: box.style.top,

        radio: box.dataset.radio || "",
        sanMed: box.dataset.sanMed || "false",
        sanInf: box.dataset.sanInf || "false",
        sanNome: box.dataset.sanNome || ""
    }));

    localStorage.setItem("mapState_full", JSON.stringify({
        scale,
        mapLocked,
        mapImage: localStorage.mapImage || "mappa.jpg",
        lastSync: new Date().toISOString(),
        boxes: boxes
    }));

    debounceSync();
}

function showSyncStatus(msg) {
    const el = document.getElementById("sync-status");
    el.textContent = msg;
    el.style.display = "block";

    setTimeout(() => {
        el.style.display = "none";
    }, 3000);
}

function debounceSync() {
    const now = Date.now();

    if (now - lastSync > 10000) {
        lastSync = now;
        syncToGitHub();
        showSyncStatus("Sincronizzazione completata");
        return;
    }

    clearTimeout(syncTimeout);
    syncTimeout = setTimeout(() => {
        lastSync = Date.now();
        syncToGitHub();
        showSyncStatus("Sincronizzazione completata");
    }, 10000);
}

/* ============================================================
   CARICAMENTO STATO AL REFRESH (ripulito)
============================================================ */

function loadState() {
    const saved = localStorage.getItem("mapState_full");
    const savedMap = localStorage.getItem("mapImage");

    if (savedMap) {
        document.getElementById("map-image").src = savedMap;
    }

    if (!saved) {
        document.getElementById("map-container").style.transform = `scale(${scale})`;
        return;
    }

    const state = JSON.parse(saved);

    scale = state.scale || 1;
    mapLocked = !!state.mapLocked;

    document.getElementById("mapScale").value = scale * 100;
    document.getElementById("mapScale").disabled = mapLocked;
    document.getElementById("lockMapBtn").innerText = mapLocked ? "Sblocca mappa" : "Blocca mappa";

    const container = document.getElementById("map-container");

    (state.boxes || []).forEach(data => {
        const box = document.createElement("div");
        box.className = "box";
        box.dataset.id = data.id;
        box.dataset.type = data.type;
        box.dataset.name = data.name || "";
        box.dataset.locked = data.locked || "false";
        box.dataset.standby = data.standby || "false";
        box.dataset.interventi = data.interventi || "";
        box.dataset.supporti = data.supporti || "";
        box.dataset.note = data.note || "";
        box.dataset.membri = data.membri || "[]";

        box.dataset.radio = data.radio || "";
        box.dataset.sanMed = data.sanMed || "false";
        box.dataset.sanInf = data.sanInf || "false";
        box.dataset.sanNome = data.sanNome || "";

        try {
            box.dataset.ambulanze = Array.isArray(data.ambulanze)
                ? JSON.stringify(data.ambulanze)
                : data.ambulanze || "[]";
        } catch {
            box.dataset.ambulanze = "[]";
        }

        try {
            box.dataset.squadre = Array.isArray(data.squadre)
                ? JSON.stringify(data.squadre)
                : data.squadre || "[]";
        } catch {
            box.dataset.squadre = "[]";
        }

        box.style.left = data.x || "200px";
        box.style.top = data.y || "200px";

        box.ondblclick = e => {
            if (e.target.classList.contains("remove-btn")) return;
            openPopup(box);
        };

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

        const removeBtn = document.createElement("button");
        removeBtn.className = "remove-btn";
        removeBtn.innerText = "X";
        removeBtn.onclick = ev => {
            ev.stopPropagation();
            if (confirm("Rimuovere questa unità?")) {
                box.remove();
                saveState();
            }
        };
        header.appendChild(removeBtn);

        box.appendChild(header);

        const ints = (data.interventi || "").split("|").filter(x => x);
        const sups = (data.supporti || "").split("|").filter(x => x);

        if (data.standby === "true") box.classList.add("yellow");
        else if (ints.length > 0) box.classList.add("red");
        else if (sups.length > 0) box.classList.add("orange");

        box.onpointerdown = e => startDrag(e, box);

        container.appendChild(box);
    });

    document.getElementById("map-container").style.transform = `scale(${scale})`;
}

/* ============================================================
   UTILITÀ
============================================================ */

function getBoxId(box) {
    if (!box.dataset.id) {
        box.dataset.id = "box_" + Math.random().toString(36).substr(2, 9);
    }
    return box.dataset.id;
}

function getAllBoxesOfType(type) {
    return [...document.querySelectorAll(".box")].filter(b => b.dataset.type === type);
}

/* ============================================================
   SYNC GITHUB
============================================================ */

async function syncToGitHub() {
    const repo = document.getElementById("githubRepo")?.value;
    const token = document.getElementById("githubToken")?.value;

    if (!repo || !token) {
        showSyncStatus("Repo o token mancanti");
        return;
    }

    const [owner, repoName] = repo.split("/");
    const apiUrl = `https://api.github.com/repos/${owner}/${repoName}/contents/data.json`;

    const content = localStorage.getItem("mapState_full");
    const encoded = btoa(unescape(encodeURIComponent(content)));

    try {
        const getRes = await fetch(apiUrl, {
            headers: { Authorization: `token ${token}` }
        });

        let body = {
            message: "Aggiornamento mappa automatica",
            content: encoded
        };

        if (getRes.ok) {
            const data = await getRes.json();
            body.sha = data.sha;
        }

        const putRes = await fetch(apiUrl, {
            method: "PUT",
            headers: {
                Authorization: `token ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
        });

        if (putRes.ok) {
            showSyncStatus("Sincronizzazione completata");
            updateSyncUI("OK", new Date().toLocaleString());
        } else {
            showSyncStatus("Errore sincronizzazione");
            updateSyncUI("Errore", new Date().toLocaleString());
        }

    } catch (err) {
        showSyncStatus("Errore di rete");
    }
}

/* ============================================================
   POPUP IMPOSTAZIONI
============================================================ */

function openSettings() {
    document.getElementById("settings-popup").style.display = "flex";
}

function closeSettings() {
    document.getElementById("settings-popup").style.display = "none";
}

function saveGitCredentials() {
    const repo = document.getElementById("githubRepo").value.trim();
    const token = document.getElementById("githubToken").value.trim();

    localStorage.setItem("repo_name", repo);
    localStorage.setItem("repo_token", token);
}

window.addEventListener("DOMContentLoaded", () => {
    const savedRepo = localStorage.getItem("repo_name");
    const savedToken = localStorage.getItem("repo_token");

    if (savedRepo) document.getElementById("githubRepo").value = savedRepo;
    if (savedToken) document.getElementById("githubToken").value = savedToken;
});

/* ============================================================
   SYNC UI
============================================================ */

function updateSyncUI(state, text) {
    const s = document.getElementById("sync-state");
    const l = document.getElementById("sync-last");

    if (!s || !l) return;

    s.innerText = "Stato: " + state;
    l.innerText = "Ultimo aggiornamento: " + text;
}

/* ============================================================
   AVVIO — CARICAMENTO DA GITHUB (ripulito)
============================================================ */

async function loadFromGitHub() {
    const repo = localStorage.getItem("repo_name");
    const token = localStorage.getItem("repo_token");

    if (!repo) {
        console.warn("Repo GitHub non configurata");
        return;
    }

    const [owner, repoName] = repo.split("/");
    const apiUrl = `https://raw.githubusercontent.com/${owner}/${repoName}/main/data.json`;

    try {
        const res = await fetch(apiUrl);
        if (!res.ok) {
            console.warn("Impossibile scaricare data.json");
            return;
        }

        const json = await res.json();

        localStorage.setItem("mapState_full", JSON.stringify(json));

        loadState();

    } catch (err) {
        console.error("Errore caricamento GitHub:", err);
    }
}

window.onload = () => {
    // caricamento avviene dopo PIN
};
