// This manifest is loaded by index.html
// It tells the patcher what to load.

const PATCH_MANIFEST = {
    // The key (e.g., "InvPatch") MUST match the object key in the patch file
    // and the marker name in FW.js.
    
    "InvPatch": {
        name: "Inventory Patch",
        description: "Adds items menu to the inventory tab.",
        file: "Patches/InvPatch.js"
    },

    "IconMod": {
        name: "Icon Mod",
        description: "Removes cog and holotape icons.",
        file: "Patches/IconMod.js"
    },

    "PerksPatch": {
        name: "Perks System",
        description: "Adds perks system.",
        file: "Patches/PerksPatch.js"
    }

    // Add new patches here
};