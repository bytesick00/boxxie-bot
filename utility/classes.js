import { pullInfo, appendToRange, updateRange, rowValueR1C1ToA1} from "../sheets.js";

/**
 * Holds data as an array of DataRow objects, in the form {header1: value1, header2: value2, ...}
 *
 * @class DataTable
 * @typedef {DataTable}
 */
export class DataTable{
  /**
   * Creates an instance of DataTable.
   *
   * @constructor
   * @param {string} name The name of the table 
   * @param {DataRow[]} dataRowArray An array holding all of the DataRow objects of the table
   * @param {SheetTable} parentSheetTable The parent SheetTable that this formatted table represents
   */
  constructor(name, dataRowArray, parentSheetTable){
    this.name = name;
    this.parentSheetTable = parentSheetTable
    
    let rows = [];
    dataRowArray.forEach(row=>(
      rows.push(new DataRow(row, this))
    ));

    this.dataRows = rows;
  }

  /**
   * Adds a row to the spreadsheet table
   *
   * @type {DataRow}
   */
  set addRow(dataRow){
    this.parentSheetTable.appendRow(dataRow.values());
  }

  async pullData(){
    const newSheetTable = await SheetTable.init(this.name, this.parentSheetTable.sheetName, this.parentSheetTable.rangeA1);
    this.dataRows = newSheetTable.getDataTable();
    this.parentSheetTable = newSheetTable;

    return this;
  }

  
  /**
   * Gets a DataRow from the table
   *
   * @param {string} searchTerm 
   * @param {string} searchColumnName 
   * @param {boolean} [fuzzy=false] Search for a substring instead of exact string value. Defaults to false. 
   * @returns {DataRow} 
   */
  getRow(searchTerm, searchColumnName, fuzzy = false){

    try{
      for(const dataRow of this.dataRows){
        let value = dataRow.dataObject[searchColumnName];
        if(fuzzy){
          if(value.includes(searchTerm)){
            return dataRow;
          }
        } 
        else{
          if(value == searchTerm){
            return dataRow;
          }
        }
      }
    }
    catch {
      for(const dataRow of this.dataRows.dataRows){
        let value = dataRow.dataObject[searchColumnName];
        if(fuzzy){
          if(value.includes(searchTerm)){
            return dataRow;
          }
        } 
        else{
          if(value === searchTerm){
            return dataRow;
          }
        }
      }
    }
    
  }

}

export class DataRow{
  /**
   * Creates an instance of DataRow.
   *
   * @constructor
   * @param {Object} dataObject The object containing all of the row values
   * @param {DataTable} parentDataTable The DataTable that contains this row
   */
  constructor(dataObject, parentDataTable){
    this.dataObject = dataObject;
    this.parentDataTable = parentDataTable;
  }

  get parentSheetTable(){
    return this.parentDataTable.parentSheetTable;
  }

  /**
   * Updates the sheet value and dataRow value for the specified property
   *
   * @type {(string|number)}
   */
  setProp(indexValue, indexProperty, changeProperty, newValue){

    this.parentSheetTable.updateValue(indexValue, indexProperty, changeProperty, newValue);

    this.dataObject[changeProperty] = newValue;
  }

  getProp(propertyName){
    return this.dataObject[propertyName];
  }

  async pullData(){
    const newDataTable = await this.parentDataTable.pullData();
    this.dataObject = newDataTable[this.name];
    this.parentDataTable = newDataTable;

    return this;
  }

}

/**
 * Holds all of the data for the server
 * 
 * @class AnomalyBoxData
 * @typedef {AnomalyBoxData}
 * @property {DataTable} AnomalyBoxData.munInfo - Mun information
 * @property {DataTable} AnomalyBoxData.ocInfo - OC information
 * 
 */
export class AnomalyBoxData {
   
