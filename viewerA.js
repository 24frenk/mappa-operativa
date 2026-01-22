const EMOJI = {
    pma: "🏥",
    postazione: "📍",
    ambulanza: "🚑",
    squadra: "👥"
};

async function loadState() {
    try {
        const response = await fetch("stateA.json?cache=" + Date.now());
        const data = await response.json();

        renderMap(data.state);
        renderBoxes(data.state);
        updateTopBar(data.state);
        updateSidebar(data.state);

    } catch (err) {
        console.error("Errore caricamento stato:", err);
    }
}

function renderMap(state) {
    document.getElementById("map-image").src = state.mapImage;
}

function renderBoxes(state) {
    document.querySelectorAll(".box").forEach(b => b.remove());

    state.boxes.forEach(data => {
        const box = document.createElement("div");
        box.className = `box ${data.color}`;
        box.style.left = data.x + "px";
        box.style.top = data.y + "px";
        box.style.width = data.width + "px";
        box.style.height = data.height + "px";

        box.innerHTML = `
            <div class="box-header">${EMOJI[data.type]} ${data.name}</div>
            <div class="box-status">${data.status}</div>
        `;

        box.addEventListener("dblclick", () => openPopup(data));

        document.getElementById("map-container").appendChild(box);
    });
}

function openPopup(data) {
    const popup = document.getElementById("popup");
    const content = document.getElementById("popup-content");

    content.innerHTML = `
        <h2>${EMOJI[data.type]} ${data.name}</h2>
        <p><b>Tipo:</b> ${data.type}</p>
        <p><b>Stato:</b> ${data.status}</p>
        <p><b>Ultimo aggiornamento:</b> ${data.timestamp}</p>
    `;

    popup.style.display = "block";
}

function updateTopBar(state) {
    document.getElementById("last-update").innerText =
        new Date().toLocaleString("it-IT");

    document.getElementById("status").innerText =
        state.status || "—";
}

function updateSidebar(state) {
    const sidebar = document.getElementById("sidebar-content");
    sidebar.innerHTML = "";

    const groups = {
        pma: [],
        postazione: [],
        ambulanza: [],
        squadra: []
    };

    state.boxes.forEach(b => groups[b.type].push(b));

    for (const type in groups) {
        if (groups[type].length === 0) continue;

        const title = document.createElement("div");
        title.className = "sidebar-category-title";
        title.innerText = type.toUpperCase();
        sidebar.appendChild(title);

        groups[type].forEach(b => {
            const unit = document.createElement("div");
            unit.className = "sidebar-unit";

            unit.innerHTML = `
                <div class="sidebar-unit-title">${EMOJI[b.type]} ${b.name}</div>
                <div class="sidebar-unit-line">Stato: ${b.status}</div>
            `;

            sidebar.appendChild(unit);
        });
    }
}

setInterval(loadState, 60000);
loadState();
