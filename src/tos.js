fetch("content.json")
    .then(response => response.json())
    .then(data => {

        const tos = data.tos;

        document.getElementById("tos-updated").textContent =
            `Updated ${tos.updated}`;

        const list = document.getElementById("tos-list");
        list.innerHTML = "";

        tos.terms.forEach(term => {
            const li = document.createElement("li");
            li.textContent = term;
            list.appendChild(li);
        });

    })
    .catch(error => {
        console.error("Failed to load TOS:", error);
    });