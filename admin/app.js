/* ============================================================
   CONFIGURAZIONE ADMIN
============================================================ */

const IS_ONLINE_VERSION = true;   // versione admin remota
const ADMIN_PIN = "240895";       // PIN di accesso

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
        } catch (e) {
            console.warn("Impossibile salvare la mappa in localStorage.");
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
        if (confirm("Rimuovere questa unità?")) {
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

    /* --- AMBULANZE --- */
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

    /* --- SQUADRE --- */
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

/* ============================================================
   POPUP AMBULANZA / SQUADRA
============================================================ */

function buildPopupAmbSqu(content, data) {
    const secGen = document.createElement("div");
    secGen.className = "popup-section";

    secGen.innerHTML = `
        <div class="popup-section-title">${data.type === "ambulanza" ? "Ambulanza" : "Squadra"}</div>
        <div class="popup-row">
            <div class="popup-row-column">
                <label>Nome unità</label>
                <input type="text" id="popup-name" value="${data.name}">
            </div>
            <div class="popup-row-column">
                <label>Blocca posizione</label>
                <input type="checkbox" id="popup-locked" ${data.locked ? "checked" : ""}>
            </div>
        </div>
    `;
    content.appendChild(secGen);

    /* --- RADIO --- */
    const secRadio = document.createElement("div");
    secRadio.className = "popup-section";
    secRadio.innerHTML = `
        <div class="popup-section-title">Radio</div>
        <input type="text" id="popup-radio" value="${data.radio || ""}">
    `;
    content.appendChild(secRadio);

    /* --- SANITARIO --- */
    const secSan = document.createElement("div");
    secSan.className = "popup-section";
    secSan.innerHTML = `
        <div class="popup-section-title">Personale sanitario</div>
        <label><input type="checkbox" id="popup-san-med" ${data.sanMed ? "checked" : ""}> Medico</label>
        <label><input type="checkbox" id="popup-san-inf" ${data.sanInf ? "checked" : ""}> Infermiere</label>
        <input type="text" id="popup-san-nome" placeholder="Nome sanitario" value="${data.sanNome || ""}">
    `;
    content.appendChild(secSan);

    /* --- NOTE --- */
    const secNote = document.createElement("div");
    secNote.className = "popup-section";
    secNote.innerHTML = `
        <div class="popup-section-title">Note</div>
        <textarea id="popup-note" style="height:60px;">${data.note}</textarea>
    `;
    content.appendChild(secNote);

    /* --- MEMBRI / EQUIPAGGIO --- */
    const secMembri = document.createElement("div");
    secMembri.className = "popup-section";
    secMembri.innerHTML = `<div class="popup-section-title">Membri / equipaggio</div>`;

    const btnAdd = document.createElement("button");
    btnAdd.innerText = "Aggiungi membro";
    btnAdd.onclick = () => {
        syncPopupInputsToData(data);
        data.membri.push({ nome: "", ruoli: [], telefono: "" });
        buildPopupContent(data);
    };
    secMembri.appendChild(btnAdd);

    const contMembri = document.createElement("div");
    contMembri.style.marginTop = "6px";

    data.membri.forEach((m, idx) => {
        const mb = document.createElement("div");
        mb.className = "member-block";

        const header = document.createElement("div");
        header.className = "member-block-header";
        header.innerText = `Membro ${idx + 1}`;

        const rm = document.createElement("button");
        rm.className = "member-remove-btn";
        rm.innerText = "Rimuovi";
        rm.onclick = () => {
            syncPopupInputsToData(data);
            data.membri.splice(idx, 1);
            buildPopupContent(data);
        };
        header.appendChild(rm);
        mb.appendChild(header);

        const row1 = document.createElement("div");
        row1.className = "popup-row";
        row1.innerHTML = `
            <div class="popup-row-column">
                <label>Nome e Cognome</label>
                <input type="text" value="${m.nome}" 
                       oninput="currentBoxData.membri[${idx}].nome=this.value">
            </div>
            <div class="popup-row-column">
                <label>Telefono</label>
                <input type="text" value="${m.telefono}" 
                       oninput="currentBoxData.membri[${idx}].telefono=this.value">
            </div>
        `;
        mb.appendChild(row1);

        const row2 = document.createElement("div");
        row2.className = "popup-checkbox-group";

        const roles = data.type === "ambulanza" ? ROLES_AMBULANZA : ROLES_SQUADRA;

        roles.forEach(role => {
            const lbl = document.createElement("label");
            const chk = document.createElement("input");

            chk.type = "checkbox";
            chk.value = role;
            chk.checked = m.ruoli.includes(role);

            chk.onchange = () => {
                if (chk.checked) m.ruoli.push(role);
                else m.ruoli = m.ruoli.filter(r => r !== role);
            };

            lbl.appendChild(chk);
            lbl.appendChild(document.createTextNode(role));
            row2.appendChild(lbl);
        });

        mb.appendChild(row2);
        contMembri.appendChild(mb);
    });

    secMembri.appendChild(contMembri);
    content.appendChild(secMembri);

    /* --- INTERVENTO --- */
    const secInt = document.createElement("div");
    secInt.className = "popup-section";
    secInt.innerHTML = `<div class="popup-section-title">Intervento</div>`;

    const groupInt = document.createElement("div");
    groupInt.className = "popup-checkbox-group";

    INTERVENTO_OPTIONS.forEach(opt => {
        const lbl = document.createElement("label");
        const chk = document.createElement("input");

        chk.type = "checkbox";
        chk.value = opt;
        chk.className = "popup-intervento";
        chk.checked = data.interventi.includes(opt);

        if (data.standby) chk.disabled = true;

        lbl.appendChild(chk);
        lbl.appendChild(document.createTextNode(opt));
        groupInt.appendChild(lbl);
    });

    secInt.appendChild(groupInt);
    content.appendChild(secInt);

    /* --- SUPPORTO --- */
    const secSup = document.createElement("div");
    secSup.className = "popup-section";
    secSup.innerHTML = `<div class="popup-section-title">Supporto richiesto</div>`;

    const groupSup = document.createElement("div");
    groupSup.className = "popup-checkbox-group";

    SUPPORTO_OPTIONS.forEach(opt => {
        const lbl = document.createElement("label");
        const chk = document.createElement("input");

        chk.type = "checkbox";
        chk.value = opt;
        chk.className = "popup-supporto";
        chk.checked = data.supporti.includes(opt);

        if (data.standby) chk.disabled = true;

        lbl.appendChild(chk);
        lbl.appendChild(document.createTextNode(opt));
        groupSup.appendChild(lbl);
    });

    secSup.appendChild(groupSup);
    content.appendChild(secSup);
}

/* ============================================================
   POPUP PMA
============================================================ */

function buildPopupPMA(content, data) {
    const secGen = document.createElement("div");
    secGen.className = "popup-section";

    secGen.innerHTML = `
        <div class="popup-section-title">PMA</div>
        <div class="popup-row">
            <div class="popup-row-column">
                <label>Nome PMA</label>
                <input type="text" id="popup-name" value="${data.name}">
            </div>
            <div class="popup-row-column">
                <label>Blocca posizione</label>
                <input type="checkbox" id="popup-locked" ${data.locked ? "checked" : ""}>
            </div>
        </div>
    `;

    content.appendChild(secGen);

    const secNote = document.createElement("div");
    secNote.className = "popup-section";
    secNote.innerHTML = `
        <div class="popup-section-title">Note</div>
        <textarea id="popup-note" style="height:60px;">${data.note}</textarea>
    `;
    content.appendChild(secNote);
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
    updateSidebar();
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
    updateSidebar();
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
    updateSidebar();
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

    if (type === "postazione") {
        // ambulanze/squadre già aggiornate via onchange
    }

    if (type === "pma") {
        const note = document.getElementById("popup-note");
        currentBoxData.note = note ? note.value.trim() : "";
    }

    writeBoxData(currentBox, currentBoxData);
    refreshBoxVisual(currentBox, currentBoxData);
    saveState();
    updateSidebar();
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
    updateSidebar();
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
   CARICAMENTO STATO AL REFRESH
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
                updateSidebar();
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
    updateSidebar();
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
   AVVIO
============================================================ */

window.onload = () => {
    // il login gestisce il resto
};
