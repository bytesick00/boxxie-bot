import { JSONFile, JSONFilePreset } from "lowdb/node";
import { SheetTable } from "./classes.js";
import { existsSync } from "node:fs";
import { Low } from "lowdb";
import { EmbedBuilder } from "discord.js";

export const SHEET_RANGES = [
        {
            sheet: "Mun Info",
            range: "A:H"
        },
        {
            sheet: "OC Info",
            range: "A:J"
        },
        {
            sheet: "Base Stats",
            range: "A:G"
        },
        {
            sheet: "All Items",
            range: "A:K"
        },
        {
            sheet: "Current Stats",
            range: "A:K"
        },
        {   sheet: "Inventory Rows",
            range: "A:E"
        },
        {
            sheet: "Mechanics",
            range: "A:C",
        },
        {
            sheet: "Flavor Text",
            range: "A:B"
        },
        {
            sheet: "Get Commands",
            range: "A:G"
        },
        {
            sheet: "Shops And Gacha",
            range: "A:E"
        },
        {
            sheet: "Custom Commands",
            range: "A:I"
        },
        {
            sheet: "All Awards",
            range: "A:H"
        },
        {
            sheet: "Award Rows",
            range: "A:E"
        }
]
const shopKeys = [
    {
        db: "name",
        sheet: "Name"
    },
    {
        db: "type",
        sheet: "Item Type"
    },
    {
        db: "giftable",
        sheet: "Giftable"
    },
    {
        db: "description",
        sheet: "Description"
    },
    {
        db: "useText",
        sheet: "Use Flavor Text"
    },
    {
        db: "buyPrice",
        sheet: "Buy Price"
    },
    {
        db: "sellPrice",
        sheet: "Sell Price"
    },
    {
        db: "shop",
        sheet: "Shop"
    },
    {
        db: "image",
        sheet: "Image Link"
    },
    {
        db: "amount",
        sheet: "Amount"
    },
    {
        db: "rarity",
        sheet: "Rarity"
    },
]
const munKeys = [
    {
        db: "name",
        sheet: "Mun Name"
    },
    {
        db: "pronouns",
        sheet: "Mun Pronouns"
    },
    {
        db: "timezone",
        sheet: "Timezone"
    },
    {
        db: "id",
        sheet: "Discord ID"
    },
    {
        db: "status",
        sheet: "Status"
    },
    {
        db: "scrip",
        sheet: "Scrip"
    },
    {
        db: "lifetimeScrip",
        sheet: "Lifetime Scrip"
    },
    {
        db: "ocs",
        sheet: "OCs"
    }
]
const ocKeys = [
    {
        db: "name",
        sheet: "Full Name"
    },
    {
        db: "aka",
        sheet: "AKA"
    },
    {
        db: "mun",
        sheet: "Mun"
    },
    {
        db: "age",
        sheet: "Age"
    },
    {
        db: "gender",
        sheet: "Gender"
    },
    {
        db: "pronouns",
        sheet: "Pronouns"
    },
    {
        db: "height",
        sheet: "Height"
    },
    {
        db: "birthday",
        sheet: "Birthday"
    },
    {
        db: "bloodType",
        sheet: "Blood Type"
    },
    {
        db: "image",
        sheet: "Photo Link"
    }
]
const baseStatKeys = [
    {
        db: "name",
        sheet: "Name"
    },
    {
        db: "wit",
        sheet: "WIT"
    },
    {
        db: "cha",
        sheet: "CHA"
    },
    {
        db: "str",
        sheet: "STR"
    },
    {
        db: "mve",
        sheet: "MVE"
    },
    {
        db: "dur",
        sheet: "DUR"
    },
    {
        db: "lck",
        sheet: "LCK"
    }
]
const currentStatKeys = [
    {
        db: "name",
        sheet: "Name"
    },
    {
        db: "wit",
        sheet: "WIT"
    },
    {
        db: "cha",
        sheet: "CHA"
    },
    {
        db: "str",
        sheet: "STR"
    },
    {
        db: "mve",
        sheet: "MVE"
    },
    {
        db: "dur",
        sheet: "DUR"
    },
    {
        db: "lck",
        sheet: "LCK"
    },
    {
        db: "reprints",
        sheet: "Reprints"
    },
    {
        db: "error",
        sheet: "Reprint Error"
    },
    {
        db: "daily",
        sheet: "Daily"
    },
    {
        db: "dailyConsequence",
        sheet: "Daily Consequence"
    }
]
const inventoryKeys = [
    {
        db: "id",
        sheet: "User ID"
    },
    {
        db: "mun",
        sheet: "Mun Name"
    },
    {
        db: "item",
        sheet: "Item"
    },
    {
        db: "amount",
        sheet: "Amount",
    },
    {
        db: "date",
        sheet: "Transaction Date"
    }
]
const mechanicKeys = [
    {
        db: "type",
        sheet: "Submission Type"
    },
    {
        db: "rate",
        sheet: "Rate"
    },
    {
        db: "description",
        sheet: "Description"
    },
    {
        db: "unit",
        sheet: "Per Unit"
    },
    {
        db: "category",
        sheet: "Type"
    }
]
const flavorTextKeys = [
    {
        db: "id",
        sheet: "Text ID"
    },
    {
        db: "text",
        sheet: "Flavor Text"
    }
]
const customKeys = [
    {
        db: "name",
        sheet: "Option Name"
    },
    {
        db: "title",
        sheet: "Title"
    },
    {
        db: "description",
        sheet: "Description"
    },
    {
        db: "thumbnail",
        sheet: "Thumbnail"
    },
    {
        db: "image",
        sheet: "Image"
    },
    {
        db: "link",
        sheet: "Link"
    },
    {
        db: "embed",
        sheet: "Embed?"
    }
]
const shopsAndGachaKeys = [
    {
        db: "name",
        sheet: "Name"
    },
    {
        db: "open",
        sheet: "Open"
    },
    {
        db: "type",
        sheet: "Type"
    },
    {
        db: "description",
        sheet: "Description"
    },
    {
        db: "gachaPrice",
        sheet: "Gacha Price"
    }
]
const prefixCommandKeys = [
    {
        db: "command",
        sheet: "Command"
    },
    {
        db: "text",
        sheet: "Text"
    },
    {
        db: "priority",
        sheet: "Priority"
    },
    {
        db: "limited",
        sheet: "Limited"
    },
    {
        db: "item",
        sheet: "Item"
    },
    {
        db: "money",
        sheet: "Money"
    },
    {
        db: "image",
        sheet: "Image"
    },
    {
        db: "embed",
        sheet: "Embed"
    },
    {
        db: "notes",
        sheet: "Notes"
    }
]
const awardKeys = [
    {
        db: "name",
        sheet: "Name"
    },
    {
        db: "type",
        sheet: "Award Type"
    },
    {
        db: "giftable",
        sheet: "Giftable"
    },
    {
        db: "description",
        sheet: "Description"
    },
    {
        db: "emoji",
        sheet: "Emoji ID"
    },
    {
        db: "image",
        sheet: "Image Link"
    },
    {
        db: "imageEmbed",
        sheet: "Image"
    },
    {
        db: "notes",
        sheet: "Notes"
    }
]
const awardRowKeys = [
    {
        db: "id",
        sheet: "User ID"
    },
    {
        db: "mun",
        sheet: "Mun Name"
    },
    {
        db: "award",
        sheet: "Award"
    },
    {
        db: "amount",
        sheet: "Amount"
    },
    {
        db: "date",
        sheet: "Transaction Date"
    }
]
const allKeys = {
    'All Items': {keys: shopKeys, field: "shop"},
    'Mun Info': {keys: munKeys, field: "muns"},
    'OC Info': {keys: ocKeys, field: "ocs"},
    'Base Stats': {keys: baseStatKeys, field: "baseStats"},
    'Current Stats': {keys: currentStatKeys, field: "currentStats"},
    'Inventory Rows': {keys: inventoryKeys, field: "inventory"},
    'Mechanics': {keys: mechanicKeys, field: "mechanics"},
    'Flavor Text': {keys: flavorTextKeys, field: "flavorText"},
    'Get Commands': {keys: customKeys, field: "customCommands"},
    'Shops And Gacha': {keys: shopsAndGachaKeys, field: "shopsAndGacha"},
    'Custom Commands': {keys: prefixCommandKeys, field: "prefixCommands"},
    'All Awards': {keys: awardKeys, field: "awards"},
    'Award Rows': {keys: awardRowKeys, field: "awardRows"}
}

