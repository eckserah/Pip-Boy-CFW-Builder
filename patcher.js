document.addEventListener('DOMContentLoaded', () => {
    const fwSelect = document.getElementById('fw-select');     // Select dropdown
    const patchListDiv = document.getElementById('patch-list');
    const patchButton = document.getElementById('patch-button');
    const downloadLink = document.getElementById('download-link');

    let baseFileContent = null;
    let selectedFileName = 'FW_patched.js'; // Default download name
    let patchScriptsLoaded = 0;
    // Check if PATCH_MANIFEST exists and is defined before getting keys
    const totalPatches = (typeof PATCH_MANIFEST !== 'undefined' && PATCH_MANIFEST) ? Object.keys(PATCH_MANIFEST).length : 0;

    // --- 1. Populate FW Dropdown ---
    // Check if FW_VERSIONS exists and is defined
    if (typeof FW_VERSIONS === 'undefined' || !FW_VERSIONS || Object.keys(FW_VERSIONS).length === 0) {
        console.error("FW_VERSIONS manifest not found, is undefined, or is empty.");
        fwSelect.innerHTML = '<option value="">Error loading versions</option>';
        fwSelect.disabled = true;
        patchButton.disabled = true; // Disable patch button if FW versions fail
    } else {
        for (const versionKey in FW_VERSIONS) {
            const versionInfo = FW_VERSIONS[versionKey];
            const option = document.createElement('option');
            option.value = "Firmware/" + versionInfo.file; // Use filename as value for fetching
            option.textContent = versionInfo.name || `Version ${versionKey}`;
            fwSelect.appendChild(option);
        }
    }

    // --- 2. Patch Loading and UI Population ---
    if (totalPatches === 0) {
        patchListDiv.innerHTML = '<p>No patches found in manifest (PATCH_MANIFEST).</p>';
        // Don't completely disable if FW might load later, just note no patches
        if (!baseFileContent) patchButton.disabled = true;
    } else {
        // Clear the "Loading..." text
        patchListDiv.innerHTML = '';

        // Loop through the manifest and dynamically load each patch script
        for (const patchKey in PATCH_MANIFEST) {
            const patchInfo = PATCH_MANIFEST[patchKey];
            // Basic check if patchInfo is valid
            if (!patchInfo || !patchInfo.file) {
                console.error(`Invalid patch info for key "${patchKey}" in PATCH_MANIFEST.`);
                patchScriptsLoaded++; // Increment counter even for errors to avoid blocking UI
                const errorDiv = document.createElement('div');
                errorDiv.className = 'patch-item';
                errorDiv.style.color = 'red';
                errorDiv.innerHTML = `<label style="text-decoration: line-through;">${patchInfo?.name || patchKey}</label><p>Invalid manifest entry. Check console.</p>`;
                patchListDiv.appendChild(errorDiv);
                continue; // Skip to next patch
            }

            const script = document.createElement('script');
            script.src = patchInfo.file;
            script.async = false; // Load scripts sequentially to help ensure dependencies if needed

            script.onload = () => {
                patchScriptsLoaded++;
                // Check if the patch data was actually added by the script
                if (window.Patches && window.Patches[patchKey]) {
                    createPatchCheckbox(patchKey, patchInfo);
                    console.log(`Successfully loaded and processed patch: ${patchKey} from ${patchInfo.file}`);
                } else {
                    console.error(`Patch script ${patchInfo.file} loaded, but window.Patches.${patchKey} is undefined. Check the script content.`);
                     // Display an error in the UI for this patch
                    const errorDiv = document.createElement('div');
                    errorDiv.className = 'patch-item';
                    errorDiv.style.color = 'red';
                    errorDiv.innerHTML = `<label style="text-decoration: line-through;">${patchInfo.name}</label><p>Error loading patch data. Check script content & console.</p>`;
                    patchListDiv.appendChild(errorDiv);
                }

                // If all patch scripts have finished attempting to load
                if (patchScriptsLoaded === totalPatches) {
                    console.log(`All ${totalPatches} patch scripts processed.`);
                }
            };

            script.onerror = (event) => {
                console.error(`Failed to load patch script file: ${patchInfo.file}`, event);
                patchScriptsLoaded++;
                 // Display an error in the UI for this patch
                 const errorDiv = document.createElement('div');
                 errorDiv.className = 'patch-item';
                 errorDiv.style.color = 'red';
                 errorDiv.innerHTML = `<label style="text-decoration: line-through;">${patchInfo.name}</label><p>Failed to load script file (${patchInfo.file}). Check path & console.</p>`;
                 patchListDiv.appendChild(errorDiv);

                 if (patchScriptsLoaded === totalPatches) {
                    console.log(`All ${totalPatches} patch scripts processed (with errors).`);
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
            console.log(`Fetching FW: ${selectedFile}`);
            const response = await fetch(selectedFile);
            if (!response.ok) {
                // More specific error for common GitHub Pages 404
                if(response.status === 404 && window.location.hostname.endsWith('github.io')){
                     throw new Error(`HTTP 404: File not found. Make sure '${selectedFile}' exists in the repository and the filename/path in fw_manifest.js is correct (case-sensitive).`);
                } else {
                    throw new Error(`HTTP error! status: ${response.status} loading ${selectedFile}`);
                }
            }
            // Read as text using UTF-8 explicitly
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

        downloadLink.download = selectedFileName; // Set download name based on selected FW

        let patchedContent = baseFileContent;
        const selectedPatches = patchListDiv.querySelectorAll('input[type="checkbox"]:checked');

        if (selectedPatches.length === 0) {
            alert('No patches selected. Click Download to get the selected base FW file.');
             // Allow downloading the base file if no patches selected
             createDownloadLink(patchedContent, selectedFileName.replace('_patched.js', '.js')); // Use original name
            return;
        }

        console.log("Starting patching process...");

        // [REMOVED] Duplicate marker tracking set was here

        try {
            selectedPatches.forEach(checkbox => {
                const patchKey = checkbox.dataset.patchKey;
                console.log(`Applying patch: ${patchKey}`);
                const patchData = window.Patches[patchKey];

                // Robust check for patch data
                if (!patchData || typeof patchData !== 'object') {
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
                     console.log(` -> No valid 'replace' object found for ${patchKey}`);
                }

                // Process Insertions
                if (patchData.insert && typeof patchData.insert === 'object') {
                     console.log(` -> Processing insertions for ${patchKey}`);
                    for (const markerName in patchData.insert) {
                        const fullMarker = `//${patchKey}Insert_${markerName}`; // Construct the full marker string

                        console.log(`    - Inserting at marker: ${markerName}`);
                        const insertionCode = patchData.insert[markerName];
                        const originalLength = patchedContent.length; // Store length before insertion
                        patchedContent = applyInsertion(patchedContent, patchKey, markerName, insertionCode);

                        // [REPLACED] The broken check was here.
                        // applyInsertion handles logging a warning if the marker isn't found.
                        // We just check if the content actually changed.
                        if (patchedContent.length > originalLength) {
                             console.log(`    - Successfully inserted at ${fullMarker}`);
                        }
                    }
                } else {
                     console.log(` -> No valid 'insert' object found for ${patchKey}`);
                }
                 console.log(` -> Finished patch: ${patchKey}`);
            });

            console.log("Patching process complete.");

            // --- 5. Create Download ---
            createDownloadLink(patchedContent, selectedFileName);


        } catch (error) {
             console.error("Error during patching loop:", error); // Log specific error
            alert(`An error occurred during patching:\n${error.message}\nCheck the console (F12) for more details.`);
            downloadLink.style.display = 'none'; // Hide link on error
        }
    }); // End of patchButton listener

    /**
     * Creates the download link.
     */
     function createDownloadLink(content, filename) {
        console.log(`Creating download Blob for ${filename}...`);
        // console.log("Final Content:\n", content); // Keep for debugging if needed

        // Create Blob using UTF-8
        const blob = new Blob([content], { type: 'text/javascript;charset=utf-8' });
        const url = URL.createObjectURL(blob);

        downloadLink.href = url;
        downloadLink.download = filename; // Use the provided filename
        downloadLink.style.display = 'block';
        console.log("Download link created.");
        alert('File ready! Click the download link below.');
     }

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
        // Add newlines to the replacement code itself if they aren't already there
        const cleanReplacementCode = replacementCode.trim(); // Remove leading/trailing whitespace just in case
        const newBlock = `\n${cleanReplacementCode}\n`;

        console.log(`    - Successfully replaced content between ${startMarker} and ${endMarker}`);
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
             console.warn(`    - Insertion code for "${markerName}" in patch "${patchKey}" is not a string. Skipping.`);
             return content; // Return original content unchanged
        }

        // Use RegExp for global replacement
        const regex = new RegExp(escapeRegExp(marker) + '(?![a-zA-Z0-9_])', 'g');
        let found = false;

        // Ensure newlines for clarity. Place new code ABOVE marker.
        const cleanInsertionCode = insertionCode.trim(); // Remove leading/trailing whitespace
        const replacement = `\n${cleanInsertionCode}\n${marker}`; // Add marker back below inserted code


        const newContent = content.replace(regex, (match) => {
             found = true;
             return replacement;
        });

        if (!found) {
             console.warn(`    - Insertion marker "${marker}" not found in file. Skipping marker "${markerName}".`);
             return content; // Return original content if marker wasn't found
        }

        return newContent; // Return the modified content
    }

    /**
     * Helper function to escape strings for use in a RegExp.
     */
    function escapeRegExp(string) {
        // $& means the whole matched string
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

}); // End DOMContentLoaded