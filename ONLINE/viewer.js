import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAXozlLChJYGd2zDPflvNczpJ3bj4FXqm4",
    authDomain: "mappa-operativa.firebaseapp.com",
    projectId: "mappa-operativa",
    storageBucket: "mappa-operativa.firebasestorage.app",
    messagingSenderId: "935242985371",
    appId: "1:935242985371:web:1e8c3fafbea5a2c7f23b3e"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function createBox(data) {
    const box = document.createElement("div");
    box.className = "box";
    box.style.left = data.x;
    box.style.top = data.y;

    box.dataset.type = data.type;
    box.dataset.name = data.name;
    box.dataset.locked = data.locked;
    box.dataset.standby = data.standby;
    box.dataset.interventi = data.interventi;
    box.dataset.supporti = data.supporti;
    box.dataset.note = data.note;
    box.dataset.membri = data.membri;
    box.dataset.ambulanze = data.ambulanze;
    box.dataset.squadre = data.squadre;

    box.dataset.radio = data.radio;
    box.dataset.sanMed = data.sanMed;
    box.dataset.sanInf = data.sanInf;
    box.dataset.sanNome = data.sanNome;

    const header = document.createElement("div");
    header.className = "box-header";

    const title = document.createElement("div");
    title.className = "box-title";
    title.innerText = data.name || data.type.toUpperCase();
    header.appendChild(title);

    box.appendChild(header);

    box.onclick = () => openPopup(box);

    return box;
}

function rebuildMap(stato) {
    const map = document.getElementById("map-container");
    map.innerHTML = "";

    document.getElementById("map-image").src = "mappa.jpg";


    stato.boxes.forEach(b => {
        const box = createBox(b);
        map.appendChild(box);
    });

    updateSidebar();
}

function updateSidebar() {
    const sidebar = document.getElementById("sidebar-content");
    sidebar.innerHTML = "";

    const boxes = [...document.querySelectorAll(".box")];

    boxes.forEach(box => {
        const div = document.createElement("div");
        div.className = "sidebar-unit";
        div.innerText = box.dataset.name || box.dataset.type.toUpperCase();
        div.onclick = () => openPopup(box);
        sidebar.appendChild(div);
    });
}

function openPopup(box) {
    const popup = document.getElementById("popup");
    const title = document.getElementById("popup-title");
    const content = document.getElementById("popup-content");

    title.innerText = box.dataset.name || box.dataset.type.toUpperCase();

    content.innerHTML = `
        <p><b>Tipo:</b> ${box.dataset.type}</p>
        <p><b>Nome:</b> ${box.dataset.name}</p>
        <p><b>Interventi:</b> ${box.dataset.interventi}</p>
        <p><b>Supporti:</b> ${box.dataset.supporti}</p>
        <p><b>Note:</b> ${box.dataset.note}</p>
        <p><b>Radio:</b> ${box.dataset.radio}</p>
        <p><b>Sanitario:</b> 
            ${box.dataset.sanMed === "true" ? "Medico " : ""}
            ${box.dataset.sanInf === "true" ? "Infermiere " : ""}
            ${box.dataset.sanNome}
        </p>
    `;

    popup.style.display = "block";
}

window.closePopup = function() {
    document.getElementById("popup").style.display = "none";
};

onSnapshot(doc(db, "map", "state"), snap => {
    if (!snap.exists()) return;
    const stato = snap.data().data;
    rebuildMap(stato);
});
