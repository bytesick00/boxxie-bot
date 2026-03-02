import { JSONFilePreset  } from "lowdb/node";
import { SheetTable, DataTable, DataRow } from "./classes.js";

const munDefault = {
    muns: []
}

const inventoryDefault = {
    itemRows: []
}

const ocDefault = {
    ocs: []
}

export async function cacheShop(sheetRange, shopDb){
    const shopTable = await SheetTable.init(sheetRange.sheet, sheetRange.sheet, sheetRange.range);
    const shopDataTable = shopTable.getDataTable();
    
    for(const dataRow of shopDataTable.dataRows){
        const thisItem = {
            name: dataRow.getProp('Name'),
            type: dataRow.getProp('Item Type'),
            giftable: dataRow.getProp('Giftable'),
            description: dataRow.getProp('Description'),
            useText: dataRow.getProp('Use Flavor Text'),
            buyPrice: dataRow.getProp('Buy Price'),
            sellPrice: dataRow.getProp('Sell Price'),
            shopType: dataRow.getProp('Shop'),
            image: dataRow.getProp('Image Link')
        }

        shopDb.data.items.push(thisItem);
        await shopDb.write();
    }
}

// export function cacheAllData(sheetRanges){

//     for(const table of sheetRanges){
//         switch (table.sheet) {
//             case value:
                
//                 break;
        
//             default:
//                 break;
//         }
//     }
// }