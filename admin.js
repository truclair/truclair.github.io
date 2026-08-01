import { initializeApp }
from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";

import {
    getFirestore,
    collection,
    onSnapshot,
    doc,
    updateDoc
}
from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDLpQZhO29xTWj2ENIlh3k_AsNjeTcXtng",
    authDomain: "truclair-commissions.firebaseapp.com",
    projectId: "truclair-commissions",
    storageBucket: "truclair-commissions.firebasestorage.app",
    messagingSenderId: "743122877442",
    appId: "1:743122877442:web:0e10d6fa44865f1687fb1b",
    measurementId: "G-DHYPC8Q755"
};

const app = initializeApp(firebaseConfig);

const db = getFirestore(app);

const list = document.getElementById("commissionList");

onSnapshot(collection(db, "commissions"), (snapshot) => {

    list.innerHTML = "";

    snapshot.forEach((commission) => {

        const data = commission.data();

        const card = document.createElement("div");

        card.className = "admin-card";

        card.innerHTML = `

            <h3>${data.name}</h3>

            <p><strong>Email</strong><br>${data.email}</p>

            <p><strong>Type</strong><br>${data.type}</p>

            <p>${data.description}</p>

            <select>

                <option ${data.status==="Pending"?"selected":""}>
                    Pending
                </option>

                <option ${data.status==="Accepted"?"selected":""}>
                    Accepted
                </option>

                <option ${data.status==="Paid"?"selected":""}>
                    Paid
                </option>

                <option ${data.status==="Sketch"?"selected":""}>
                    Sketch
                </option>

                <option ${data.status==="Rendering"?"selected":""}>
                    Rendering
                </option>

                <option ${data.status==="Completed"?"selected":""}>
                    Completed
                </option>

            </select>

        `;

        const select = card.querySelector("select");

        select.addEventListener("change", async () => {

            await updateDoc(
                doc(db, "commissions", commission.id),
                {
                    status: select.value
                }
            );

        });

        list.appendChild(card);

    });

});