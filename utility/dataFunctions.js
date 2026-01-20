import { Table, Character } from "./classes.js";
import { TABLE_RANGES } from "../sheets.js";

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

export function getTable(tableName, dataTables){
  return dataTables.find((table)=>{
    if(table.name === tableName){
      return table;
    }
  });
}

export function initializeOCs(ocInfoTable, baseStatsTable, currentStatsTable){
  let allCharacters = [];

  ocInfoTable.rowValues.forEach((row)=>{
    let thisOC = new Character(row);
    allCharacters.push(thisOC);
  })

  allCharacters.forEach((OC)=>{
    OC.setBaseStats(baseStatsTable, 'base');
    OC.refreshCurrentStats(currentStatsTable);
  })

  return allCharacters;
}

export function getCharacter(name, allCharacters){
  return allCharacters.find((OC)=>{
    if(OC.name.toLowerCase() === name.toLowerCase()){
      return OC;
    }
  });
}