const dbDefault = {
    shop: [],
    muns: [],
    ocs: [],
    baseStats: [],
    currentStats: [],
    inventory: [],
    flavorText: [],
    customCommands: [],
    mechanics: [],
    sublevelRuns: [],
    shopsAndGacha: [],
    prefixCommands: [],
    awards: [],
    awardRows: []
}

const cachePath = './data/cached-data.json';

/**
 * db adapter
 *
 * @type {Low}
 */
let db; 

async function setUpAdapter(){
    
    if(existsSync(cachePath)){
        db = new Low(new JSONFile(cachePath), {})
        await db.read();
    }
    else{
        db = await JSONFilePreset(cachePath, dbDefault)
    }

}

export async function cacheAllData(overwrite = false){
    await setUpAdapter();
    
    for(const sheetRange of SHEET_RANGES){
        const tableKeys = allKeys[sheetRange.sheet].keys
        const tableField = allKeys[sheetRange.sheet].field
        await cacheData(sheetRange, tableKeys, tableField, overwrite)
    }

}

// Fields stored only locally (not from Google Sheets) — preserved across restarts.
const LOCAL_FIELDS = new Set(['sublevelRuns', 'sublevelElevator', 'activeRuns']);

/**
 * Initialize the cache on startup.
 * Always re-fetches Google Sheets data, but preserves local-only fields
 * (sublevel runs, elevator stats, active runs).
 */
