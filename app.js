/* ============================================================
   CONFIGURAZIONE ONLINE (SOLO VISUALIZZAZIONE)
============================================================ */

const IS_ONLINE_VERSION = true;
const DATA_URL = "https://raw.githubusercontent.com/24frenk/mappa-operativa/main/data.json";

let scale = 1;
let currentState = null;
let currentBox = null;

const EMOJI = {
    postazione: "📍",
    ambulanza: "🚑",
    squadra: "⛑️",
    pma: "🏥"
};

/* ============================================================
   FUNZIONI DISATTIVATE (NO-OP)
============================================================ */

function addBox() {}
function toggleMapLock() {}
function savePopup() {}
function toggleStandby() {}
function terminaIntervento() {}
function terminaSupporto() {}
function removeCurrentUnit() {}
function saveState() {}
function syncToGitHub() {}
function loadState() {}

/* ============================================================
   UTILITY
============================================================ */

function updateSyncUI(state, text) {
    const s = document.getElementById("sync-state");
    const l = document.getElementById("sync-last");

    if (s) s.innerText = "Stato: " + state;
    if (l) l.innerText = "Ultimo aggiornamento: " + text;
}

function clearMap() {
    const container = document.getElementById("map-container");
    if (!container) return;
    [...container.querySelectorAll(".box")].forEach(b => b.remove());
}

function applyScale(newScale) {
    scale = newScale || 1;
    const mc = document.getElementById("map-container");
    if (mc) mc.style.transform = `scale(${scale})`;

    const slider = document.getElementById("mapScale");
    if (slider) slider.disabled = true;

    const lockBtn = document.getElementById("lockMapBtn");
    if (lockBtn) {
        lockBtn.disabled = true;
        lockBtn.innerText = "Mappa bloccata (solo visualizzazione)";
    }
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
        currentState = state;

        // Scala
        applyScale(state.scale || 1);

        // Mappa
        renderMapImage(state.mapImage);

        // Box
        renderBoxesFromState(state);

        // Sidebar
        updateSidebar();

        // Orario aggiornamento reale (preso dal JSON)
        const last = state.lastUpdate || "—";
        updateSyncUI("OK", last);

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

    if (!mapImage) {
        img.src = "";
        return;
    }

    // Se è un nome file, lo carichiamo dalla root del repo GitHub Pages
    if (!mapImage.startsWith("http")) {
        img.src = mapImage;
    } else {
        img.src = mapImage;
    }
}

/* ============================================================
   RENDER BOX DA STATO (data.json)
============================================================ */

