/* ============================================================
   CARICA STATO DA GITHUB
============================================================ */

async function loadOnlineState() {
    try {
        const res = await fetch("state.json?cacheBust=" + Date.now());
        const data = await res.json();

        updateStatusBar(data.timestamp);
        renderMap(data.state);
        renderSidebar(data.state);

    } catch (e) {
        console.error("Errore caricamento stato:", e);
    }
}

function updateStatusBar(ts) {
    document.getElementById("last-update").textContent =
        new Date(ts).toLocaleString("it-IT");

    const diff = Date.now() - new Date(ts).getTime();
    const minutes = diff / 60000;

    document.getElementById("online-status").textContent =
        minutes < 2 ? "ONLINE" : "OFFLINE";
}

/* ============================================================
   RENDER MAPPA
============================================================ */

function renderMap(state) {
    const cont = document.getElementById("boxes-container");
    cont.innerHTML = "";

    state.boxes.forEach(b => {
        const el = document.createElement("div");
        el.className = "box";
        el.style.left = b.x;
        el.style.top = b.y;

        const ints = (b.interventi || "").split("|").filter(x => x);
        const sups = (b.supporti || "").split("|").filter(x => x);

        if (b.standby === "true") el.classList.add("yellow");
        else if (ints.length > 0) el.classList.add("red");
        else if (sups.length > 0) el.classList.add("orange");

        const baseLabel =
            b.type === "postazione" ? "Postazione" :
            b.type === "ambulanza" ? "Ambulanza" :
            b.type === "squadra" ? "Squadra" :
            "PMA";

        const EMOJI = {
            postazione: "📍",
            ambulanza: "🚑",
            squadra: "⛑️",
            pma: "🏥"
        };

        el.innerHTML = `
            <div class="box-header">
                <div class="box-title">${EMOJI[b.type]} ${b.name || baseLabel}</div>
            </div>
        `;

        el.ondblclick = () => openPopup(b);

        cont.appendChild(el);
    });
}

/* ============================================================
   RENDER SIDEBAR
============================================================ */

function renderSidebar(state) {
    const cont = document.getElementById("sidebar-content");
    cont.innerHTML = "";

    const cats = {
        pma: [],
        postazione: [],
        ambulanza: [],
        squadra: []
    };

    state.boxes.forEach(b => cats[b.type].push(b));

    function addSection(label, arr) {
        if (!arr.length) return;

        const title = document.createElement("div");
        title.className = "sidebar-category-title";
        title.textContent = `${label} (${arr.length})`;
        cont.appendChild(title);

        const wrap = document.createElement("div");
        wrap.className = "sidebar-category";

        arr.sort((a, b) => (a.name || "").localeCompare(b.name || ""));

        arr.forEach(b => {
            const div = document.createElement("div");
            div.className = "sidebar-unit";

            const ints = (b.interventi || "").split("|").filter(x => x);
            const sups = (b.supporti || "").split("|").filter(x => x);

            if (b.standby === "true") div.classList.add("yellow");
            else if (ints.length > 0) div.classList.add("red");
            else if (sups.length > 0) div.classList.add("orange");

            const EMOJI = {
                postazione: "📍",
                ambulanza: "🚑",
                squadra: "⛑️",
                pma: "🏥"
            };

            const baseLabel =
                b.type === "postazione" ? "Postazione" :
                b.type === "ambulanza" ? "Ambulanza" :
                b.type === "squadra" ? "Squadra" :
                "PMA";

            div.innerHTML = `
                <div class="sidebar-unit-title">${EMOJI[b.type]} ${b.name || baseLabel}</div>
            `;

            if (b.standby === "true")
                div.innerHTML += `<div class="sidebar-unit-line"><b>Stato: In Standby</b></div>`;

            if (ints.length)
                div.innerHTML += `<div class="sidebar-unit-line"><b>Intervento:</b> ${ints.join(", ")}</div>`;

            if (sups.length)
                div.innerHTML += `<div class="sidebar-unit-line"><b>Supporto:</b> ${sups.join(", ")}</div>`;

            if (b.radio)
                div.innerHTML += `<div class="sidebar-unit-line">Radio: ${b.radio}</div>`;

            if (b.sanMed === "true" || b.sanInf === "true") {
                let s = "";
                if (b.sanMed === "true") s += "Medico ";
                if (b.sanInf === "true") s += "Infermiere ";
                if (b.sanNome) s += `- ${b.sanNome}`;
                div.innerHTML += `<div class="sidebar-unit-line">Sanitario: ${s}</div>`;
            }

            if (b.membri) {
                try {
                    const m = JSON.parse(b.membri);
                    if (m.length) {
                        const elenco = m.map(x => x.nome || "").join(", ");
                        div.innerHTML += `<div class="sidebar-unit-line">Membri (${m.length}): ${elenco}</div>`;
                    }
                } catch {}
            }

            div.ondblclick = () => openPopup(b);

            wrap.appendChild(div);
        });

        cont.appendChild(wrap);
    }

    addSection("PMA", cats.pma);
    addSection("Postazioni", cats.postazione);
    addSection("Ambulanze", cats.ambulanza);
    addSection("Squadre", cats.squadra);
}

