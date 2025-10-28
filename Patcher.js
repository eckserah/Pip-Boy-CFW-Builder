document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('file-input');
    const patchListDiv = document.getElementById('patch-list');
    const patchButton = document.getElementById('patch-button');
    const downloadLink = document.getElementById('download-link');

    let baseFileContent = null;
    let patchScriptsLoaded = 0;
    const totalPatches = Object.keys(PATCH_MANIFEST).length;

    // --- 1. Patch Loading and UI Population ---

    if (totalPatches === 0) {
        patchListDiv.innerHTML = '<p>No patches found in manifest.</p>';
        return;
    }

    // Clear the "Loading..." text
    patchListDiv.innerHTML = '';

    // Loop through the manifest and dynamically load each patch script
    for (const patchKey in PATCH_MANIFEST) {
        const patchInfo = PATCH_MANIFEST[patchKey];
        const script = document.createElement('script');
        script.src = patchInfo.file;
        
        script.onload = () => {
            patchScriptsLoaded++;
            // When the script loads, it adds itself to `window.Patches`
            // Now we can create the checkbox for it
            createPatchCheckbox(patchKey, patchInfo);
            
            // If all patch scripts have been loaded, enable the UI
            if (patchScriptsLoaded === totalPatches) {
                console.log("All patches loaded and UI populated.");
            }
        };
        
        script.onerror = () => {
            console.error(`Failed to load patch file: ${patchInfo.file}`);
            patchScriptsLoaded++;
        };
        
        document.body.appendChild(script);
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

    // --- 2. File Handling ---

    fileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) {
            patchButton.disabled = true;
            patchButton.textContent = '1. Upload FW.js';
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            baseFileContent = e.target.result;
            patchButton.disabled = false;
            patchButton.textContent = 'Patch File';
            console.log('FW.js loaded.');
        };
        reader.readAsText(file);
    });

    // --- 3. Patching Logic ---

    patchButton.addEventListener('click', () => {
        if (!baseFileContent) {
            alert('Please upload a base FW.js file first.');
            return;
        }

        let patchedContent = baseFileContent;
        const selectedPatches = patchListDiv.querySelectorAll('input[type="checkbox"]:checked');

        if (selectedPatches.length === 0) {
            alert('No patches selected.');
            return;
        }

        try {
            selectedPatches.forEach(checkbox => {
                const patchKey = checkbox.dataset.patchKey;
                const patchData = window.Patches[patchKey];

                if (!patchData) {
                    throw new Error(`Patch data for "${patchKey}" not found. Did the script load correctly?`);
                }

                // Process Replacements first
                if (patchData.replace) {
                    for (const regionName in patchData.replace) {
                        patchedContent = applyReplacement(patchedContent, patchKey, regionName, patchData.replace[regionName]);
                    }
                }

                // Process Insertions
                if (patchData.insert) {
                    for (const markerName in patchData.insert) {
                        patchedContent = applyInsertion(patchedContent, patchKey, markerName, patchData.insert[markerName]);
                    }
                }
            });
			
			console.log("Patched Content (Check for garbled icons):\n", patchedContent);

            // --- 4. Create Download ---
            const blob = new Blob([patchedContent], { type: 'text/javascript' });
            const url = URL.createObjectURL(blob);
            
            downloadLink.href = url;
            downloadLink.style.display = 'block';
            alert('File patched successfully! Click the download link.');

        } catch (error) {
            alert(`An error occurred during patching:\n${error.message}`);
            console.error(error);
        }
    });

    /**
     * Replaces a marked region with new code.
     * Markers: //PatchKeyBegin_RegionName ... //PatchKeyEnd_RegionName
     */
    function applyReplacement(content, patchKey, regionName, replacementCode) {
        const startMarker = `//${patchKey}Begin_${regionName}`;
        const endMarker = `//${patchKey}End_${regionName}`;
        
        // 's' flag (dotall) is crucial for matching across newlines.
        const regex = new RegExp(`(${escapeRegExp(startMarker)})[\\s\\S]*?(${escapeRegExp(endMarker)})`, 'gs');
        
        if (!regex.test(content)) {
            console.warn(`Replacement region "${regionName}" for patch "${patchKey}" not found in file.`);
            return content;
        }
        
        // We replace the content *between* the markers, but keep the markers.
        // This allows the file to be patched again later.
        const newBlock = `$1\n${replacementCode}\n$2`;
        return content.replace(regex, newBlock);
    }

    /**
     * Inserts code at a specific marker.
     * Marker: //PatchKeyInsert_MarkerName
     */
    function applyInsertion(content, patchKey, markerName, insertionCode) {
        const marker = `//${patchKey}Insert_${markerName}`;
        
        // We replace the marker with the code *and* the marker.
        // This allows multiple insertions at the same point if needed,
        // and makes it clear the patch was applied.
        const replacement = `${insertionCode}\n${marker}`;
        
        if (content.indexOf(marker) === -1) {
            console.warn(`Insertion marker "${markerName}" for patch "${patchKey}" not found in file.`);
            return content;
        }

        return content.replace(new RegExp(escapeRegExp(marker), 'g'), replacement);
    }

    /**
     * Helper function to escape strings for use in a RegExp.
     */
    function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
    }
});