function renderBoxesFromState(state) {
    const container = document.getElementById("map-container");
    if (!container) return;

    clearMap();

    (state.boxes || []).forEach(data => {
        const box = document.createElement("div");
        box.className = "box";

        // Dataset completi
        box.dataset.id = data.id;
        box.dataset.type = data.type;
        box.dataset.name = data.name || "";
        box.dataset.locked = data.locked;
        box.dataset.standby = data.standby;
        box.dataset.interventi = data.interventi;
        box.dataset.supporti = data.supporti;
        box.dataset.note = data.note;
        box.dataset.radio = data.radio;
        box.dataset.sanMed = data.sanMed;
        box.dataset.sanInf = data.sanInf;
        box.dataset.sanNome = data.sanNome;
        box.dataset.membri = data.membri;
        box.dataset.ambulanze = data.ambulanze;
        box.dataset.squadre = data.squadre;

        // Posizione
        box.style.left = data.x;
        box.style.top = data.y;

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
        box.appendChild(header);

        // Colori
        const interventi = (data.interventi || "").split("|").filter(x => x);
        const supporti = (data.supporti || "").split("|").filter(x => x);

        if (data.standby === "true") {
            box.classList.add("yellow");
        } else if (interventi.length > 0) {
            box.classList.add("red");
        } else if (supporti.length > 0) {
            box.classList.add("orange");
        }

        // Doppio click → popup read-only
        box.addEventListener("dblclick", () => openPopupReadOnly(box));

        container.appendChild(box);
    });
}
/* ============================================================
   SIDEBAR COMPLETA (VERSIONE PATCHATA)
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

            const type = box.dataset.type;
            const name = box.dataset.name || "";

            const baseLabel =
                type === "postazione" ? "Postazione" :
                type === "ambulanza" ? "Ambulanza" :
                type === "squadra" ? "Squadra" :
                "PMA";

            const title = document.createElement("div");
            title.className = "sidebar-unit-title";
            title.innerText = `${EMOJI[type]} ${name || baseLabel}`;
            div.appendChild(title);

            /* ------------------------------------------------------------
               STATO (LOGICA CORRETTA DAL DATASET)
            ------------------------------------------------------------ */
            const interventi = (box.dataset.interventi || "").split("|").filter(x => x);
            const supporti = (box.dataset.supporti || "").split("|").filter(x => x);
            const standby = box.dataset.standby === "true";

            if (standby) {
                const l = document.createElement("div");
                l.className = "sidebar-unit-line";
                l.innerHTML = "<b>Stato:</b> In standby";
                div.appendChild(l);
            }

            if (interventi.length > 0) {
                const l = document.createElement("div");
                l.className = "sidebar-unit-line";
                l.innerHTML = "<b>Intervento attivo</b>";
                div.appendChild(l);
            }

            if (supporti.length > 0) {
                const l = document.createElement("div");
                l.className = "sidebar-unit-line";
                l.innerHTML = "<b>Supporto richiesto</b>";
                div.appendChild(l);
            }

            /* ------------------------------------------------------------
               RADIO
            ------------------------------------------------------------ */
            if (box.dataset.radio) {
                const l = document.createElement("div");
                l.className = "sidebar-unit-line";
                l.innerHTML = `<b>Radio:</b> ${box.dataset.radio}`;
                div.appendChild(l);
            }

            /* ------------------------------------------------------------
               SANITARI
            ------------------------------------------------------------ */
            if (box.dataset.sanMed === "true") {
                const l = document.createElement("div");
                l.className = "sidebar-unit-line";
                l.innerHTML = "<b>Sanitario:</b> Medico";
                div.appendChild(l);
            }

            if (box.dataset.sanInf === "true") {
                const l = document.createElement("div");
                l.className = "sidebar-unit-line";
                l.innerHTML = "<b>Sanitario:</b> Infermiere";
                div.appendChild(l);
            }

            if (box.dataset.sanNome) {
                const l = document.createElement("div");
                l.className = "sidebar-unit-line";
                l.innerHTML = `<b>Nome sanitario:</b> ${box.dataset.sanNome}`;
                div.appendChild(l);
            }

            /* ------------------------------------------------------------
               MEMBRI
            ------------------------------------------------------------ */
            let membri = [];
            try { membri = JSON.parse(box.dataset.membri || "[]"); } catch {}

            if (membri.length > 0) {
                const l = document.createElement("div");
                l.className = "sidebar-unit-line";
                l.innerHTML = "<b>Membri:</b>";
                div.appendChild(l);

                membri.forEach(m => {
                    const mDiv = document.createElement("div");
                    mDiv.className = "sidebar-unit-subline";
                    mDiv.innerText = `${m.nome} (${m.ruoli.join(", ")})`;
                    div.appendChild(mDiv);
                });
            }

            /* ------------------------------------------------------------
               NOTE
            ------------------------------------------------------------ */
            if (box.dataset.note) {
                const l = document.createElement("div");
                l.className = "sidebar-unit-line";
                l.innerHTML = `<b>Note:</b> ${box.dataset.note}`;
                div.appendChild(l);
            }

            /* ------------------------------------------------------------
               POSTAZIONI → AMBULANZE / SQUADRE PRESENTI
            ------------------------------------------------------------ */
            if (type === "postazione") {
                let amb = [];
                let squ = [];

                try { amb = JSON.parse(box.dataset.ambulanze || "[]"); } catch {}
                try { squ = JSON.parse(box.dataset.squadre || "[]"); } catch {}

                if (amb.length > 0) {
                    const l = document.createElement("div");
                    l.className = "sidebar-unit-line";
                    l.innerHTML = "<b>Ambulanze presenti:</b>";
                    div.appendChild(l);

                    amb.forEach(id => {
                        const unit = document.querySelector(`[data-id="${id}"]`);
                        if (unit) {
                            const u = document.createElement("div");
                            u.className = "sidebar-unit-subline";
                            u.innerText = `🚑 ${unit.dataset.name}`;
                            div.appendChild(u);
                        }
                    });
                }

                if (squ.length > 0) {
                    const l = document.createElement("div");
                    l.className = "sidebar-unit-line";
                    l.innerHTML = "<b>Squadre presenti:</b>";
                    div.appendChild(l);

                    squ.forEach(id => {
                        const unit = document.querySelector(`[data-id="${id}"]`);
                        if (unit) {
                            const u = document.createElement("div");
                            u.className = "sidebar-unit-subline";
                            u.innerText = `⛑️ ${unit.dataset.name}`;
                            div.appendChild(u);
                        }
                    });
                }
            }

           /* ------------------------------------------------------------
               DOPPIO CLICK → POPUP READ-ONLY
            ------------------------------------------------------------ */
            div.addEventListener("dblclick", () => openPopupReadOnly(box));

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
   POPUP READ-ONLY (IDENTICO ALL’OFFLINE)
============================================================ */

function openPopupReadOnly(box) {
    currentBox = box;

    const popup = document.getElementById("popup");
    const title = document.getElementById("popup-title");
    const content = document.getElementById("popup-content");

    const type = box.dataset.type;
    const name = box.dataset.name || "";

    const baseLabel =
        type === "postazione" ? "Postazione" :
        type === "ambulanza" ? "Ambulanza" :
        type === "squadra" ? "Squadra" :
        "PMA";

    title.innerText = `${EMOJI[type]} ${name || baseLabel}`;

    content.innerHTML = "";
    buildPopupReadOnlyContent(box, content);

    popup.style.display = "block";
}

