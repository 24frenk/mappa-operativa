/* ============================================================
   VERSIONE ONLINE (SOLO VISUALIZZAZIONE)
============================================================ */

const IS_ONLINE_VERSION = true;
const DATA_URL = "https://raw.githubusercontent.com/24frenk/mappa-operativa/main/data.json";

/* ============================================================
   STATO
============================================================ */

let scale = 1;
let mapLocked = true; // sempre bloccata online

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
        const res = await fetch(DATA_URL);
        if (!res.ok) throw new Error("Impossibile caricare data.json");

        const data = await res.json();
        renderMap(data);
    } catch (err) {
        alert("Errore nel caricamento dei dati online.");
        console.error(err);
    }
}

/* ============================================================
   RENDER MAPPA E BOX
============================================================ */

function renderMap(state) {
    const container = document.getElementById("map-container");
    container.innerHTML = "";

    scale = state.scale || 1;
    document.getElementById("map-container").style.transform = `scale(${scale})`;

    (state.boxes || []).forEach(data => {
        const box = document.createElement("div");
        box.className = "box";
        box.dataset.type = data.type;

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

        box.style.left = data.x || "200px";
        box.style.top = data.y || "200px";

        const ints = (data.interventi || "").split("|").filter(x => x);
        const sups = (data.supporti || "").split("|").filter(x => x);

        if (data.standby === "true") box.classList.add("yellow");
        else if (ints.length > 0) box.classList.add("red");
        else if (sups.length > 0) box.classList.add("orange");

        box.ondblclick = () => openPopupOnline(data);

        container.appendChild(box);
    });

    updateSidebarOnline(state.boxes);
}

/* ============================================================
   POPUP ONLINE (SOLO LETTURA)
============================================================ */

function openPopupOnline(data) {
    const popup = document.getElementById("popup");
    const title = document.getElementById("popup-title");
    const content = document.getElementById("popup-content");

    popup.style.display = "block";

    const label =
        data.type === "postazione" ? "Postazione" :
        data.type === "ambulanza" ? "Ambulanza" :
        data.type === "squadra" ? "Squadra" :
        "PMA";

    title.innerText = `${EMOJI[data.type]} ${label}`;

    content.innerHTML = "";

    const sec = document.createElement("div");
    sec.className = "popup-section";

    sec.innerHTML = `
        <div class="popup-section-title">Dettagli</div>
        <div class="popup-row"><b>Nome:</b> ${data.name || "-"}</div>
        <div class="popup-row"><b>Note:</b> ${data.note || "-"}</div>
    `;

    content.appendChild(sec);

    if (data.type === "ambulanza" || data.type === "squadra") {
        const sec2 = document.createElement("div");
        sec2.className = "popup-section";

        const sanitario = [
            data.sanMed === "true" ? "Medico" : "",
            data.sanInf === "true" ? "Infermiere" : ""
        ].filter(x => x).join(" ");

        sec2.innerHTML = `
            <div class="popup-section-title">Sanitario</div>
            <div class="popup-row"><b>Radio:</b> ${data.radio || "-"}</div>
            <div class="popup-row"><b>Sanitario:</b> ${sanitario || "Nessuno"}</div>
            <div class="popup-row"><b>Nome sanitario:</b> ${data.sanNome || "-"}</div>
        `;

        content.appendChild(sec2);

        if (data.membri && data.membri.length > 0) {
            const sec3 = document.createElement("div");
            sec3.className = "popup-section";

            const elenco = data.membri.map(m => {
                const ruoli = m.ruoli && m.ruoli.length ? ` (${m.ruoli.join(", ")})` : "";
                return `- ${m.nome}${ruoli}`;
            }).join("<br>");

            sec3.innerHTML = `
                <div class="popup-section-title">Membri</div>
                <div>${elenco}</div>
            `;

            content.appendChild(sec3);
        }
    }

    if (data.interventi && data.interventi.length > 0) {
        const sec4 = document.createElement("div");
        sec4.className = "popup-section";
        sec4.innerHTML = `
            <div class="popup-section-title">Intervento</div>
            <div>${data.interventi.join(", ")}</div>
        `;
        content.appendChild(sec4);
    }

    if (data.supporti && data.supporti.length > 0) {
        const sec5 = document.createElement("div");
        sec5.className = "popup-section";
        sec5.innerHTML = `
            <div class="popup-section-title">Supporto</div>
            <div>${data.supporti.join(", ")}</div>
        `;
        content.appendChild(sec5);
    }

    document.getElementById("popup-standby-btn").style.display = "none";
    document.getElementById("popup-end-intervento-btn").style.display = "none";
    document.getElementById("popup-end-supporto-btn").style.display = "none";
    document.getElementById("popup-remove-btn").style.display = "none";
}

/* ============================================================
   SIDEBAR ONLINE
============================================================ */

function updateSidebarOnline(boxes) {
    const sidebar = document.getElementById("sidebar-content");
    sidebar.innerHTML = "";

    const categories = {
        pma: [],
        postazione: [],
        ambulanza: [],
        squadra: []
    };

    boxes.forEach(b => {
        if (categories[b.type]) categories[b.type].push(b);
    });

    function section(label, items) {
        if (!items.length) return;

        const title = document.createElement("div");
        title.className = "sidebar-category-title";
        title.innerText = `${label} (${items.length})`;
        sidebar.appendChild(title);

        const container = document.createElement("div");
        container.className = "sidebar-category";

        items.sort((a, b) => (a.name || "").localeCompare(b.name || ""));

        items.forEach(data => {
            const div = document.createElement("div");
            div.className = "sidebar-unit";

            if (data.standby === "true") div.classList.add("yellow");
            else if (data.interventi.length > 0) div.classList.add("red");
            else if (data.supporti.length > 0) div.classList.add("orange");

            div.innerHTML = `
                <div class="sidebar-unit-title">${EMOJI[data.type]} ${data.name}</div>
            `;

            div.ondblclick = () => openPopupOnline(data);

            container.appendChild(div);
        });

        sidebar.appendChild(container);
    }

    section("PMA", categories.pma);
    section("Postazioni", categories.postazione);
    section("Ambulanze", categories.ambulanza);
    section("Squadre", categories.squadra);
}

/* ============================================================
   CHIUSURA POPUP
============================================================ */

function closePopup() {
    document.getElementById("popup").style.display = "none";
}

/* ============================================================
   AVVIO
============================================================ */

window.onload = () => {
    loadOnlineData();
};