    /**
     * Creates an instance of AnomalyBoxData.
     *
     * @constructor
     * @param {[DataTable, DataTable, DataTable, DataTable, DataTable, DataTable, DataTable, DataTable]} _dataTables 
     * @param {DataTable} _dataTables.munInfo 
     * @param {DataTable} _dataTables.ocInfo 
     * @param {DataTable} _dataTables.baseStats 
     * @param {DataTable} _dataTables.allItems 
     * @param {DataTable} _dataTables.currentStats 
     * @param {DataTable} _dataTables.inventoryRows 
     * @param {DataTable} _dataTables.mechanics 
     * @param {DataTable} _dataTables.flavorText 
     */
    constructor([munInfo, ocInfo, baseStats, allItems, currentStats, inventoryRows, mechanics, flavorText, customCommands]){
        this.munInfo = munInfo;
        this.ocInfo = ocInfo;
        this.baseStats = baseStats;
        this.allItems = allItems;
        this.currentStats = currentStats;
        this.inventoryRows = inventoryRows;
        this.mechanics = mechanics;
        this.flavorText = flavorText;
        this.customCommands = customCommands;
    }

    static async init(sheetRanges){
      const output = [];
      let thisTable;
      for(const table of sheetRanges){
          thisTable = await SheetTable.init(table.sheet, table.sheet, table.range);
          output.push(thisTable.getDataTable());
      }

      return new AnomalyBoxData(output);
    }

    get dataTables(){
      return [this.munInfo, this.ocInfo, this.baseStats, this.allItems, this.currentStats, this.inventoryRows, this.mechanics, this.flavorText, this.customCommands];
    }
    /**
     * Gets the OC as a Character object
     *
     * @param {string} name 
     * @param {boolean} [fuzzy=false] 
     * @returns {Character} 
     */
    getOC(name, fuzzy = false){

      const thisOCRow = this.ocInfo.dataRows.getRow(name, "Full Name", fuzzy);
      const thisBaseStatsRow = this.baseStats.dataRows.getRow(name, "Name", fuzzy);
      const thisCurrentStatsRow = this.currentStats.getRow(name, "Name", fuzzy);

      const character = new Character(thisOCRow, thisBaseStatsRow, thisCurrentStatsRow);
      return character
    }

    getMun(id){
      const munRow = this.munInfo.dataRows.getRow(id, 'Discord ID');
      const mun = new Mun(munRow);

      return mun;
    }

    get allOCNames(){
      const ocNames = [];
      const ocData = this.ocInfo.dataRows;

      try{
        ocData.forEach((row)=>{
        ocNames.push(row.getProp("Full Name"))
      });
      }
      catch{
        ocData.dataRows.forEach((row)=>{
        ocNames.push(row.getProp("Full Name"))
      });
      }

      return ocNames;
    }

    async pullData(){
      try {
        this.dataTables.forEach(async (dataTable)=>{
          dataTable = await dataTable.pullData();
        })
        return true;
      } catch (error) {
        console.debug(error)
        return false;
      }
    }

    getFlavorText(text_id){
      for(const row of this.flavorText.dataRows){
        if(row.getProp("Text ID") === text_id){ 
          return row.getProp("Flavor Text");
        }
      }
    }

    get allCustomCommandOptions(){
      let commands = [];
      for(const row of this.customCommands.dataRows){
        commands.push(row.getProp("Option Name"));
      }

      return commands;
    }

    getCustomCommand(optionName){
      return this.customCommands.getRow(optionName, "Option Name");
    }

}

/**
 * SheetTables represent tables of information from the database spreadsheet. 
 * @param {string} name - Name of table
 * @param {string} sheetName - Sheet name where table resides
 * @param {string} rangeA1 - Range, in A1 format, of the table
 * @param {string[]} columnNames - Array of the column names/headers
 * @param {string[]} rowValues - Array of the data rows' (no headers) values
 * @class SheetTable
 * @typedef {SheetTable}
 */
export class SheetTable {
  constructor(name, sheetName, rangeA1, columnNames, rowValues){
    this.name = name;
    this.sheetName = sheetName;
    this.rangeA1 = rangeA1;
    this.columnNames = columnNames;
    this.rowValues = rowValues; 
  }

