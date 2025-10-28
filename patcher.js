document.addEventListener('DOMContentLoaded', () => {
    const fwSelect = document.getElementById('fw-select');     // Select dropdown
    const patchListDiv = document.getElementById('patch-list');
    const patchButton = document.getElementById('patch-button');
    const downloadLink = document.getElementById('download-link');

    let baseFileContent = null;
    let selectedFileName = 'FW_patched.js'; // Default download name
    let patchScriptsLoaded = 0;
    const totalPatches = (typeof PATCH_MANIFEST !== 'undefined') ? Object.keys(PATCH_MANIFEST).length : 0; // Check if PATCH_MANIFEST exists

    // --- 1. Populate FW Dropdown ---
    if (typeof FW_VERSIONS === 'undefined' || Object.keys(FW_VERSIONS).length === 0) {
        console.error("FW_VERSIONS manifest not found or is empty.");
        fwSelect.innerHTML = '<option value="">Error loading versions</option>';
        fwSelect.disabled = true;
        patchButton.disabled = true; // Disable patch button if FW versions fail
    } else {
        for (const versionKey in FW_VERSIONS) {
            const versionInfo = FW_VERSIONS[versionKey];
            const option = document.createElement('option');
            option.value = versionInfo.file; // Use filename as value for fetching
            option.textContent = versionInfo.name || `Version ${versionKey}`;
            fwSelect.appendChild(option);
        }
    }

    // --- 2. Patch Loading and UI Population ---
    if (totalPatches === 0) {
        patchListDiv.innerHTML = '<p>No patches found in manifest.</p>';
        // Don't completely disable if FW loaded, just note no patches
        if (!baseFileContent) patchButton.disabled = true;
    } else {
        // Clear the "Loading..." text
        patchListDiv.innerHTML = '';

        // Loop through the manifest and dynamically load each patch script
        for (const patchKey in PATCH_MANIFEST) {
            const patchInfo = PATCH_MANIFEST[patchKey];
            const script = document.createElement('script');
            script.src = patchInfo.file;
            script.async = false; // Try loading scripts sequentially

            script.onload = () => {
                patchScriptsLoaded++;
                // Check if the patch data was actually added
                 if (window.Patches && window.Patches[patchKey]) {
                    createPatchCheckbox(patchKey, patchInfo);
                 } else {
                    console.error(`Patch script ${patchInfo.file} loaded, but window.Patches.${patchKey} is undefined.`);
                     // Optionally display an error in the UI for this patch
                    const errorDiv = document.createElement('div');
                    errorDiv.className = 'patch-item';
                    errorDiv.style.color = 'red';
                    errorDiv.innerHTML = `<label style="text-decoration: line-through;">${patchInfo.name}</label><p>Error loading patch data. Check console.</p>`;
                    patchListDiv.appendChild(errorDiv);
                 }

                // If all patch scripts have finished attempting to load
                if (patchScriptsLoaded === totalPatches) {
                    console.log("All patch scripts processed.");
                }
            };

            script.onerror = () => {
                console.error(`Failed to load patch file: ${patchInfo.file}`);
                patchScriptsLoaded++;
                 // Optionally display an error in the UI for this patch
                 const errorDiv = document.createElement('div');
                 errorDiv.className = 'patch-item';
                 errorDiv.style.color = 'red';
                 errorDiv.innerHTML = `<label style="text-decoration: line-through;">${patchInfo.name}</label><p>Failed to load script file. Check console.</p>`;
                 patchListDiv.appendChild(errorDiv);

                 if (patchScriptsLoaded === totalPatches) {
                    console.log("All patch scripts processed (with errors).");
                }
            };

            document.body.appendChild(script);
        }
    }

    /**
     * Creates and adds a checkbox item to the patch list div.
     */
    function createPatchCheckbox(patchKey, patchInfo) {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'patch-item';

        const checkboxId = `patch-${patchKey}`;

        itemDiv.innerHTML = `
            <input type="checkbox" id="${checkboxId}" data-patch-key="${patchKey}">
            <label for="${checkboxId}">${patchInfo.name}</label>
            <p>${patchInfo.description}</p>
        `;

        patchListDiv.appendChild(itemDiv);
    }


    // --- 3. Firmware Selection Handling ---
    fwSelect.addEventListener('change', async (event) => {
        const selectedFile = event.target.value;
        patchButton.disabled = true; // Disable while loading
        patchButton.textContent = 'Loading FW...';
        baseFileContent = null;
        downloadLink.style.display = 'none'; // Hide download link

        if (!selectedFile) {
            patchButton.textContent = '1. Select FW Version';
            return;
        }

        try {
            const response = await fetch(selectedFile);
            if (!response.ok) {
                // More specific error for common GitHub Pages 404
                if(response.status === 404 && window.location.hostname.endsWith('github.io')){
                     throw new Error(`HTTP 404: File not found. Make sure '${selectedFile}' exists and the filename/path in fw_manifest.js is correct (case-sensitive).`);
                } else {
                    throw new Error(`HTTP error! status: ${response.status} loading ${selectedFile}`);
                }
            }
            // Read as text using UTF-8 explicitly, matching patch files
            baseFileContent = await response.text();
            selectedFileName = selectedFile.replace('.js', '_patched.js'); // Update download name
            patchButton.disabled = false; // Re-enable button
            patchButton.textContent = 'Patch File';
            console.log(`${selectedFile} loaded successfully.`);
        } catch (error) {
            console.error('Error fetching firmware file:', error);
            alert(`Failed to load ${selectedFile}.\nError: ${error.message}`);
            patchButton.textContent = 'Error Loading FW';
            event.target.value = ''; // Reset dropdown
        }
    });


    // --- 4. Patching Logic ---
    patchButton.addEventListener('click', () => {
        if (!baseFileContent) {
            alert('Please select a base FW version from the dropdown first.');
            return;
        }

        // Set download name based on selected FW
        downloadLink.download = selectedFileName;

        let patchedContent = baseFileContent;
        const selectedPatches = patchListDiv.querySelectorAll('input[type="checkbox"]:checked');

        if (selectedPatches.length === 0) {
            alert('No patches selected.');
            // Optionally allow downloading the base file if no patches selected?
            // If so, skip the patching loop and go straight to download creation.
            // For now, require patches.
            return;
        }

        console.log("Starting patching process..."); // Log start

        try {
            selectedPatches.forEach(checkbox => {
                const patchKey = checkbox.dataset.patchKey;
                console.log(`Applying patch: ${patchKey}`); // Log each patch
                const patchData = window.Patches[patchKey];

                // Robust check for patch data
                if (!patchData || typeof patchData !== 'object') {
                    // Check manifest info for better error message
                    const patchManifestInfo = PATCH_MANIFEST[patchKey];
                    const scriptSrc = patchManifestInfo ? patchManifestInfo.file : 'Unknown script';
                    throw new Error(`Patch data object for "${patchKey}" (from ${scriptSrc}) is missing or invalid. Check the patch script file and browser console for loading errors.`);
                }


                // Process Replacements first
                if (patchData.replace && typeof patchData.replace === 'object') {
                    console.log(` -> Processing replacements for ${patchKey}`);
                    for (const regionName in patchData.replace) {
                        console.log(`    - Replacing region: ${regionName}`);
                        patchedContent = applyReplacement(patchedContent, patchKey, regionName, patchData.replace[regionName]);
                    }
                } else {
                     console.log(` -> No 'replace' object found or invalid for ${patchKey}`);
                }

                // Process Insertions
                if (patchData.insert && typeof patchData.insert === 'object') {
                     console.log(` -> Processing insertions for ${patchKey}`);
                    for (const markerName in patchData.insert) {
                         console.log(`    - Inserting at marker: ${markerName}`);
                        patchedContent = applyInsertion(patchedContent, patchKey, markerName, patchData.insert[markerName]);
                    }
                } else {
                     console.log(` -> No 'insert' object found or invalid for ${patchKey}`);
                }
                 console.log(` -> Finished patch: ${patchKey}`);
            });

            console.log("Patching process complete."); // Log end

            // --- 5. Create Download ---
            console.log("Creating download Blob...");
            // console.log("Final Patched Content (Check for garbled icons):\n", patchedContent); // Keep this for debugging if needed

            // Create Blob using UTF-8 which matches how patch files are saved/handled
            const blob = new Blob([patchedContent], { type: 'text/javascript;charset=utf-8' });
            const url = URL.createObjectURL(blob);

            downloadLink.href = url;
            downloadLink.style.display = 'block';
             console.log("Download link created.");
            alert('File patched successfully! Click the download link below.');


        } catch (error) {
             console.error("Error during patching loop:", error); // Log specific error
            alert(`An error occurred during patching:\n${error.message}\nCheck the console (F12) for more details.`);
        }
    }); // End of patchButton listener

    /**
     * Replaces a marked region with new code.
     * Markers: //PatchKeyBegin_RegionName ... //PatchKeyEnd_RegionName
     */
    function applyReplacement(content, patchKey, regionName, replacementCode) {
        const startMarker = `//${patchKey}Begin_${regionName}`;
        const endMarker = `//${patchKey}End_${regionName}`;

        // Ensure replacementCode is a string
        if (typeof replacementCode !== 'string') {
             console.warn(`Replacement code for "${regionName}" in patch "${patchKey}" is not a string. Skipping.`);
             return content;
        }

        // Find the start index
        const startIndex = content.indexOf(startMarker);
        if (startIndex === -1) {
            console.warn(`Replacement start marker "${startMarker}" not found in file. Skipping region "${regionName}".`);
            return content;
        }

        // Find the end index *after* the start index
        const endIndex = content.indexOf(endMarker, startIndex + startMarker.length);
        if (endIndex === -1) {
            console.warn(`Replacement end marker "${endMarker}" not found after start marker in file. Skipping region "${regionName}".`);
            return content;
        }

        // Construct the new content: part before + start marker + new code + end marker + part after
        const contentBefore = content.substring(0, startIndex);
        const contentAfter = content.substring(endIndex + endMarker.length);

        // Ensure newlines around the inserted code and markers for clarity
        const newBlock = `\n${replacementCode}\n`; // Add newlines to the replacement code itself

        return contentBefore + startMarker + newBlock + endMarker + contentAfter;
    }


    /**
     * Inserts code at a specific marker.
     * Marker: //PatchKeyInsert_MarkerName
     */
    function applyInsertion(content, patchKey, markerName, insertionCode) {
        const marker = `//${patchKey}Insert_${markerName}`;

         // Ensure insertionCode is a string
        if (typeof insertionCode !== 'string') {
             console.warn(`Insertion code for "${markerName}" in patch "${patchKey}" is not a string. Skipping.`);
             return content;
        }


        // Use RegExp for global replacement in case marker appears multiple times (though unlikely/undesirable)
        const regex = new RegExp(escapeRegExp(marker), 'g');

        if (!regex.test(content)) { // Use test first to avoid unnecessary replace operations
             console.warn(`Insertion marker "${marker}" not found in file. Skipping marker "${markerName}".`);
             return content;
        }

        // We replace the marker with the code *and* the marker below it.
        // Ensure newlines for clarity.
        const replacement = `\n${insertionCode}\n${marker}`;

        return content.replace(regex, replacement);
    }

    /**
     * Helper function to escape strings for use in a RegExp.
     */
    function escapeRegExp(string) {
        // $& means the whole matched string
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

}); // End DOMContentLoaded