export async function initCache() {
    await setUpAdapter();

    // Save local-only data before the sheets overwrite
    const preserved = {};
    for (const field of LOCAL_FIELDS) {
        if (db.data[field] !== undefined) {
            preserved[field] = db.data[field];
        }
    }

    // Snapshot limited-use counters so they survive the sheet refresh.
    // Keyed by "command\0text" so we can match rows even when names repeat.
    const oldLimited = new Map();
    if (db.data.prefixCommands) {
        for (const cmd of db.data.prefixCommands) {
            if (cmd.limited && cmd.limited !== '') {
                oldLimited.set(`${cmd.command}\0${cmd.text}`, cmd.limited);
            }
        }
    }

    // Pull fresh data from sheets (overwrite = true)
    console.log('Pulling fresh data from Google Sheets...');
    for (const sheetRange of SHEET_RANGES) {
        const tableKeys = allKeys[sheetRange.sheet].keys;
        const tableField = allKeys[sheetRange.sheet].field;
        await cacheData(sheetRange, tableKeys, tableField, true);
    }

    // Restore local-only data
    for (const [field, value] of Object.entries(preserved)) {
        db.data[field] = value;
    }

    // Merge cached limited counters back: keep whichever value is lower
    // (a lower number means more uses were consumed).
    if (db.data.prefixCommands) {
        for (const cmd of db.data.prefixCommands) {
            const key = `${cmd.command}\0${cmd.text}`;
            if (oldLimited.has(key)) {
                const cached = parseInt(oldLimited.get(key));
                const sheet  = parseInt(cmd.limited);
                if (!isNaN(cached) && (isNaN(sheet) || cached < sheet)) {
                    cmd.limited = String(cached);
                }
            }
        }
    }

    await db.write();
    console.log('Cache initialized — sheets refreshed, local data preserved.');
}

/**
 * Hard reset: wipe ALL cached data (including local runs) and re-fetch from sheets.
 */
export async function hardReset() {
    await setUpAdapter();
    db.data = { ...dbDefault };

    console.log('Hard reset — pulling fresh data from Google Sheets...');
    for (const sheetRange of SHEET_RANGES) {
        const tableKeys = allKeys[sheetRange.sheet].keys;
        const tableField = allKeys[sheetRange.sheet].field;
        await cacheData(sheetRange, tableKeys, tableField, true);
    }
    await db.write();
    console.log('Hard reset complete — all local data cleared.');
}

// ---- Active runs persistence ----

