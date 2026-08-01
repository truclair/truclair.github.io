fetch("tos.json")
    .then(response => response.json())
    .then(data => {

        document.getElementById("tos-updated").textContent =
            `Updated ${data.updated}`;

        const list = document.getElementById("tos-list");

        data.terms.forEach(term => {
            const li = document.createElement("li");
            li.textContent = term;
            list.appendChild(li);
        });

    })
    .catch(error => {
        console.error("Failed to load TOS:", error);
    });