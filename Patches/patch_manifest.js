// This manifest is loaded by index.html
// It tells the patcher what to load.

const PATCH_MANIFEST = {
    // The key (e.g., "InvPatch") MUST match the object key in the patch file
    // and the marker name in FW.js.
    
    "InvPatch": {
        name: "Inventory Patch",
        description: "Adds new functions for the inventory system.",
        file: "Patches/InvPatch.js"
    },

    "IconMod": {
        name: "Icon Mod",
        description: "Replaces the default icons with an extended set.",
        file: "Patches/IconMod.js"
    },

    "PerksPatch": {
        name: "Perks System",
        description: "Inserts the new perks system.",
        file: "Patches/PerksPatch.js"
    }

    // Add new patches here
};