/* ============================================================
   CONFIGURAZIONE ONLINE
============================================================ */

const IS_ONLINE_VERSION = true;
const MAP_FILENAME = "map.image";

/* ============================================================
   STATO E COSTANTI
============================================================ */

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

const INTERVENTO_OPTIONS = [
    "IN CORSO",
    "VALUTAZIONE TRASPORTO",
    "PMA",
    "PS"
];

const SUPPORTO_OPTIONS = [
    "PAPA",
    "ABZ",
    "FO",
    "VVF",
    "PC"
];

const ROLES_AMBULANZA = [
    "Team Leader",
    "Soccorritore",
    "Navigatore",
    "TLC",
    "Autista"
];

const ROLES_SQUADRA = [
    "Team Leader",
    "Soccorritore",
    "Navigatore",
    "TLC",
    "Resp. Zaino"
];

/* ============================================================
   CARICAMENTO MAPPA ESTERNA
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
        } catch (e) {
            console.warn("Impossibile salvare la mappa in localStorage (dimensione troppo grande).");
        }
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
   CREAZIONE BOX
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
        if (confirm("Sei sicuro di voler rimuovere questa unità?")) {
            box.remove();
            saveState();
            updateSidebar();
        }
    };
    header.appendChild(removeBtn);

    box.appendChild(header);

    box.onpointerdown = e => startDrag(e, box);

    container.appendChild(box);
    saveState();
    updateSidebar();
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
   FIX: SALVA INPUT PRIMA DI RICOSTRUIRE POPUP
============================================================ */

function syncPopupInputsToData(data) {
    const nameInput = document.getElementById("popup-name");
    if (nameInput) data.name = nameInput.value.trim();

    const lockInput = document.getElementById("popup-locked");
    if (lockInput) data.locked = lockInput.checked;

    const noteInput = document.getElementById("popup-note");
    if (noteInput) data.note = noteInput.value.trim();

    const intChecks = [...document.querySelectorAll(".popup-intervento")];
    if (intChecks.length) {
        data.interventi = intChecks.filter(c => c.checked).map(c => c.value);
    }

    const supChecks = [...document.querySelectorAll(".popup-supporto")];
    if (supChecks.length) {
        data.supporti = supChecks.filter(c => c.checked).map(c => c.value);
    }

    const radioInput = document.getElementById("popup-radio");
    if (radioInput) data.radio = radioInput.value.trim();

    const sanMed = document.getElementById("popup-san-med");
    if (sanMed) data.sanMed = sanMed.checked;

    const sanInf = document.getElementById("popup-san-inf");
    if (sanInf) data.sanInf = sanInf.checked;

    const sanNome = document.getElementById("popup-san-nome");
    if (sanNome) data.sanNome = sanNome.value.trim();
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
   POPUP: COSTRUZIONE CONTENUTO
============================================================ */

function buildPopupContent(data) {
    const content = document.getElementById("popup-content");
    content.innerHTML = "";

    if (data.type === "postazione") buildPopupPostazione(content, data);
    else if (data.type === "ambulanza" || data.type === "squadra") buildPopupAmbSqu(content, data);
    else if (data.type === "pma") buildPopupPMA(content, data);
}

/* ============================================================
   POPUP POSTAZIONE
============================================================ */

function buildPopupPostazione(content, data) {
    const secGen = document.createElement("div");
    secGen.className = "popup-section";

    secGen.innerHTML = `
        <div class="popup-section-title">Postazione</div>
        <div class="popup-row">
            <div class="popup-row-column">
                <label>Nome postazione</label>
                <input type="text" id="popup-name" value="${data.name}">
            </div>
            <div class="popup-row-column">
                <label>Blocca posizione</label>
                <input type="checkbox" id="popup-locked" ${data.locked ? "checked" : ""}>
            </div>
        </div>
    `;

    content.appendChild(secGen);

    const secPres = document.createElement("div");
    secPres.className = "popup-section";
    secPres.innerHTML = `<div class="popup-section-title">Unità presenti</div>`;

    const row = document.createElement("div");
    row.className = "popup-row";

    const colAmb = document.createElement("div");
    colAmb.className = "popup-row-column";
    colAmb.innerHTML = `<label>Ambulanze</label>`;

    const groupAmb = document.createElement("div");
    groupAmb.className = "popup-checkbox-group";

    getAllBoxesOfType("ambulanza").forEach(b => {
        const d = readBoxData(b);
        const id = getBoxId(b);

        const lbl = document.createElement("label");

        const chk = document.createElement("input");
        chk.type = "checkbox";
        chk.value = id;
        chk.checked = data.ambulanze.includes(id);

        chk.onchange = () => {
            if (chk.checked) {
                if (!data.ambulanze.includes(id)) data.ambulanze.push(id);
            } else {
                data.ambulanze = data.ambulanze.filter(x => x !== id);
            }
        };

        const span = document.createElement("span");
        span.innerText = d.name ? `🚑 ${d.name}` : "🚑 Ambulanza";

        lbl.appendChild(chk);
        lbl.appendChild(span);
        groupAmb.appendChild(lbl);
    });

    colAmb.appendChild(groupAmb);
    row.appendChild(colAmb);

    const colSqu = document.createElement("div");
    colSqu.className = "popup-row-column";
    colSqu.innerHTML = `<label>Squadre</label>`;

    const groupSqu = document.createElement("div");
    groupSqu.className = "popup-checkbox-group";

    getAllBoxesOfType("squadra").forEach(b => {
        const d = readBoxData(b);
        const id = getBoxId(b);

        const lbl = document.createElement("label");

        const chk = document.createElement("input");
        chk.type = "checkbox";
        chk.value = id;
        chk.checked = data.squadre.includes(id);

        chk.onchange = () => {
            if (chk.checked) {
                if (!data.squadre.includes(id)) data.squadre.push(id);
            } else {
                data.squadre = data.squadre.filter(x => x !== id);
            }
        };

        const span = document.createElement("span");
        span.innerText = d.name ? `⛑️ ${d.name}` : "⛑️ Squadra";

        lbl.appendChild(chk);
        lbl.appendChild(span);
        groupSqu.appendChild(lbl);
    });

    colSqu.appendChild(groupSqu);
    row.appendChild(colSqu);

    secPres.appendChild(row);
    content.appendChild(secPres);
}