export async function saveActiveRuns(runsMap) {
    if (!db) await setUpAdapter();
    const serialized = {};
    for (const [channelId, run] of runsMap) {
        serialized[channelId] = {
            floors: run.floors,
            finalized: [...run.finalized],
            characters: Object.fromEntries(
                [...run.characters].map(([name, data]) => [name, data])
            ),
            startMessageId: run.startMessageId,
            password: run.password || null,
            level: run.level || 'depth1',
        };
    }
    db.data.activeRuns = serialized;
    await db.write();
}

export function loadActiveRuns() {
    const data = db?.data?.activeRuns;
    const runs = new Map();
    if (!data) return runs;
    for (const [channelId, run] of Object.entries(data)) {
        runs.set(channelId, {
            floors: run.floors,
            finalized: new Set(run.finalized || []),
            characters: new Map(Object.entries(run.characters || {})),
            startMessageId: run.startMessageId || null,
            password: run.password || null,
            level: run.level || 'depth1',
        });
    }
    return runs;
}

async function cacheData(sheetRange, tableKeys, field, overwrite){
    const thisTable = await SheetTable.init(sheetRange.sheet, sheetRange.sheet, sheetRange.range);
    const thisDataTable = thisTable.getDataTable();

    if(overwrite){
        db.data[field] = [];
    }
    
    for(const dataRow of thisDataTable.dataRows){
        const thisItem = {}
        for(const prop of tableKeys){
            thisItem[prop.db]= dataRow.getProp(prop.sheet)
        }

        //Only overwrites data if told to
        if(overwrite || !db.data[field].some(e => Object.values(e)[0] == Object.values(thisItem)[0])){
            db.data[field].push(thisItem);
            await db.write();
        }

    }
}

export async function cacheField(field, overwrite){
    const tableKeys = getFieldProperties(field);
    const sheetName = getSheetName(field);

    await cacheData(SHEET_RANGES.find(range => range.sheet === sheetName), tableKeys, field, overwrite);
    console.log(`Cached ${field} data, overwrite=${overwrite}`);
}

export async function updateData(field, indexProperty, indexValue, property, newValue){
    
    //updates sheet
    const sheetName = getSheetName(field);
    const sheetTable = await SheetTable.init(field, sheetName, SHEET_RANGES.find(table => table.sheet === sheetName).range);
    
    sheetTable.updateValue(indexValue, getSheetColumnName(field, indexProperty), getSheetColumnName(field, property), newValue);

    //updates cache
    const dataRow = db.data[field].find(row=>row[indexProperty]===indexValue)
    dataRow[property] = String(newValue);
    await db.write();

}

export async function addData(field, newDataObject){
    //update sheet
    const sheetName = getSheetName(field);
    const sheetTable = await SheetTable.init(field, sheetName, SHEET_RANGES.find(table => table.sheet === sheetName).range);
    
    sheetTable.appendRow(Object.values(newDataObject))

    //updates cache
    db.data[field].push(newDataObject);
    await db.write();
}

export function getData(field, searchProperty, searchValue){
    
    const fieldData = db.data[field];

    return fieldData.find((item => item[searchProperty] === searchValue));
}

/** 
 * 
 * @param {string} field 
 * @return {Object[]} array of "table row" data objects
 */
export function getTableData(field){
    
    if(db === undefined){ 
        return setUpAdapter().then(()=>{
            return db.data[field]
        })
    }else{
        return db.data[field];
    }
}

function getSheetName(field){
    return Object.keys(allKeys)[Object.values(allKeys).findIndex(table=> table.field === field)];
}

function getSheetColumnName(field, dbProp){
    const keys = Object.values(allKeys).find(table => table.field === field).keys;
    return keys.find(property => property.db === dbProp).sheet;
}

export function getFieldProperties(field){
    return Object.values(allKeys).find(table => table.field === field).keys.map(key => key.db)

}

/**
 * Persist the current in-memory cache to disk (lowdb) without touching Google Sheets.
 */
export async function writeCache() {
    if (!db) await setUpAdapter();
    await db.write();
}