function buildPopupReadOnlyContent(box, content) {
    const type = box.dataset.type;

    addSection(content, "Informazioni Generali", () => {
        addLine(content, "<b>Nome:</b> " + (box.dataset.name || "—"));
        addLine(content, "<b>Tipo:</b> " + type.toUpperCase());
        addLine(content, "<b>Radio:</b> " + (box.dataset.radio || "—"));
    });

    /* ------------------------------------------------------------
       SANITARI
    ------------------------------------------------------------ */
    addSection(content, "Sanitari", () => {
        if (box.dataset.sanMed === "true") addLine(content, "<b>Medico presente</b>");
        if (box.dataset.sanInf === "true") addLine(content, "<b>Infermiere presente</b>");
        if (box.dataset.sanNome) addLine(content, "<b>Nome sanitario:</b> " + box.dataset.sanNome);

        if (
            box.dataset.sanMed !== "true" &&
            box.dataset.sanInf !== "true" &&
            !box.dataset.sanNome
        ) {
            addLine(content, "Nessun sanitario registrato");
        }
    });

    /* ------------------------------------------------------------
       INTERVENTI / SUPPORTI / STANDBY
    ------------------------------------------------------------ */
    addSection(content, "Stato Operativo", () => {
        if (box.dataset.standby === "true") addLine(content, "<b>In standby</b>");

        const interventi = (box.dataset.interventi || "").split("|").filter(x => x);
        const supporti = (box.dataset.supporti || "").split("|").filter(x => x);

        if (interventi.length > 0) {
            addLine(content, "<b>Interventi:</b>");
            interventi.forEach(i => addSubLine(content, i));
        }

        if (supporti.length > 0) {
            addLine(content, "<b>Supporti richiesti:</b>");
            supporti.forEach(s => addSubLine(content, s));
        }

        if (
            box.dataset.standby !== "true" &&
            interventi.length === 0 &&
            supporti.length === 0
        ) {
            addLine(content, "Nessun intervento o supporto");
        }
    });

    /* ------------------------------------------------------------
       MEMBRI
    ------------------------------------------------------------ */
    addSection(content, "Membri", () => {
        let membri = [];
        try { membri = JSON.parse(box.dataset.membri || "[]"); } catch {}

        if (membri.length === 0) {
            addLine(content, "Nessun membro registrato");
            return;
        }

        membri.forEach(m => {
            addLine(content, `<b>${m.nome}</b>`);
            addSubLine(content, "Ruoli: " + m.ruoli.join(", "));
            if (m.telefono) addSubLine(content, "Tel: " + m.telefono);
        });
    });

    /* ------------------------------------------------------------
       NOTE
    ------------------------------------------------------------ */
    addSection(content, "Note", () => {
        if (box.dataset.note) addLine(content, box.dataset.note);
        else addLine(content, "Nessuna nota");
    });

    /* ------------------------------------------------------------
       POSTAZIONI → AMBULANZE / SQUADRE PRESENTI
    ------------------------------------------------------------ */
    if (type === "postazione") {
        addSection(content, "Unità Presenti", () => {
            let amb = [];
            let squ = [];

            try { amb = JSON.parse(box.dataset.ambulanze || "[]"); } catch {}
            try { squ = JSON.parse(box.dataset.squadre || "[]"); } catch {}

            if (amb.length === 0 && squ.length === 0) {
                addLine(content, "Nessuna unità presente");
                return;
            }

            if (amb.length > 0) {
                addLine(content, "<b>Ambulanze:</b>");
                amb.forEach(id => {
                    const unit = document.querySelector(`[data-id="${id}"]`);
                    if (unit) addSubLine(content, "🚑 " + unit.dataset.name);
                });
            }

            if (squ.length > 0) {
                addLine(content, "<b>Squadre:</b>");
                squ.forEach(id => {
                    const unit = document.querySelector(`[data-id="${id}"]`);
                    if (unit) addSubLine(content, "⛑️ " + unit.dataset.name);
                });
            }
        });
    }
}

/* ============================================================
   FUNZIONI DI SUPPORTO PER IL POPUP
============================================================ */

function addSection(content, title, builder) {
    const sec = document.createElement("div");
    sec.className = "popup-section";

    const t = document.createElement("div");
    t.className = "popup-section-title";
    t.innerHTML = title;

    sec.appendChild(t);
    content.appendChild(sec);

    builder();
}

function addLine(content, html) {
    const div = document.createElement("div");
    div.className = "popup-line";
    div.innerHTML = html;
    content.appendChild(div);
}

function addSubLine(content, html) {
    const div = document.createElement("div");
    div.className = "popup-subline";
    div.innerHTML = html;
    content.appendChild(div);
}

function closePopup() {
    const p = document.getElementById("popup");
    if (p) p.style.display = "none";
}
/* ============================================================
   DISATTIVA CONTROLLI OFFLINE (ONLINE = VIEW ONLY)
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
