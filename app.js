import { initializeApp } from
"https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";

import {
    getFirestore,
    collection,
    addDoc,
    serverTimestamp
}
from
"https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";


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

const submitButton = document.getElementById("submit");

submitButton.addEventListener("click", async () => {

    const request = {

        name: document.getElementById("name").value,

        email: document.getElementById("email").value,

        type: document.getElementById("type").value,

        description:
            document.getElementById("description").value,

        status: "Pending",

        createdAt: serverTimestamp()

    };

    try {

        await addDoc(
            collection(db, "commissions"),
            request
        );

        document.getElementById("name").value = "";
        document.getElementById("email").value = "";
        document.getElementById("type").selectedIndex = 0;
        document.getElementById("description").value = "";

        alert("Commission submitted!");

    }

    catch (err) {

        console.error(err);

        alert("Something went wrong.");

    }

});