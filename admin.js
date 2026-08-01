import { createClient }
from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";


const supabaseUrl = "https://lyygytdqbhpfeoxjwydo.supabase.co";

const supabaseKey = "sb_publishable_7BfpzSncDJR9EC7Jiqsx3A_TwCj_S8Q";


const supabase =
createClient(
    supabaseUrl,
    supabaseKey
    
);

function formatDate(timestamp) {

    if (!timestamp) {
        return "Unknown date";
    }


    const date = new Date(timestamp);


    return date.toLocaleString(
        "en-US",
        {
            month: "short",
            day: "numeric",
            year: "numeric",

            hour: "numeric",
            minute: "2-digit",

            hour12: true
        }
    );

}

const list =
document.getElementById("commissionList");



async function loadCommissions() {


    const { data, error } = await supabase
        .from("commissions")
        .select("*")
        .order(
            "time",
            {
                ascending: false
            }
        );

    console.log("DATA:", data);
    console.log("ERROR:", error);

    if(error){

        console.error(error);

        list.innerHTML =
        "<p>Failed to load commissions.</p>";

        return;

    }



    list.innerHTML = "";



    data.forEach((commission) => {


        const item = document.createElement("div");

        item.className = "admin-item";


        item.innerHTML = `


            <div class="admin-summary">

                <div>

                    <h3>
                        ${commission.name}
                    </h3>

                    <small>
                        ${formatDate(commission.time)}
                    </small>

                </div>


                <span class="admin-status">
                    ${commission.status}
                </span>

            </div>



            <div class="admin-details">


                <p>
                    <strong>Email</strong><br>
                    ${commission.email}
                </p>


                <p>
                    <strong>Type</strong><br>
                    ${commission.type}
                </p>


                <p>
                    <strong>Description</strong><br>
                    ${commission.description}
                </p>



                <strong>References</strong>

                <div class="reference-images">

                    ${
                        commission.references &&
                        commission.references.length > 0

                        ?

                        commission.references.map(image => `

                            <img
                                src="${image}"
                                class="reference-image"
                            >

                        `).join("")


                        :

                        "<p>No references uploaded.</p>"

                    }

                </div>



                <select>

                    <option ${commission.status==="Pending"?"selected":""}>
                        Pending
                    </option>

                    <option ${commission.status==="Accepted"?"selected":""}>
                        Accepted
                    </option>

                    <option ${commission.status==="Deposit"?"selected":""}>
                        Deposit
                    </option>

                    <option ${commission.status==="Progress"?"selected":""}>
                        Progress
                    </option>

                    <option ${commission.status==="Completed"?"selected":""}>
                        Completed
                    </option>

                    <option ${commission.status==="Paid"?"selected":""}>
                        Paid
                    </option>


                </select>


            </div>

        `;



        // expand/collapse

        const summary =
        item.querySelector(".admin-summary");


        summary.addEventListener(
            "click",
            () => {

                item.classList.toggle("open");

            }
        );



        const select =
        item.querySelector("select");



        select.addEventListener(
            "change",
            async () => {


                const { error } =
                await supabase
                .from("commissions")
                .update({

                    status:
                    select.value

                })
                .eq(
                    "id",
                    commission.id
                );


                if(error){

                    console.error(error);

                    alert(
                        "Failed to update status."
                    );

                }


                else {

                    item.querySelector(".admin-status").innerText =
                    select.value;

                }


            }
        );



        list.appendChild(item);


    });

    if (data.length === 0) {

        list.innerHTML = `
            <div class="empty-state">
                <h3>No commissions yet.</h3>
                <p>New requests will appear here.</p>
            </div>
        `;

        return;

    }
}


loadCommissions();