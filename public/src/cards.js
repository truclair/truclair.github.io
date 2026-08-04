async function loadCommissionTypes() {

    const response = await fetch("content.json");
    const data = await response.json();
    const commissionTypes = data.commissions;

    const container = document.getElementById("commission-types");

    commissionTypes.forEach(type => {

        const card = document.createElement("label");
        card.classList.add("commission-card");

        card.innerHTML = `
            <input type="radio" name="type" value="${type.value}">

            <h3>${type.name}</h3>

            ${type.prices.map(price => `
                <p>${price}</p>
            `).join("")}

            <!--
            ${type.images.map(image => `
                <img src="${image}" alt="${type.name}">
            `).join("")}
            -->
        `;

        container.appendChild(card);
    });

    document.querySelectorAll('input[name="type"]').forEach(input => {

        input.addEventListener("click", function () {

            if (this.dataset.wasChecked === "true") {
                this.checked = false;
                this.dataset.wasChecked = "false";
            } else {

                document.querySelectorAll('input[name="type"]').forEach(other => {
                    other.dataset.wasChecked = "false";
                });

                this.dataset.wasChecked = "true";
            }

        });

    });

}

loadCommissionTypes();