export async function addSublevelRun(run) {
    if (!db.data.sublevelRuns) db.data.sublevelRuns = [];
    db.data.sublevelRuns.push(run);

    // Update elevator unlocks (global deepest floor reached)
    if (!db.data.sublevelElevator) db.data.sublevelElevator = { deepest: 0, totalRuns: 0, totalFloors: 0 };
    const elevator = db.data.sublevelElevator;
    elevator.totalRuns++;
    elevator.totalFloors += run.floors;
    if (run.floors > elevator.deepest) elevator.deepest = run.floors;

    await db.write();
}

export function getSublevelElevator() {
    if (!db.data.sublevelElevator) return { deepest: 0, totalRuns: 0, totalFloors: 0 };
    return db.data.sublevelElevator;
}

/**
 * Adds an inventory row to the sheet (append-only, safe),
 * then consolidates the in-memory cache so lookups stay clean.
 * The sheet keeps the full transaction log; the cache holds net totals.
 */
export async function addInventoryRow(newRowData) {
    // Normalize 'name' key to 'mun' for consistency
    if (newRowData.name && !newRowData.mun) {
        newRowData.mun = newRowData.name;
        delete newRowData.name;
    }

    // Append to sheet (single safe API call, same as addData)
    const sheetName = getSheetName('inventory');
    const sheetTable = await SheetTable.init('inventory', sheetName, SHEET_RANGES.find(table => table.sheet === sheetName).range);
    sheetTable.appendRow([newRowData.id, newRowData.mun, newRowData.item, newRowData.amount, newRowData.date]);

    // Add to cache then consolidate in-memory only
    db.data.inventory.push(newRowData);
    consolidateInventoryCache();
    await db.write();
}

/**
 * Adds an award row to the sheet (append-only),
 * then consolidates the in-memory cache.
 */
export async function addAwardRow(newRowData) {
    // Append to sheet
    const sheetName = getSheetName('awardRows');
    const sheetTable = await SheetTable.init('awardRows', sheetName, SHEET_RANGES.find(table => table.sheet === sheetName).range);
    sheetTable.appendRow([newRowData.id, newRowData.mun, newRowData.award, newRowData.amount, newRowData.date]);

    // Add to cache then consolidate
    db.data.awardRows.push(newRowData);
    consolidateAwardCache();
    await db.write();
}

/**
 * Consolidates all award cache rows: groups by (user ID + award),
 * sums amounts, and removes entries that are 0 or below.
 */
function consolidateAwardCache() {
    const awardRows = db.data.awardRows;
    if (!awardRows) return;
    const consolidated = new Map();

    for (const row of awardRows) {
        const key = `${row.id}|${row.award}`;
        const munName = row.mun || row.name;
        const amt = parseInt(row.amount);
        if (isNaN(amt)) continue;

        if (consolidated.has(key)) {
            const existing = consolidated.get(key);
            existing.amount = String(parseInt(existing.amount) + amt);
            existing.date = row.date;
        } else {
            consolidated.set(key, {
                id: row.id,
                mun: munName,
                award: row.award,
                amount: String(amt),
                date: row.date
            });
        }
    }

    db.data.awardRows = [...consolidated.values()].filter(
        row => parseInt(row.amount) > 0
    );
}

/**
 * Consolidates all inventory cache rows: groups by (user ID + item),
 * sums amounts, and removes entries that are 0 or below.
 */
function consolidateInventoryCache() {
    const inventory = db.data.inventory;
    const consolidated = new Map();

    for (const row of inventory) {
        const key = `${row.id}|${row.item}`;
        const munName = row.mun || row.name;
        const amt = parseInt(row.amount);
        if (isNaN(amt)) continue;

        if (consolidated.has(key)) {
            const existing = consolidated.get(key);
            existing.amount = String(parseInt(existing.amount) + amt);
            existing.date = row.date;
        } else {
            consolidated.set(key, {
                id: row.id,
                mun: munName,
                item: row.item,
                amount: String(amt),
                date: row.date
            });
        }
    }

    db.data.inventory = [...consolidated.values()].filter(
        row => parseInt(row.amount) > 0
    );
}

// ---- 24-Hour Bidirectional Sync ----

const SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
let syncTimer = null;
let nextSyncAt = null;

