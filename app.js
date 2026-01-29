/* ============================================================
   VERSIONE ONLINE — SOLA LETTURA
   Nessuna modifica, nessun drag, nessun salvataggio.
   Carica tutto da data.json e mostra sidebar + popup.
============================================================ */

const IS_ONLINE_VERSION = true;

/* ============================================================
   COSTANTI
============================================================ */

const EMOJI = {
    postazione: "📍",
    ambulanza: "🚑",
    squadra: "⛑️",
    pma: "🏥"
};

/* ============================================================
   CARICAMENTO DATA.JSON
============================================================ */

async function loadOnlineData() {
    try {
        const res = await fetch("data.json?cache=" + Date.now());
        const data = await res.json();
        buildMapFromJSON(data);
    } catch (err) {
        console.error("Errore caricamento data.json", err);
    }
}

/* ============================================================
   COSTRUZIONE MAPPA DA JSON (READ ONLY)
============================================================ */

function buildMapFromJSON(state) {
    const container = document.getElementById("map-container");
    container.innerHTML = ""; // pulizia

    // Mappa fissa (mappa.jpg)
    const img = document.createElement("img");
    img.id = "map-image";
    img.src = "mappa.jpg";
    container.appendChild(img);

    // Scala (solo visualizzazione)
    const scale = state.scale || 1;
    container.style.transform = `scale(${scale})`;

    // Creazione box
    (state.boxes || []).forEach(data => {
        const box = document.createElement("div");
        box.className = "box";
        box.dataset.id = data.id;
        box.dataset.type = data.type;
        box.dataset.name = data.name || "";
        box.dataset.standby = data.standby || "false";
        box.dataset.interventi = data.interventi || "";
        box.dataset.supporti = data.supporti || "";
        box.dataset.note = data.note || "";
        box.dataset.membri = data.membri || "[]";
        box.dataset.ambulanze = data.ambulanze || "[]";
        box.dataset.squadre = data.squadre || "[]";
        box.dataset.radio = data.radio || "";
        box.dataset.sanMed = data.sanMed || "false";
        box.dataset.sanInf = data.sanInf || "false";
        box.dataset.sanNome = data.sanNome || "";

        box.style.left = data.x || "200px";
        box.style.top = data.y || "200px";

        // Header
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

        // Nessun pulsante X online
        box.appendChild(header);

        // Colore stato
        const ints = (data.interventi || "").split("|").filter(x => x);
        const sups = (data.supporti || "").split("|").filter(x => x);

        if (data.standby === "true") box.classList.add("yellow");
        else if (ints.length > 0) box.classList.add("red");
        else if (sups.length > 0) box.classList.add("orange");

        // Apertura popup (sola lettura)
        box.ondblclick = () => openPopup(box);

        container.appendChild(box);
    });

    updateSidebar();
}
/* ============================================================
   LETTURA DATI BOX (READ ONLY)
============================================================ */

