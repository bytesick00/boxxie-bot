import { Table } from "./classes.js";
import { TABLE_RANGES } from "./sheets.js";

export async function initializeTables(){
  const tableInfo = [
    {
      displayName: "Mun Info",
      range: TABLE_RANGES.munInfo
    },
    {
      displayName: "OC Info",
      range: TABLE_RANGES.ocInfo
    },
    {
      displayName: "Base Stats",
      range: TABLE_RANGES.baseStats
    },
    {
      displayName: "All Items",
      range: TABLE_RANGES.allItems
    },
    {
      displayName: "Current Stats",
      range: TABLE_RANGES.currentStats
    },
    {
      displayName: "Flavor Text",
      range: TABLE_RANGES.flavorText
    }
  ]

  let dataTables = [];
  let thisTable;

  for(let tableObj of tableInfo){
    thisTable = new Table(tableObj.displayName, tableObj.displayName, tableObj.range);
    await thisTable.refreshData();
    dataTables.push(thisTable)
  }

  return dataTables;
}

export async function initializeData(){
  await initializeTables();
}

export function initializeOCs(){
  let firstRow = true;
  ocInfoTable.forEach((row)=>{
    if(firstRow){
      firstRow = false;
    }
    else{
      let thisOC = new Character(row);
      allCharacters.push(thisOC);
    }
  })

  allCharacters.forEach((OC)=>{
    let baseStats = filterTable(baseStatsTable, 0, OC.name);
    OC.setBaseStats(baseStats);
  })
}

export function getOC(name){
  let char;
  allCharacters.forEach((OC)=>{
    if(OC.name == name){
      char = OC;
    }
  })
  return char;
}

// export async function initializeData(){
//   try {
//     await getStaticData();
//     initializeOCs();
//     return true;
//   } catch (error) {
//     console.debug(error);
//     return false;
//   }

// }