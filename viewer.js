/* ============================================================
   VIEWER MODE — CARICA MAPPA DI DEFAULT
============================================================ */

window.addEventListener("DOMContentLoaded", () => {
    const img = document.getElementById("map-image");

    // Se non c’è una mappa salvata, usa quella di default
    if (!localStorage.getItem("mapImage")) {
        img.src = "mappa.jpg";   // <-- NOME DEL FILE ONLINE
    }

    loadState();
});
/* ============================================================
   VIEWER MODE — DISABILITAZIONE FUNZIONI OPERATIVE
============================================================ */

function saveState() { return; }
function syncToGitHub() { return; }
function toggleStandby() { return; }
function terminaIntervento() { return; }
function terminaSupporto() { return; }
function savePopup() { return; }
function removeCurrentUnit() { return; }

/* ============================================================
   VIEWER MODE — DISABILITA DRAG
============================================================ */

function startDrag() {
    return; // nessun trascinamento nel viewer
}
/* ============================================================
   VIEWER MODE — DISABILITA TUTTI GLI INPUT NEI POPUP
============================================================ */

function disablePopupInputs() {
    const popup = document.getElementById("popup");

    popup.querySelectorAll("input").forEach(el => {
        el.disabled = true;
        el.readOnly = true;
    });

    popup.querySelectorAll("textarea").forEach(el => {
        el.disabled = true;
        el.readOnly = true;
    });

    popup.querySelectorAll("select").forEach(el => {
        el.disabled = true;
    });

    popup.querySelectorAll("button").forEach(btn => {
        if (btn.id !== "popup-close-btn") {
            btn.style.display = "none"; // nasconde tutti i bottoni operativi
        }
    });
}

// aggiungere alla fine di openPopup():
// disablePopupInputs();
/* ============================================================
   VIEWER MODE — CARICAMENTO STATO SOLO LETTURA
============================================================ */

function loadState() {
    const saved = localStorage.getItem("mapState_full");
    const savedMap = localStorage.getItem("mapImage");

    if (savedMap) {
        document.getElementById("map-image").src = savedMap;
    }

    if (!saved) return;

    const state = JSON.parse(saved);
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

        box.dataset.ambulanze = data.ambulanze || "[]";
        box.dataset.squadre = data.squadre || "[]";

        box.style.left = data.x || "200px";
        box.style.top = data.y || "200px";

        box.ondblclick = () => openPopup(box);

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

        const ints = (data.interventi || "").split("|").filter(x => x);
        const sups = (data.supporti || "").split("|").filter(x => x);

        if (data.standby === "true") box.classList.add("yellow");
        else if (ints.length > 0) box.classList.add("red");
        else if (sups.length > 0) box.classList.add("orange");

        container.appendChild(box);
    });

    updateSidebar();
}
/* ============================================================
   VIEWER MODE — SIDEBAR COMPLETA (SOLO LETTURA)
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
            unitDiv.ondblclick = () => openPopup(box);

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
