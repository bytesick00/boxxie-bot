import { JSONFilePreset  } from "lowdb/node";
import { SheetTable, DataTable, DataRow } from "./classes.js";

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
        sheet: "Amount"
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

export async function cacheAllData(sheetRanges, db){
    for(const sheetRange of sheetRanges){
        const tableKeys = allKeys[sheetRange.sheet].keys
        const tableField = allKeys[sheetRange.sheet].field
        await cacheData(sheetRange, tableKeys, tableField, db)
    }
}

async function cacheData(sheetRange, tableKeys, field, db){
    const thisTable = await SheetTable.init(sheetRange.sheet, sheetRange.sheet, sheetRange.range);
    const thisDataTable = thisTable.getDataTable();
    
    for(const dataRow of thisDataTable.dataRows){
        const thisItem = {}
        for(const prop of tableKeys){
            thisItem[prop.db]= dataRow.getProp(prop.sheet)
        }

        db.data[field].push(thisItem);
        await db.write();
    }
}