/**
 * Bidirectional sync between Google Sheets and local JSON cache.
 * 
 * Strategy per data type:
 * 
 * 1. **Stats (currentStats, baseStats)**: Bot writes to both sheet+cache in real-time.
 *    Pull from sheet to pick up any manual edits made directly on the spreadsheet.
 *
 * 2. **OC Info (ocs)**: Same as stats - bot writes to both, pull from sheet for manual edits.
 *
 * 3. **Custom Commands (prefixCommands)**: The `limited` field is decremented ONLY
 *    in the local cache at runtime, never pushed to sheet. On sync we:
 *    - Snapshot local limited counters
 *    - Pull fresh commands from sheet (picks up new commands, text changes, etc.)
 *    - Merge limited counters: keep whichever is LOWER (more uses consumed)
 *    - Push consumed limited counters back to sheet so the spreadsheet stays accurate
 *
 * 4. **Item amounts (shop/All Items)**: Bot decrements amounts in both sheet+cache.
 *    Pull from sheet to resolve any drift. If local amount is lower (more consumed),
 *    push local value back to sheet.
 *
 * 5. **Muns, Inventory, Mechanics, Flavor Text, Shops & Gacha, Get Commands**:
 *    Pull from sheet to pick up any manual changes.
 *
 * 6. **Local-only data** (sublevelRuns, sublevelElevator, activeRuns):
 *    Never overwritten - preserved across syncs.
 */