  static async init(name, sheetName, rangeA1){
    //pulls data from sheet
    const rangeData = await pullInfo(sheetName, rangeA1);
    //separates into the column names and the value rows
    let columnNames = [];
    let rowValues = [];
    let firstRow = true;
    rangeData.forEach((row)=>{
        if(firstRow){
            columnNames = row;
            firstRow = false;
        }
        else{
            rowValues.push(row);
        }
        }
    )

    return new SheetTable(name, sheetName, rangeA1, columnNames, rowValues);
  }

  getDataTable(){ 
    // outputs an array of objects in format {columnHeader: value}, i.e. {Name: 'Heather', Pronouns: 'day'}
    // essentially creates a DataTable
    const paired =
        this.columnNames.map((col, colIndex)=>(
            this.rowValues.map((row)=>(
                    {[col]:row[colIndex]}
                ))
        ));

    const dataRowArray = [];
    const numDataRows = paired[0].length;

    for(let ocIndex = 0; ocIndex < numDataRows; ocIndex++){
        dataRowArray.push(
            paired.map((category)=>(
                category[ocIndex]
            )
        ))
    }

    const dataRowObjects = [];

    dataRowArray.forEach((dataRow)=>{
        dataRowObjects.push(dataRow.reduce(function(result, currentObject) {
            for(let key in currentObject) {
                if (currentObject.hasOwnProperty(key)) {
                    result[key] = currentObject[key];
                }
            }
            return result
        }, {}))
    });

    return new DataTable(this.name, dataRowObjects, this);
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
      throw new Error(`Error searching for '${searchTerm}' in ${this.name} SheetTable`);
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
      throw new Error(`Error getting cell address for '${searchTerm}' in ${this.name} SheetTable`);
    }
  }

  updateValue(searchRowTerm, searchColumnName, changeColumnName, newValue){
    //gets row of the desired cell
    const updateRangeA1 = this.lookupCellAddress(searchRowTerm, searchColumnName, changeColumnName);

    //updates the sheet
    updateRange(this.sheetName, updateRangeA1, newValue);

  }

  appendRow(rowValueArray){
    //adds row to the sheet
    appendToRange(this.sheetName, this.rangeA1, rowValueArray);
  }

}

/**
 * Represents a Character
 *
 * @export
 * @class Character
 * @typedef {Character}
 * @extends {DataRow}
 */
export class Character extends DataRow{
  
  constructor(ocDataRow, baseStatsRow, currentStatsRow){
    super(ocDataRow, ocDataRow.parentDataTable);

    this.baseStats = new BaseStats(baseStatsRow, this.name);
    this.currentStats = new CurrentStats(currentStatsRow, this.name);
  }
  
  //#region Getters
  get name(){
     return this.dataObject.getProp('Full Name')
    }
  get aka(){
     return this.dataObject.getProp("AKA")
    }
  get mun(){
     return this.dataObject.getProp('Mun')
    }
  get age(){
     return this.dataObject.getProp('Age')
    }
  get gender(){
     return this.dataObject.getProp("Gender")
    }
  get pronouns(){
     return this.dataObject.getProp("Pronouns")
    }
  get height(){
     return this.dataObject.getProp("Height")
    }
  get birthday(){
     return this.dataObject.getProp("Birthday")
    }
  get bloodType(){
     return this.dataObject.getProp("Blood Type")
    }
  get photoLink(){
     return this.dataObject.getProp("Photo Link")
    }

  get wit(){
    return this.currentStats.wit;
  }
  get cha(){
    return this.currentStats.cha
  }
  get str(){
    return this.currentStats.str
  }
  get mve(){
    return this.currentStats.mve
  }
  get dur(){
    return this.currentStats.dur
  }
  get lck(){
    return this.currentStats.lck
  }
  get reprints(){
    return this.currentStats.reprints
  }
  //#endregion

