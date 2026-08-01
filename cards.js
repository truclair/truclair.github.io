

const commissionTypes = [
    {
        name: "Icon",
        value: "icon",
        prices: [
            "~$10 / color",
        ],
        images: [
            "illustration/Icon.png"
        ]
    },
    {
        name: "Half Body",
        value: "half",
        prices: [
            "~$20 / color",
        ],
        images: [
            "illustration/Action_Pistol.png"
        ]
    },
    {
        name: "Full Body",
        value: "full",
        prices: [
            "~$40 / color",
        ],
        images: [
            "illustration/2026-06-30-Homecoming.png"
        ]
    },
    {
        name: "Scene",
        value: "scene",
        prices: [
            "~$80 / color, background, multiple characters"
        ],
        images: [
            "illustration/2025-11-25-Fighting.png",
            "illustration/Heartache.png",
            "illustration/Stage.png"
        ]
    }
];

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

        ${type.images.map(image => `
            <img src="${image}" alt="${type.name}">
        `).join("")}
    `;

    container.appendChild(card);
});

document.querySelectorAll('input[name="type"]').forEach(input => {

    input.addEventListener("click", function() {

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