export async function periodicSync(client) {
    console.log(`[Sync] Starting periodic sync at ${new Date().toISOString()}...`)

    try {
        if (!db) await setUpAdapter();

        // ── 1. Preserve local-only fields ──
        const preserved = {};
        for (const field of LOCAL_FIELDS) {
            if (db.data[field] !== undefined) {
                preserved[field] = db.data[field];
            }
        }

        // ── 2. Snapshot bot-modified data before pulling from sheet ──

        // 2a. Limited counters for custom commands (only decremented locally)
        const oldLimited = new Map();
        if (db.data.prefixCommands) {
            for (const cmd of db.data.prefixCommands) {
                if (cmd.limited && cmd.limited !== '') {
                    oldLimited.set(`${cmd.command}\0${cmd.text}`, cmd.limited);
                }
            }
        }

        // 2b. Item amounts (bot decrements in real-time to both sheet+cache,
        //     but snapshot in case of drift)
        const oldItemAmounts = new Map();
        if (db.data.shop) {
            for (const item of db.data.shop) {
                if (item.amount !== undefined && item.amount !== '') {
                    oldItemAmounts.set(item.name, item.amount);
                }
            }
        }

        // ── 3. Pull fresh data from Google Sheets ──
        for (const sheetRange of SHEET_RANGES) {
            const tableKeys = allKeys[sheetRange.sheet].keys;
            const tableField = allKeys[sheetRange.sheet].field;
            await cacheData(sheetRange, tableKeys, tableField, true);
        }

        // ── 4. Restore local-only data ──
        for (const [field, value] of Object.entries(preserved)) {
            db.data[field] = value;
        }

        // ── 5. Merge custom command limited counters ──
        const limitedToPush = []; // entries whose local value is lower → push to sheet
        if (db.data.prefixCommands) {
            for (const cmd of db.data.prefixCommands) {
                const key = `${cmd.command}\0${cmd.text}`;
                if (oldLimited.has(key)) {
                    const cached = parseInt(oldLimited.get(key));
                    const sheet  = parseInt(cmd.limited);
                    if (!isNaN(cached) && (isNaN(sheet) || cached < sheet)) {
                        cmd.limited = String(cached);
                        limitedToPush.push(cmd);
                    }
                }
            }
        }

        // ── 6. Merge item amounts (keep lower = more consumed) ──
        const itemsToPush = [];
        if (db.data.shop) {
            for (const item of db.data.shop) {
                if (!oldItemAmounts.has(item.name)) continue;
                const localAmt  = parseInt(oldItemAmounts.get(item.name));
                const sheetAmt  = parseInt(item.amount);
                if (!isNaN(localAmt) && (isNaN(sheetAmt) || localAmt < sheetAmt)) {
                    item.amount = String(localAmt);
                    itemsToPush.push(item);
                }
            }
        }

        // ── 7. Consolidate inventory and award caches ──
        consolidateInventoryCache();
        consolidateAwardCache();

        // Save merged cache to disk
        await db.write();

        // ── 8. Push consumed limited counters back to sheet ──
        for (const cmd of limitedToPush) {
            try {
                const sheetName = getSheetName('prefixCommands');
                const sheetTable = await SheetTable.init(
                    'prefixCommands', sheetName,
                    SHEET_RANGES.find(t => t.sheet === sheetName).range
                );
                sheetTable.updateValue(
                    cmd.command,
                    getSheetColumnName('prefixCommands', 'command'),
                    getSheetColumnName('prefixCommands', 'limited'),
                    cmd.limited
                );
            } catch (e) {
                console.error(`[Sync] Failed to push limited counter for command "${cmd.command}":`, e);
            }
        }

        // ── 9. Push corrected item amounts back to sheet ──
        for (const item of itemsToPush) {
            try {
                const sheetName = getSheetName('shop');
                const sheetTable = await SheetTable.init(
                    'shop', sheetName,
                    SHEET_RANGES.find(t => t.sheet === sheetName).range
                );
                sheetTable.updateValue(
                    item.name,
                    getSheetColumnName('shop', 'name'),
                    getSheetColumnName('shop', 'amount'),
                    item.amount
                );
            } catch (e) {
                console.error(`[Sync] Failed to push item amount for "${item.name}":`, e);
            }
        }

        // ── 10. Reset daily cooldowns and consequences for all characters ──
        if (db.data.currentStats) {
            for (const stat of db.data.currentStats) {
                stat.daily = '';
                stat.dailyConsequence = '';
            }
            await db.write();
            console.log(`[Sync] Reset daily cooldowns for ${db.data.currentStats.length} characters.`);
        }

        console.log(`[Sync] Complete. Pushed ${limitedToPush.length} limited counters, ${itemsToPush.length} item amounts to sheet.`);

        // ── 11. Send daily refresh embed to cubicles channel ──
        if (client) {
            try {
                const CUBICLES_CHANNEL_ID = '1463329881705414743';
                const channel = await client.channels.fetch(CUBICLES_CHANNEL_ID).catch(() => null);
                if (channel) {
                    const commands = db.data.prefixCommands || [];
                    const titleCmd = commands.find(cmd => cmd.command?.trim().toLowerCase() === 'daily_title' && cmd.text);
                    const descCmd = commands.find(cmd => cmd.command?.trim().toLowerCase() === 'daily_refresh' && cmd.text);

                    const embed = new EmbedBuilder()
                        .setTitle(titleCmd?.text?.trim() || 'Daily Refreshed')
                        .setDescription(descCmd?.text?.trim() || 'The daily reset has occurred!')
                        .setColor(0xacd46e);

                    await channel.send({ embeds: [embed] });
                    console.log('[Sync] Sent daily refresh embed to cubicles channel.');
                } else {
                    console.error(`[Sync] Could not find cubicles channel ${CUBICLES_CHANNEL_ID}`);
                }
            } catch (embedErr) {
                console.error('[Sync] Failed to send daily refresh embed:', embedErr);
            }
        }

    } catch (e) {
        console.error('[Sync] Periodic sync failed:', e);
    }
}

/**
 * Start the 24-hour sync timer. Call once at startup after initCache().
 */
export function startPeriodicSync(client) {
    if (syncTimer) {
        clearInterval(syncTimer);
    }
    nextSyncAt = Date.now() + SYNC_INTERVAL_MS;
    syncTimer = setInterval(() => {
        nextSyncAt = Date.now() + SYNC_INTERVAL_MS;
        periodicSync(client).catch(e => console.error('[Sync] Unhandled error:', e));
    }, SYNC_INTERVAL_MS);

    console.log(`[Sync] Periodic sync scheduled every ${SYNC_INTERVAL_MS / 1000 / 60 / 60} hours.`);
}

/**
 * Returns ms until the next periodic sync (daily reset), or 0 if unknown.
 */
export function getTimeUntilNextSync() {
    if (!nextSyncAt) return 0;
    return Math.max(0, nextSyncAt - Date.now());
}

/**
 * Stop the 24-hour sync timer.
 */
export function stopPeriodicSync() {
    if (syncTimer) {
        clearInterval(syncTimer);
        syncTimer = null;
        console.log('[Sync] Periodic sync stopped.');
    }
}