/* ============================================================
   POPUP (IDENTICO ALLA VERSIONE OFFLINE, MA BLOCCATO)
============================================================ */

function openPopup(b) {
    const popup = document.getElementById("popup");
    const title = document.getElementById("popup-title");
    const content = document.getElementById("popup-content");

    const EMOJI = {
        postazione: "📍",
        ambulanza: "🚑",
        squadra: "⛑️",
        pma: "🏥"
    };

    const baseLabel =
        b.type === "postazione" ? "Postazione" :
        b.type === "ambulanza" ? "Ambulanza" :
        b.type === "squadra" ? "Squadra" :
        "PMA";

    title.textContent = `${EMOJI[b.type]} ${b.name || baseLabel}`;

    /* Popup identico alla tua versione offline */
    content.innerHTML = buildPopupHTML(b);

    /* Rende tutto in sola lettura */
    content.querySelectorAll("input, textarea, select").forEach(el => {
        el.readOnly = true;
        el.disabled = true;
    });

    popup.classList.remove("hidden");
}

document.getElementById("popup-close").onclick = () => {
    document.getElementById("popup").classList.add("hidden");
};

/* ============================================================
   COSTRUZIONE HTML POPUP (COPIA DELLA TUA VERSIONE)
============================================================ */

function buildPopupHTML(b) {
    let html = "";

    function row(label, value) {
        return `<div class="popup-section"><b>${label}:</b> ${value || "-"}</div>`;
    }

    html += row("Nome", b.name);
    html += row("Tipo", b.type);
    html += row("Radio", b.radio);

    if (b.sanMed === "true" || b.sanInf === "true") {
        let s = "";
        if (b.sanMed === "true") s += "Medico ";
        if (b.sanInf === "true") s += "Infermiere ";
        if (b.sanNome) s += `- ${b.sanNome}`;
        html += row("Sanitario", s);
    }

    const ints = (b.interventi || "").split("|").filter(x => x);
    if (ints.length) html += row("Intervento", ints.join(", "));

    const sups = (b.supporti || "").split("|").filter(x => x);
    if (sups.length) html += row("Supporto", sups.join(", "));

    if (b.note) html += row("Note", b.note);

    if (b.membri) {
        try {
            const m = JSON.parse(b.membri);
            if (m.length) {
                const elenco = m.map(x => x.nome || "").join(", ");
                html += row("Membri", elenco);
            }
        } catch {}
    }

    return html;
}

/* ============================================================
   AVVIO
============================================================ */

loadOnlineState();
setInterval(loadOnlineState, 15000);
