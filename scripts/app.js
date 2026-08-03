import { createClient }
from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

import { supabase } from "./supabase.js";



const submitButton =
document.getElementById("submit");

const progress =
document.getElementById("upload-progress");

const bar =
document.getElementById("upload-bar");

function updateProgress(percent){
    bar.style.width = percent + "%";
}




submitButton.addEventListener("click", async (event) => {

    event.preventDefault();
    const name = document.getElementById("name").value != "";
    const email = document.getElementById("email").value != "";
    const type = document.querySelector('input[name="type"]:checked') !== null;
    const description = document.getElementById("description").value != "";
    const references = document.getElementById("references").value != "";
    const tos = document.getElementById("tos").checked == true;

    // if (!name)  errors.push("• Please provide your name.");
    var errors = [];
    if (!email) { errors.push("• Please provide your email.") };
    if (!type) { errors.push("• Select a commission type from the options above."); }
    if (!tos) { errors.push("• Please read and agree to the Terms of Service."); }
    // if (!description)  errors.push("• Select a commission type from the options above.");
    // if (!references)  errors.push("• Select a commission type from the options above.");

    if (errors.length > 0) {
        alert(
            "Submission failed:\n\n" +
            errors.join("\n")
        );
        return;
    }

    const files =
    document.getElementById("references").files;
    const uploadedImages = [];

    try {
        submitButton.disabled = true;
        submitButton.innerText = "Uploading...";
        progress.classList.add("show");
        updateProgress(10);
        let completed = 0;
        for (const file of files) {
            const filename =
            `${Date.now()}-${file.name}`;
            const { error } =
            await supabase.storage
            .from("references")
            .upload(
                filename,
                file
            );
            if(error){
                throw error;
            }
            const { data } =
            supabase.storage
            .from("references")
            .getPublicUrl(filename);
            uploadedImages.push(
                data.publicUrl
            );
            completed++;
            updateProgress(
                10 + 
                ((completed / files.length) * 70)
            );
        }
        // Save commission
        updateProgress(85);
        const request = {
            name:
            document.getElementById("name").value,
            email:
            document.getElementById("email").value,
            type:
                document.querySelector(
                    'input[name="type"]:checked'
                )?.value,
            description:
            document.getElementById("description").value,
            status:
            "Pending",
            references:
            uploadedImages
        };
        const { error } =
        await supabase
        .from("commissions")
        .insert([request]);
        if(error){
            throw error;
        }
        updateProgress(100);
        setTimeout(() => {
            alert(
                "Commission submitted!"
            );
            progress.classList.remove("show");
        }, 300);

        // Clear form
        document.getElementById("name").value = "";
        document.getElementById("email").value = "";
        document.querySelectorAll(
                'input[name="type"]'
            ).forEach(input => {
                input.checked = false;
            });

        document.getElementById("description").value = "";
        document.getElementById("references").value = "";
        document.getElementById("tos").checked = false;



    }



    catch(err){


        console.error(
            "Submission error:",
            err
        );


        alert(
            err.message
        );


        progress.classList.remove("show");


    }



    finally {


        submitButton.disabled = false;

        submitButton.innerText =
        "Submit Request";


    }



});