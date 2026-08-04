import { getCommissionCount } from "./api.js";

async function updateCommissionCount() {
    const countElement = document.getElementById("count");

    try {
        const count = await getCommissionCount();
        countElement.textContent = `${count} commission(s) in queue! (∞ slots open)`;
    } catch (error) {
        console.error(error);
        countElement.textContent = "Queue unavailable";
    }
}

updateCommissionCount();
