/* ============================================================
   VIEWER MODE — DISABILITAZIONE FUNZIONI OPERATIVE
============================================================ */

function saveState() {}
function syncToGitHub() {}
function toggleStandby() {}
function terminaIntervento() {}
function terminaSupporto() {}
function savePopup() {}
function removeCurrentUnit() {}

/* ============================================================
   VIEWER MODE — DISABILITA DRAG
============================================================ */

function startDrag() {
    return; // nessun trascinamento nel viewer
}

/* ============================================================
   VIEWER MODE — DISABILITA INPUT NEI POPUP
============================================================ */

function disablePopupInputs() {
    const popup = document.getElementById("popup");

    popup.querySelectorAll("input, textarea, select").forEach(el => {
        el.disabled = true;
        el.readOnly = true;
    });

    popup.querySelectorAll("button").forEach(btn => {
        if (btn.id !== "popup-close-btn") {
            btn.style.display = "none";
        }
    });
}

/* ============================================================
   EMOJI PER LE UNITÀ
============================================================ */

const EMOJI = {
    pma: "🏥",
    postazione: "📍",
    ambulanza: "🚑",
    squadra: "👥"
};

/* ============================================================
   VIEWER MODE — CARICA STATO DA GITHUB (SOLO LETTURA)
============================================================ */

async function loadStateFromGitHub() {
    try {
        const response = await fetch("state.json?cacheBust=" + Date.now());
        const data = await response.json();

        if (!data || !data.state) {
            console.error("state.json non valido");
            return;
        }

        renderMapFromState(data.state);
        renderBoxesFromState(data.state.boxes || []);
        updateSidebar();

    } catch (err) {
        console.error("Errore caricamento da GitHub:", err);
    }
}
/* ============================================================
   VIEWER MODE — RENDER MAPPA DA state.json
============================================================ */

function renderMapFromState(state) {
    const mapImg = document.getElementById("map-image");

    if (state.mapImage && mapImg) {
        mapImg.src = state.mapImage;
    }
}
/* ============================================================
   VIEWER MODE — RENDER BOX DA state.json
============================================================ */

function renderBoxesFromState(boxes) {
    const container = document.getElementById("map-container");
    container.innerHTML = ""; // pulisce tutto prima di ridisegnare

    boxes.forEach(data => {
        const box = document.createElement("div");
        box.className = "box";

        // dataset
        box.dataset.id = data.id;
        box.dataset.type = data.type;
        box.dataset.name = data.name || "";
        box.dataset.standby = data.standby || "false";
        box.dataset.interventi = data.interventi || "";
        box.dataset.supporti = data.supporti || "";
        box.dataset.note = data.note || "";
        box.dataset.membri = data.membri || "[]";
        box.dataset.radio = data.radio || "";
        box.dataset.sanMed = data.sanMed || "false";
        box.dataset.sanInf = data.sanInf || "false";
        box.dataset.sanNome = data.sanNome || "";

        // posizione
        box.style.left = data.x;
        box.style.top = data.y;

        // popup in sola lettura
        box.ondblclick = () => {
            openPopup(box);
            disablePopupInputs();
        };

        // header
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

        // colori
        const ints = (data.interventi || "").split("|").filter(x => x);
        const sups = (data.supporti || "").split("|").filter(x => x);

        if (data.standby === "true") box.classList.add("yellow");
        else if (ints.length > 0) box.classList.add("red");
        else if (sups.length > 0) box.classList.add("orange");

        container.appendChild(box);
    });
}
/* ============================================================
   VIEWER MODE — AUTO REFRESH OGNI 15 SECONDI
============================================================ */

setInterval(() => {
    loadStateFromGitHub();
}, 15000);

// Carica subito al primo avvio
loadStateFromGitHub();
/* ============================================================
   VIEWER MODE — SIDEBAR (SOLO LETTURA)
============================================================ */

function readBoxData(box) {
    return {
        id: box.dataset.id,
        type: box.dataset.type,
        name: box.dataset.name || "",
        standby: box.dataset.standby === "true",
        interventi: (box.dataset.interventi || "").split("|").filter(x => x),
        supporti: (box.dataset.supporti || "").split("|").filter(x => x),
        note: box.dataset.note || "",
        membri: JSON.parse(box.dataset.membri || "[]"),
        radio: box.dataset.radio || "",
        sanMed: box.dataset.sanMed === "true",
        sanInf: box.dataset.sanInf === "true",
        sanNome: box.dataset.sanNome || ""
    };
}

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

    function createCategorySection(label, items) {
        if (!items.length) return;

        const titleEl = document.createElement("div");
        titleEl.className = "sidebar-category-title";
        titleEl.innerText = `${label} (${items.length})`;
        sidebar.appendChild(titleEl);

        const container = document.createElement("div");
        container.className = "sidebar-category";

        items.sort((a, b) =>
            (a.dataset.name || "").localeCompare(b.dataset.name || "")
        );

        items.forEach(box => {
            const data = readBoxData(box);

            const unitDiv = document.createElement("div");
            unitDiv.className = "sidebar-unit";
            unitDiv.ondblclick = () => {
                openPopup(box);
                disablePopupInputs();
            };

            if (data.standby) unitDiv.classList.add("yellow");
            else if (data.interventi.length) unitDiv.classList.add("red");
            else if (data.supporti.length) unitDiv.classList.add("orange");

            const title = document.createElement("div");
            title.className = "sidebar-unit-title";

            const baseLabel =
                data.type === "postazione" ? "Postazione" :
                data.type === "ambulanza" ? "Ambulanza" :
                data.type === "squadra" ? "Squadra" :
                "PMA";

            title.innerText = `${EMOJI[data.type]} ${data.name || baseLabel}`;
            unitDiv.appendChild(title);

            if (data.interventi.length) {
                const line = document.createElement("div");
                line.className = "sidebar-unit-line";
                line.innerHTML = `<b>Intervento:</b> ${data.interventi.join(", ")}`;
                unitDiv.appendChild(line);
            }

            if (data.supporti.length) {
                const line = document.createElement("div");
                line.className = "sidebar-unit-line";
                line.innerHTML = `<b>Supporto:</b> ${data.supporti.join(", ")}`;
                unitDiv.appendChild(line);
            }

            if (data.radio) {
                const line = document.createElement("div");
                line.className = "sidebar-unit-line";
                line.innerText = `Radio: ${data.radio}`;
                unitDiv.appendChild(line);
            }

            if (data.membri.length) {
                const line = document.createElement("div");
                line.className = "sidebar-unit-line";
                const elenco = data.membri.map(m => {
                    const nome = m.nome || "";
                    const ruoli = m.ruoli?.length ? ` (${m.ruoli.join(", ")})` : "";
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

            container.appendChild(unitDiv);
        });

        sidebar.appendChild(container);
    }

    createCategorySection("PMA", categories.pma);
    createCategorySection("Postazioni", categories.postazione);
    createCategorySection("Ambulanze", categories.ambulanza);
    createCategorySection("Squadre", categories.squadra);
}