function readBoxData(box) {
    let membri = [];
    try { membri = JSON.parse(box.dataset.membri || "[]"); } catch {}

    let ambulanze = [];
    let squadre = [];
    try { ambulanze = JSON.parse(box.dataset.ambulanze || "[]"); } catch {}
    try { squadre = JSON.parse(box.dataset.squadre || "[]"); } catch {}

    return {
        type: box.dataset.type,
        name: box.dataset.name || "",
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
   POPUP — APERTURA (READ ONLY)
============================================================ */

function openPopup(box) {
    const data = readBoxData(box);
    const type = data.type;

    const title = document.getElementById("popup-title");
    const label =
        type === "postazione" ? "Postazione" :
        type === "ambulanza" ? "Ambulanza" :
        type === "squadra" ? "Squadra" :
        "PMA";

    title.innerText = `${EMOJI[type]} ${label}`;

    buildPopupContent_ReadOnly(data);

    document.getElementById("popup").style.display = "block";
}

/* ============================================================
   POPUP — COSTRUZIONE CONTENUTO (READ ONLY)
============================================================ */

function buildPopupContent_ReadOnly(data) {
    const content = document.getElementById("popup-content");
    content.innerHTML = "";

    if (data.type === "postazione") buildPopupPostazione_ReadOnly(content, data);
    else if (data.type === "ambulanza" || data.type === "squadra") buildPopupAmbSqu_ReadOnly(content, data);
    else if (data.type === "pma") buildPopupPMA_ReadOnly(content, data);
}

/* ============================================================
   POPUP POSTAZIONE — READ ONLY
============================================================ */

function buildPopupPostazione_ReadOnly(content, data) {
    const secGen = document.createElement("div");
    secGen.className = "popup-section";

    secGen.innerHTML = `
        <div class="popup-section-title">Postazione</div>
        <div class="popup-row">
            <div class="popup-row-column">
                <label>Nome postazione</label>
                <div class="popup-readonly">${data.name || "-"}</div>
            </div>
        </div>
    `;
    content.appendChild(secGen);

    const secPres = document.createElement("div");
    secPres.className = "popup-section";
    secPres.innerHTML = `<div class="popup-section-title">Unità presenti</div>`;

    const row = document.createElement("div");
    row.className = "popup-row";

    /* --- AMBULANZE PRESENTI --- */
    const colAmb = document.createElement("div");
    colAmb.className = "popup-row-column";
    colAmb.innerHTML = `<label>Ambulanze</label>`;

    const listAmb = document.createElement("div");
    listAmb.className = "popup-readonly-list";

    data.ambulanze.forEach(id => {
        const b = document.querySelector(`.box[data-id="${id}"]`);
        if (!b) return;
        const d = readBoxData(b);
        const el = document.createElement("div");
        el.innerText = `🚑 ${d.name || "Ambulanza"}`;
        listAmb.appendChild(el);
    });

    if (data.ambulanze.length === 0) {
        listAmb.innerHTML = `<div class="popup-readonly">Nessuna</div>`;
    }

    colAmb.appendChild(listAmb);
    row.appendChild(colAmb);

    /* --- SQUADRE PRESENTI --- */
    const colSqu = document.createElement("div");
    colSqu.className = "popup-row-column";
    colSqu.innerHTML = `<label>Squadre</label>`;

    const listSqu = document.createElement("div");
    listSqu.className = "popup-readonly-list";

    data.squadre.forEach(id => {
        const b = document.querySelector(`.box[data-id="${id}"]`);
        if (!b) return;
        const d = readBoxData(b);
        const el = document.createElement("div");
        el.innerText = `⛑️ ${d.name || "Squadra"}`;
        listSqu.appendChild(el);
    });

    if (data.squadre.length === 0) {
        listSqu.innerHTML = `<div class="popup-readonly">Nessuna</div>`;
    }

    colSqu.appendChild(listSqu);
    row.appendChild(colSqu);

    secPres.appendChild(row);
    content.appendChild(secPres);
}
/* ============================================================
   POPUP AMBULANZA / SQUADRA — READ ONLY
============================================================ */

function buildPopupAmbSqu_ReadOnly(content, data) {
    /* --- GENERALE --- */
    const secGen = document.createElement("div");
    secGen.className = "popup-section";

    secGen.innerHTML = `
        <div class="popup-section-title">${data.type === "ambulanza" ? "Ambulanza" : "Squadra"}</div>
        <div class="popup-row">
            <div class="popup-row-column">
                <label>Nome unità</label>
                <div class="popup-readonly">${data.name || "-"}</div>
            </div>
        </div>
    `;
    content.appendChild(secGen);

    /* --- RADIO --- */
    const secRadio = document.createElement("div");
    secRadio.className = "popup-section";
    secRadio.innerHTML = `
        <div class="popup-section-title">Radio</div>
        <div class="popup-readonly">${data.radio || "-"}</div>
    `;
    content.appendChild(secRadio);

    /* --- SANITARIO --- */
    const secSan = document.createElement("div");
    secSan.className = "popup-section";

    let sanitario = "";
    if (data.sanMed) sanitario += "Medico ";
    if (data.sanInf) sanitario += "Infermiere ";
    sanitario = sanitario.trim() || "Nessun sanitario";

    if (data.sanNome) sanitario += ` — ${data.sanNome}`;

    secSan.innerHTML = `
        <div class="popup-section-title">Personale sanitario</div>
        <div class="popup-readonly">${sanitario}</div>
    `;
    content.appendChild(secSan);

    /* --- NOTE --- */
    const secNote = document.createElement("div");
    secNote.className = "popup-section";
    secNote.innerHTML = `
        <div class="popup-section-title">Note</div>
        <div class="popup-readonly">${data.note || "-"}</div>
    `;
    content.appendChild(secNote);

    /* --- MEMBRI --- */
    const secMembri = document.createElement("div");
    secMembri.className = "popup-section";
    secMembri.innerHTML = `<div class="popup-section-title">Membri / equipaggio</div>`;

    if (data.membri.length === 0) {
        secMembri.innerHTML += `<div class="popup-readonly">Nessun membro</div>`;
        content.appendChild(secMembri);
        return;
    }

    data.membri.forEach((m, idx) => {
        const mb = document.createElement("div");
        mb.className = "member-block";

        const header = document.createElement("div");
        header.className = "member-block-header";
        header.innerText = `Membro ${idx + 1}`;
        mb.appendChild(header);

        const row1 = document.createElement("div");
        row1.className = "popup-row";
        row1.innerHTML = `
            <div class="popup-row-column">
                <label>Nome e Cognome</label>
                <div class="popup-readonly">${m.nome || "-"}</div>
            </div>
            <div class="popup-row-column">
                <label>Telefono</label>
                <div class="popup-readonly">${m.telefono || "-"}</div>
            </div>
        `;
        mb.appendChild(row1);

        const row2 = document.createElement("div");
        row2.className = "popup-readonly-list";

        if (m.ruoli && m.ruoli.length > 0) {
            m.ruoli.forEach(role => {
                const el = document.createElement("div");
                el.innerText = role;
                row2.appendChild(el);
            });
        } else {
            row2.innerHTML = `<div class="popup-readonly">Nessun ruolo</div>`;
        }

        mb.appendChild(row2);
        secMembri.appendChild(mb);
    });

    content.appendChild(secMembri);

    /* --- INTERVENTO --- */
    const secInt = document.createElement("div");
    secInt.className = "popup-section";
    secInt.innerHTML = `
        <div class="popup-section-title">Intervento</div>
        <div class="popup-readonly">
            ${data.interventi.length > 0 ? data.interventi.join(", ") : "Nessuno"}
        </div>
    `;
    content.appendChild(secInt);

    /* --- SUPPORTO --- */
    const secSup = document.createElement("div");
    secSup.className = "popup-section";
    secSup.innerHTML = `
        <div class="popup-section-title">Supporto richiesto</div>
        <div class="popup-readonly">
            ${data.supporti.length > 0 ? data.supporti.join(", ") : "Nessuno"}
        </div>
    `;
    content.appendChild(secSup);
}

/* ============================================================
   POPUP PMA — READ ONLY
============================================================ */

function buildPopupPMA_ReadOnly(content, data) {
    const secGen = document.createElement("div");
    secGen.className = "popup-section";

    secGen.innerHTML = `
        <div class="popup-section-title">PMA</div>
        <div class="popup-row">
            <div class="popup-row-column">
                <label>Nome PMA</label>
                <div class="popup-readonly">${data.name || "-"}</div>
            </div>
        </div>
    `;
    content.appendChild(secGen);

    const secNote = document.createElement("div");
    secNote.className = "popup-section";
    secNote.innerHTML = `
        <div class="popup-section-title">Note</div>
        <div class="popup-readonly">${data.note || "-"}</div>
    `;
    content.appendChild(secNote);
}
/* ============================================================
   SIDEBAR COMPLETA — READ ONLY
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
        if (type && categories[type]) {
            categories[type].push(box);
        }
    });

    function createCategorySection(label, items) {
        if (!items || items.length === 0) return;

        const titleEl = document.createElement("div");
        titleEl.className = "sidebar-category-title";
        titleEl.innerText = `${label} (${items.length})`;
        sidebar.appendChild(titleEl);

        const container = document.createElement("div");
        container.className = "sidebar-category";

        items.sort((a, b) => {
            const nameA = (a.dataset.name || "").toLowerCase();
            const nameB = (b.dataset.name || "").toLowerCase();
            return nameA.localeCompare(nameB);
        });

        items.forEach(box => {
            const data = readBoxData(box);

            const unitDiv = document.createElement("div");
            unitDiv.className = "sidebar-unit";

            unitDiv.ondblclick = () => openPopup(box);

            if (data.standby) unitDiv.classList.add("yellow");
            else if (data.interventi.length > 0) unitDiv.classList.add("red");
            else if (data.supporti.length > 0) unitDiv.classList.add("orange");

            const title = document.createElement("div");
            title.className = "sidebar-unit-title";

            const baseLabel =
                data.type === "postazione" ? "Postazione" :
                data.type === "ambulanza" ? "Ambulanza" :
                data.type === "squadra" ? "Squadra" :
                "PMA";

            title.innerText = `${EMOJI[data.type]} ${data.name || baseLabel}`;
            unitDiv.appendChild(title);

            if ((data.type === "ambulanza" || data.type === "squadra") && data.standby) {
                const line = document.createElement("div");
                line.className = "sidebar-unit-line";
                line.innerHTML = "<b>Stato:</b> In Standby";
                unitDiv.appendChild(line);
            }

            if (data.interventi.length > 0) {
                const line = document.createElement("div");
                line.className = "sidebar-unit-line";
                line.innerHTML = `<b>Intervento:</b> ${data.interventi.join(", ")}`;
                unitDiv.appendChild(line);
            }

            if (data.supporti.length > 0) {
                const line = document.createElement("div");
                line.className = "sidebar-unit-line";
                line.innerHTML = `<b>Supporto:</b> ${data.supporti.join(", ")}`;
                unitDiv.appendChild(line);
            }

            if ((data.type === "ambulanza" || data.type === "squadra") && data.radio) {
                const line = document.createElement("div");
                line.className = "sidebar-unit-line";
                line.innerText = `Radio: ${data.radio}`;
                unitDiv.appendChild(line);
            }

            if (data.type === "ambulanza" || data.type === "squadra") {
                let sanitario = "";
                if (data.sanMed) sanitario += "Medico ";
                if (data.sanInf) sanitario += "Infermiere ";
                sanitario = sanitario.trim() || "Nessun sanitario";

                if (data.sanNome) sanitario += ` — ${data.sanNome}`;

                const sanLine = document.createElement("div");
                sanLine.className = "sidebar-unit-line";
                sanLine.innerText = `Sanitario: ${sanitario}`;
                unitDiv.appendChild(sanLine);
            }

            if (data.membri.length > 0) {
                const line = document.createElement("div");
                line.className = "sidebar-unit-line";

                const elenco = data.membri.map(m => {
                    const nome = m.nome || "";
                    const ruoli = m.ruoli && m.ruoli.length ? ` (${m.ruoli.join(", ")})` : "";
                    return `${nome}${ruoli}`;
                });

                line.innerText = `Membri (${data.membri.length}): ${elenco.join(", ")}`;
                unitDiv.appendChild(line);
            }

            if (data.note) {
                const line = document.createElement("div");
                line.className = "sidebar-unit-line";
                line.innerText = `Note: ${data.note}`;
                unitDiv.appendChild(line);
            }

            if (data.type === "postazione") {

                if (data.ambulanze.length > 0) {
                    const ambTitle = document.createElement("div");
                    ambTitle.className = "sidebar-unit-line";
                    ambTitle.innerText = `Ambulanze presenti (${data.ambulanze.length}):`;
                    unitDiv.appendChild(ambTitle);

                    data.ambulanze.forEach(id => {
                        const ambBox = document.querySelector(`.box[data-id="${id}"]`);
                        if (!ambBox) return;

                        const ambData = readBoxData(ambBox);
                        const ambLine = document.createElement("div");
                        ambLine.className = "sidebar-unit-subline";
                        ambLine.innerText = `- 🚑 ${ambData.name || "Ambulanza"}`;
                        unitDiv.appendChild(ambLine);
                    });
                }

                if (data.squadre.length > 0) {
                    const squTitle = document.createElement("div");
                    squTitle.className = "sidebar-unit-line";
                    squTitle.innerText = `Squadre presenti (${data.squadre.length}):`;
                    unitDiv.appendChild(squTitle);

                    data.squadre.forEach(id => {
                        const squBox = document.querySelector(`.box[data-id="${id}"]`);
                        if (!squBox) return;

                        const squData = readBoxData(squBox);
                        const squLine = document.createElement("div");
                        squLine.className = "sidebar-unit-subline";
                        squLine.innerText = `- ⛑️ ${squData.name || "Squadra"}`;
                        unitDiv.appendChild(squLine);
                    });
                }
            }

            container.appendChild(unitDiv);
        });

        sidebar.appendChild(container);
    }

    createCategorySection("PMA", categories.pma);
    createCategorySection("Postazioni", categories.postazione);
    createCategorySection("Ambulanze", categories.ambulanza);
    createCategorySection("Squadre", categories.squadra);
}
/* ============================================================
   UTILITÀ
============================================================ */

function getBoxId(box) {
    return box.dataset.id;
}

/* ============================================================
   CHIUSURA POPUP
============================================================ */

function closePopup() {
    document.getElementById("popup").style.display = "none";
}

/* ============================================================
   AVVIO VERSIONE ONLINE
============================================================ */

window.onload = () => {
    loadOnlineData();
};
