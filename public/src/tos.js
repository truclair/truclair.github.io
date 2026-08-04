fetch("content.json")
    .then(response => response.json())
    .then(data => {
        const tos = data.tos;

        document.getElementById("tos-updated").textContent =
            `Updated ${tos.updated}`;

        function fillList(elementId, items) {
            const list = document.getElementById(elementId);
            list.innerHTML = "";
            (items || []).forEach(item => {
                const li = document.createElement("li");
                li.textContent = item;
                list.appendChild(li);
            });
        }

        fillList("tos-will-draw", tos.willDraw);
        fillList("tos-wont-draw", tos.wontDraw);

        const sectionsEl = document.getElementById("tos-sections");
        sectionsEl.innerHTML = "";

        (tos.sections || []).forEach((section, index) => {
            const sectionEl = document.createElement("section");
            sectionEl.className = "tos-section";

            const heading = document.createElement("h3");
            heading.textContent = `${index + 1}. ${section.title}`;
            sectionEl.appendChild(heading);

            const list = document.createElement("ol");
            list.className = "tos-section-items";
            list.type = "a";

            (section.items || []).forEach(item => {
                const li = document.createElement("li");
                li.textContent = item;
                list.appendChild(li);
            });

            sectionEl.appendChild(list);
            sectionsEl.appendChild(sectionEl);
        });
    })
    .catch(error => {
        console.error("Failed to load TOS:", error);
    });