  set wit(num){
    this.currentStats.setProp("WIT", num)
  }
  set cha(num){
    this.currentStats.setProp('CHA', num);
  }
  set str(num){
    this.currentStats.setProp('STR', num);
  }
  set mve(num){
    this.currentStats.setProp('MVE', num);
  }
  set dur(num){
    this.currentStats.setProp('DUR', num);
  }
  set lck(num){
    this.currentStats.setProp('LCK', num);
  }
  set reprints(num){
    this.currentStats.setProp('Reprints', num);
  }

  reprint(){
    const error = Math.random() < 0.05; //5% chance of error
    // const error = true; //5% chance of error
    this.currentStats.reset(this.baseStats);
    this.currentStats.addReprint();
    
    return error;
  }
}


/**
 * Basestats
 *
 * @class BaseStats
 * @typedef {BaseStats}
 * @extends {DataRow}
 */
class BaseStats extends DataRow{
  constructor(statsRow, ocName){
    super(statsRow, statsRow.parentDataTable)
    this.name = ocName;
  }

  //#region getters
  get wit(){
    return this.dataObject.getProp("WIT")
  }
  get cha(){
    return this.dataObject.getProp("CHA")
  }
  get str(){
    return this.dataObject.getProp("STR")
  }
  get mve(){
    return this.dataObject.getProp("MVE")
  }
  get dur(){
    return this.dataObject.getProp("DUR")
  }
  get lck(){
    return this.dataObject.getProp("LCK")
  }
  //#endregion

}


/**
 * current stats
 *
 * @class CurrentStats
 * @typedef {CurrentStats}
 * @extends {BaseStats}
 */
class CurrentStats extends BaseStats{
  constructor(statsRow, ocName){
    super(statsRow, ocName)
  }

  //#region getters
  get wit(){
    return this.dataObject.getProp("WIT")
  }
  get cha(){
    return this.dataObject.getProp("CHA")
  }
  get str(){
    return this.dataObject.getProp("STR")
  }
  get mve(){
    return this.dataObject.getProp("MVE")
  }
  get dur(){
    return this.dataObject.getProp("DUR")
  }
  get lck(){
    return this.dataObject.getProp("LCK")
  }
  get reprints(){
    return this.dataObject.getProp("Reprints")
  }
  //#endregion

  setProp(property, num){
    this.dataObject.setProp(this.name, "Name", property, num)
  }
  //#region setters
  set wit(num){
    this.setProp("WIT", num)
  }
  set cha(num){
    this.setProp('CHA', num);
  }
  set str(num){
    this.setProp('STR', num);
  }
  set mve(num){
    this.setProp('MVE', num);
  }
  set dur(num){
    this.setProp('DUR', num);
  }
  set lck(num){
    this.setProp('LCK', num);
  }
  set reprints(num){
    this.setProp('Reprints', num);
  }
  //#endregion

  addReprint(num = 1){
    this.setProp('Reprints', parseInt(this.reprints) + num);
  }

  reset(baseStats){
    this.wit = baseStats.wit;
    this.cha = baseStats.cha;
    this.str = baseStats.str;
    this.mve = baseStats.mve;
    this.dur = baseStats.dur;
    this.lck = baseStats.lck;
  }

}

/**
 * Represents a Mun
 *
 * @export
 * @class Mun
 * @typedef {Mun}
 * @extends {DataRow}
 */
export class Mun extends DataRow{
  
  /**
   * Creates an instance of Mun.
   *
   * @constructor
   * @param {DataRow} munDataRow 
   */
  constructor(munDataRow){
    super(munDataRow, munDataRow.parentDataTable);
    this.id = munDataRow.getProp('Discord ID');
    this.name = munDataRow.getProp('Mun Name');
  }
  
  get scrip(){
    const scripString = this.dataObject.getProp('Scrip');
    if(typeof scripString === 'string'){
      return parseInt(scripString.split(' ')[0])
    }
    else{
      return scripString;
    }
  }  

  set scrip(value){
    this.dataObject.setProp(this.id, 'Discord ID', 'Scrip', value);
  }

  addScrip(value){
    this.scrip = this.scrip + value;
  }

  removeScrip(value){
    this.scrip = this.scrip - value;
  }
  
}