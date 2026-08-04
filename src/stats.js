import { supabase } from "./supabase.js";

async function updateCommissionCount() {

    const countElement = document.getElementById("count");

    const { count, error } = await supabase
        .from("commissions")
        .select("*", {
            count: "exact",
            head: true
        })
        .in("status", [
            "Accepted",
            "Deposit",
            "Progress"
        ]);

    if (error) {
        console.error(error);
        countElement.textContent = "Queue unavailable";
        return;
    }

    countElement.textContent = `${count} commission(s) in queue! (∞ slots open)`;
}

updateCommissionCount();