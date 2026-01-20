import { pullInfo, appendToRange, updateRange, rowValueR1C1ToA1} from "../sheets.js";

export class Table {
  constructor(name, sheetName, rangeA1){
    this.name = name;
    this.sheetName = sheetName;
    this.rangeA1 = rangeA1;
    this.columnNames = [];
    this.rowValues = []; 
  }

  async refreshData(){
    //pulls data from sheet
    let rangeData = await pullInfo(this.sheetName, this.rangeA1);
    //separates into the column names and the value rows
    let firstRow = true;
    rangeData.forEach((row)=>{
      if(firstRow){
        this.columnNames = row;
        firstRow = false;
      }

      else{
        this.rowValues.push(row);
      }
    })
  }

  getColumnIndex(columnName){
    return this.columnNames.indexOf(columnName);
  }

  getRow(searchTerm, columnName){
    let info = [];
    const columnIndex = this.getColumnIndex(columnName);
    this.rowValues.forEach((row)=>{
      if(row[columnIndex] == searchTerm){
        info = row;
      }
    });

    if(info == null){
      throw new Error(`Could not find ${searchTerm} in column '${columnName}'`);
    }
    else{
      return info;
    }
  }

  lookupValue(searchTerm, searchColumnName, returnColumnName){
    try{
      const row = this.getRow(searchTerm, searchColumnName);
      const columnIndex = this.getColumnIndex(returnColumnName);

      return row[columnIndex];
    }
    catch{
      throw new Error(`Error searching for '${searchTerm}' in ${this.name} table`);
    }
  }

  lookupCellAddress(searchTerm, searchColumnName, returnColumnName){
    try{
      const row = this.getRow(searchTerm, searchColumnName);
      const rowIndex = this.rowValues.indexOf(row);
      const columnIndex = this.getColumnIndex(returnColumnName);

      return rowValueR1C1ToA1(rowIndex, columnIndex);
    }
    catch{
      throw new Error(`Error getting cell address for '${searchTerm}' in ${this.name} table`);
    }
  }

  updateValue(searchRowTerm, searchColumnName, changeColumnName, newValue){
    //gets row of the desired cell
    const updateRangeA1 = this.lookupCellAddress(searchRowTerm, searchColumnName, changeColumnName);
    updateRange(this.sheetName, updateRangeA1, newValue);

  }

  appendRow(rowValueArray){
    appendToRange(this.sheetName, this.rangeA1, rowValueArray);
  }

}

// export class serverData{
//   constructor(){
//     //static data
//     this.ocInfoTable;
//     this.munInfoTable;
//     this.baseStatsTable;
//     this.itemTable;
//     this.currentStatsTable;

//     //character array
//     this.allCharacters = [];
//   }

//   async getStaticData(){
//     this.munInfoTable = await pullInfo('Mun Info', TABLE_RANGES.munInfo);
//     this.ocInfoTable = await pullInfo('OC Info', TABLE_RANGES.ocInfo);
//     this.baseStatsTable = await pullInfo('Base Stats', TABLE_RANGES.baseStats);
//     this.itemTable = await pullInfo('All Items', TABLE_RANGES.allItems);  
//   }

//   refreshAllOCs(){
//     let firstRow = true;
//     this.ocInfoTable.forEach((row)=>{
//       if(firstRow){ //skips first row (property names)
//         firstRow = false;
//       }
//       else{
//         let thisOC = new Character(row);
//         thisOC.setBaseStats(filterTable(this.baseStatsTable, 0, thisOC.name));
//         this.allCharacters.push(thisOC);
//       }
//     })

//   }
// }

export class Character{
  constructor([name, aka, mun, age, gender, pronouns, height, birthday, bloodType, photoLink]){
    this.name = name;
    this.aka = aka;
    this.mun = mun;
    this.age = age;
    this.gender = gender;
    this.pronouns = pronouns;
    this.height = height;
    this.birthday = birthday;
    this.bloodType = bloodType;
    this.photoLink = photoLink;
  }

  setBaseStats(baseStatsTable){
    const stats = baseStatsTable.getRow(this.name, 'Name');
    this.baseStats = new Stats(stats, 'base');
  }

  refreshCurrentStats(currentStatsTable){
    const stats = currentStatsTable.getRow(this.name, 'Name');
    this.currentStats = new Stats(stats, 'current');
  }

  resetCurrentStats(){
    this.currentStats = new Stats(this.baseStats.getValues(), 'current');
  }
  
  reprintCharacter(currentStatsTable){
    const currentReprints = this.currentStats.reprints;
    this.resetCurrentStats();
    this.currentStats.updateStat('reprints', currentReprints+1, currentStatsTable);

    //gives randomized 5% error
    let errorChance = Math.random() <= 0.05;
    return errorChance;
  }

}

export class Mun{
  constructor([name, pronouns, timezone, id, status, scrip, ocNames]){

    this.name = name;
    this.pronouns = pronouns;
    this.timezone = timezone;
    this.id = id;
    this.status = status;
    this.scrip = scrip;
    this.ocs = ocNames;
  }
}

class Stats{
  constructor([ocName, wit, cha, str, mve, dur, lck, reprints = '0'], type){
    this.wit = wit;
    this.cha = cha;
    this.str = str;
    this.mve = mve;
    this.dur = dur;
    this.lck = lck;
    this.type = type;
    this.ocName = ocName;
    this.reprints = reprints;
  }

  updateStat(stat, value, statsTable){
    if(this.type === "base") return;
    this[stat] = value;

    statsTable.updateValue(this.ocName, 'Name', stat, this[stat]);
  }

  addToStat(stat, addValue, statsTable){
    if(this.type === "base") return;

    this[stat] = this[stat] + addValue;

    this.updateStat(stat, this[stat], statsTable);
  }

  getValues(){
    return [this.ocName, this.wit, this.cha, this.str, this.mve, this.dur, this.lck, this.reprints];
  }

}

class Item{
  constructor([name, type, description, useText, buyPrice, sellPrice, shopType, imageLink]){
    this.name = name;
    this.type = type;
    this.description = description;
    this.useText = useText;
    this.buyPrice = buyPrice;
    this.sellPrice = sellPrice;
    this.shopType = shopType;
    this.imageLink = imageLink;
  }
}