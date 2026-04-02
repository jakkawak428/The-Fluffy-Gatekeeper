// Utility to convert Arcane XP to FFF bot levels
// Arcane formula: XP for next = 5 * (level^2) + 50 * level + 100
// FFF formula: XP for next = 100 * (level^2)

import { readFileSync, writeFileSync } from "fs";
import path from "path";

const DATA_PATH = path.join(__dirname, "..", "..", "levelData.json");

function arcaneXPToFFFLevel(arcaneXP: number): { level: number, xp: number } {
    let level = 1;
    let xp = arcaneXP;
    // Find the highest FFF level where total XP required is <= arcaneXP
    while (xp >= 100 * level * level) {
        xp -= 100 * level * level;
        level++;
    }
    return { level, xp };
}

function convertAll() {
    const raw = readFileSync(DATA_PATH, "utf-8");
    const data = JSON.parse(raw);
    for (const userId in data) {
        // Only convert if the comment is present or if you want to convert all
        if (data[userId].xp && typeof data[userId].xp === "number") {
            const converted = arcaneXPToFFFLevel(data[userId].xp);
            data[userId].level = converted.level;
            data[userId].xp = converted.xp;
        }
    }
    writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
    console.log("Conversion complete!");
}

convertAll();
