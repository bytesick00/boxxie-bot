import { JSONFile, JSONFilePreset } from "lowdb/node";
import { SheetTable } from "./classes.js";
import { existsSync } from "node:fs";
import { Low } from "lowdb";

export const SHEET_RANGES = [
        {
            sheet: "Mun Info",
            range: "A:G"
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
            range: "A:J"
        },
        {
            sheet: "Current Stats",
            range: "A:I"
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
            sheet: "Custom Commands",
            range: "A:G"
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
        db: "id",
        sheet: "ID"
    },
    {
        db: "image",
        sheet: "Image Link"
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
        db: "unit",
        sheet: "Per Unit"
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
const allKeys = {
    'All Items': {keys: shopKeys, field: "shop"},
    'Mun Info': {keys: munKeys, field: "muns"},
    'OC Info': {keys: ocKeys, field: "ocs"},
    'Base Stats': {keys: baseStatKeys, field: "baseStats"},
    'Current Stats': {keys: currentStatKeys, field: "currentStats"},
    'Inventory Rows': {keys: inventoryKeys, field: "inventory"},
    'Mechanics': {keys: mechanicKeys, field: "mechanics"},
    'Flavor Text': {keys: flavorTextKeys, field: "flavorText"},
    'Custom Commands': {keys: customKeys, field: "customCommands"}
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
    mechanics: []
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