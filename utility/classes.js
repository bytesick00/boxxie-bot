import {
  pullInfo,
  appendToRange,
  updateRange,
  rowValueR1C1ToA1,
} from "../sheets.js";
import { addData, getData, getFieldProperties, getTableData, updateData, addInventoryRow } from "./access_data.js";
import { randOutOf, resolveOCName } from "./utils.js";

/**
 * Holds data as an array of DataRow objects, in the form {header1: value1, header2: value2, ...}
 * @class DataTable
 * @typedef {DataTable}
 **/
export class DataTable {
  /**
   * Creates an instance of DataTable. A DataTable holds an array of DataRow objects, in the form {property1: value, property2: value, etc...}
   *
   * @constructor
   * @param {string} name The name of the table
   * @param {DataRow[]} dataRowArray An array holding all of the DataRow objects of the table
   * @param {SheetTable} parentSheetTable The parent SheetTable that this formatted table represents
   */
  constructor(name, dataRowArray, parentSheetTable) {
    this.name = name;
    this.parentSheetTable = parentSheetTable;

    let rows = [];
    dataRowArray.forEach((row) => rows.push(new DataRow(row, this)));

    this.dataRows = rows;
  }

  /**
   * Adds a row to the spreadsheet table
   *
   * @type {DataRow}
   */
  set addRow(dataRow) {
    this.parentSheetTable.appendRow(dataRow.values());
  }

  
  /**
   * Pulls all new data from the spreadsheet and pushes to current DataTable 
   *
   * @async
   * @returns {DataTable} 
   */
  async pullData() {
    const newSheetTable = await SheetTable.init(
      this.name,
      this.parentSheetTable.sheetName,
      this.parentSheetTable.rangeA1,
    );
    this.dataRows = newSheetTable.getDataTable();
    this.parentSheetTable = newSheetTable;

    return this;
  }

  /**
   * Gets a DataRow from the table, e.x. one OC's properties
   *
   * @param {string} searchTerm
   * @param {string} searchColumnName
   * @param {boolean} [fuzzy=false] Search for a substring instead of exact string value. Defaults to false.
   * @returns {DataRow}
   */
  getRow(searchTerm, searchColumnName, fuzzy = false) {
    try {
      for (const dataRow of this.dataRows) {
        let value = dataRow.dataObject[searchColumnName];
        if (fuzzy) {
          if (value.includes(searchTerm)) {
            return dataRow;
          }
        } else {
          if (value == searchTerm) {
            return dataRow;
          }
        }
      }
    } catch {
      for (const dataRow of this.dataRows.dataRows) {
        let value = dataRow.dataObject[searchColumnName];
        if (fuzzy) {
          if (value.includes(searchTerm)) {
            return dataRow;
          }
        } else {
          if (value === searchTerm) {
            return dataRow;
          }
        }
      }
    }
  }
}


/**
 * A DataRow is an object holding one spreadsheet row's worth of data in the form {columnTitle: value, etc...}
 *
 * @export
 * @class DataRow
 * @typedef {DataRow}
 */
export class DataRow {
  /**
   * Creates an instance of DataRow.
   *
   * @constructor
   * @param {Object} dataObject The object containing all of the row values
   * @param {DataTable} parentDataTable The DataTable that contains this row
   */
  constructor(dataObject, parentDataTable) {
    this.dataObject = dataObject;
    this.parentDataTable = parentDataTable;
  }

  get parentSheetTable() {
    return this.parentDataTable.parentSheetTable;
  }

  /**
   * Updates the sheet value and dataRow value for the specified property
   *
   * @type {(string|number)}
   */
  setProp(indexValue, indexProperty, changeProperty, newValue) {
    this.parentSheetTable.updateValue(
      indexValue,
      indexProperty,
      changeProperty,
      newValue,
    );

    this.dataObject[changeProperty] = newValue;
  }

  getProp(propertyName) {
    return this.dataObject[propertyName];
  }

  async pullData() {
    const newDataTable = await this.parentDataTable.pullData();
    this.dataObject = newDataTable[this.name];
    this.parentDataTable = newDataTable;

    return this;
  }
}

/**
 * SheetTables represent tables of information from the database spreadsheet.
 * @property {string} SheetTable.name - Name of table
 * @property {string} SheetTable.sheetName - Sheet name where table resides
 * @property {string} SheetTable.rangeA1 - Range, in A1 format, of the table
 * @property {string[]} SheetTable.columnNames - Array of the column names/headers
 * @property {string[]} SheetTable.rowValues - Array of the data rows' (no headers) values
 * @param
 * @class SheetTable
 * @typedef {SheetTable}
 **/
export class SheetTable {
  /**
   * Creates an instance of SheetTable.
   *
   * @constructor
   * @param {string} name - Name of table
   * @param {string} sheetName - Sheet name where table resides
   * @param {string} rangeA1 - Range, in A1 format, of the table
   * @param {string[]} columnNames - Array of the column names/headers
   * @param {string[]} rowValues - Array of the data rows' (no headers) values
   */
  constructor(name, sheetName, rangeA1, columnNames, rowValues) {
    this.name = name;
    this.sheetName = sheetName;
    this.rangeA1 = rangeA1;
    this.columnNames = columnNames;
    this.rowValues = rowValues;
  }

  static async init(name, sheetName, rangeA1) {
    //pulls data from sheet
    const rangeData = await pullInfo(sheetName, rangeA1);
    //separates into the column names and the value rows
    let columnNames = [];
    let rowValues = [];
    let firstRow = true;
    rangeData.forEach((row) => {
      if (firstRow) {
        columnNames = row;
        firstRow = false;
      } else {
        rowValues.push(row);
      }
    });

    return new SheetTable(name, sheetName, rangeA1, columnNames, rowValues);
  }

  getDataTable() {
    // outputs an array of objects in format {columnHeader: value}, i.e. {Name: 'Heather', Pronouns: 'day'}
    // essentially creates a DataTable
    const paired = this.columnNames.map((col, colIndex) =>
      this.rowValues.map((row) => ({ [col]: row[colIndex] })),
    );

    const dataRowArray = [];
    const numDataRows = paired[0].length;

    for (let ocIndex = 0; ocIndex < numDataRows; ocIndex++) {
      dataRowArray.push(paired.map((category) => category[ocIndex]));
    }

    const dataRowObjects = [];

    dataRowArray.forEach((dataRow) => {
      dataRowObjects.push(
        dataRow.reduce(function (result, currentObject) {
          for (let key in currentObject) {
            if (currentObject.hasOwnProperty(key)) {
              result[key] = currentObject[key];
            }
          }
          return result;
        }, {}),
      );
    });

    return new DataTable(this.name, dataRowObjects, this);
  }

  getColumnIndex(columnName) {
    return this.columnNames.indexOf(columnName);
  }

  getRow(searchTerm, columnName) {
    let info = [];
    const columnIndex = this.getColumnIndex(columnName);
    this.rowValues.forEach((row) => {
      if (row[columnIndex] == searchTerm) {
        info = row;
      }
    });

    if (info == null) {
      throw new Error(`Could not find ${searchTerm} in column '${columnName}'`);
    } else {
      return info;
    }
  }

  lookupValue(searchTerm, searchColumnName, returnColumnName) {
    try {
      const row = this.getRow(searchTerm, searchColumnName);
      const columnIndex = this.getColumnIndex(returnColumnName);

      return row[columnIndex];
    } catch {
      throw new Error(
        `Error searching for '${searchTerm}' in ${this.name} SheetTable`,
      );
    }
  }

  lookupCellAddress(searchTerm, searchColumnName, returnColumnName) {
    try {
      const row = this.getRow(searchTerm, searchColumnName);
      const rowIndex = this.rowValues.indexOf(row);
      const columnIndex = this.getColumnIndex(returnColumnName);

      return rowValueR1C1ToA1(rowIndex, columnIndex);
    } catch {
      throw new Error(
        `Error getting cell address for '${searchTerm}' in ${this.name} SheetTable`,
      );
    }
  }

  updateValue(searchRowTerm, searchColumnName, changeColumnName, newValue) {
    //gets row of the desired cell
    const updateRangeA1 = this.lookupCellAddress(
      searchRowTerm,
      searchColumnName,
      changeColumnName,
    );

    //updates the sheet
    updateRange(this.sheetName, updateRangeA1, newValue);
  }

  appendRow(rowValueArray) {
    //adds row to the sheet
    appendToRange(this.sheetName, this.rangeA1, rowValueArray);
  }
}

/**
 * Represents a cached data table, handles all functions needed to push/pull data from spreadsheet to the cached-data.json file
 *
 * @param {string} data - The data object for this cached table
 * @class DBTable
 * @typedef {DBTable}
 **/
export class DBTable {
  
  /**
   * Creates an instance of DBTable.
   *
   * @constructor
   * @param {string} field 
   * @param {string} indexProperty 
   * @param {string} indexValue 
   */
  constructor(field, indexProperty, indexValue) {
    const data = getData(field, indexProperty, indexValue);
    this.data = data;
    this.indexInfo = {tableField: field, indexProperty: indexProperty, indexValue: indexValue}
  }

  async changeProperty(property, newValue){
    await updateData(this.indexInfo.tableField, this.indexInfo.indexProperty, this.indexInfo.indexValue, property, newValue)
  }
}

export class Character extends DBTable {
  constructor(name) {
    const canonicalName = resolveOCName(name) || name;
    super("ocs", "name", canonicalName);

    this.name = this.data.name;
    this.aka = this.data.aka;
    this.mun = this.data.mun;
    this.age = this.data.age;
    this.gender = this.data.gender;
    this.pronouns = this.data.pronouns;
    this.birthday = this.data.birthday;
    this.bloodType = this.data.bloodType;
    this.image = this.data.image;
    this.height = this.data.height;
    this.baseStats = new baseStats(this.name);

  }

  get currentStats(){
    return new currentStats(this.name)
  }

  async reprint(){
    //Resets stats
    const stats = ['wit', 'cha', 'str','mve','dur','lck'];
    for(const stat of stats){
      const baseStat = parseInt(this.baseStats[stat])
      await this.currentStats.setStat(stat, baseStat)
    }

    const currentReprints = parseInt(this.currentStats.reprints);
    await this.currentStats.setStat('reprints', currentReprints+1)
    const error =  Math.random() <= 0.25;
    await this.currentStats.setStat('error', error)
    return error;
  }
}

export class baseStats extends DBTable {
  constructor(ocName){
    super('baseStats', 'name', ocName)
    this.name = this.data.name;
    this.wit = this.data.wit;
    this.cha = this.data.cha;
    this.str = this.data.str;
    this.mve = this.data.mve;
    this.dur = this.data.dur;
    this.lck = this.data.lck;
  }
}

export class currentStats extends DBTable {
  constructor(ocName){
    super('currentStats', 'name', ocName)
    this.name = this.data.name;
    this.wit = this.data.wit;
    this.cha = this.data.cha;
    this.str = this.data.str;
    this.mve = this.data.mve;
    this.dur = this.data.dur;
    this.lck = this.data.lck;    
    this.reprints = this.data.reprints;
    this.error = this.data.error;
  }

  async setStat(statName, newValue){
    await super.changeProperty(statName, newValue);
  }

}

export class Item extends DBTable {
  constructor(itemName){
    super('shop', 'name', itemName)
    this.name = this.data.name;
    this.type = this.data.type;
    this.giftable = this.data.giftable;
    this.description = this.data.description;
    this.useText = this.data.useText;
    this.shop = this.data.shop;
    this.image = this.data.image;
    this.buyPrice = sanitizeScrip(this.data.buyPrice);
    this.sellPrice = sanitizeScrip(this.data.sellPrice);
    this.amount = this.data.amount !== undefined ? parseInt(this.data.amount) : undefined;
  }

  /**
   * Whether this item is available (not limited to 0).
   * Undefined/empty amount means unlimited.
   */
  get isAvailable(){
    if(this.amount === undefined || isNaN(this.amount)) return true;
    return this.amount !== 0;
  }

  /**
   * Whether buying/obtaining a given quantity is allowed.
   * @param {number} quantity
   */
  canObtain(quantity = 1){
    if(this.amount === undefined || isNaN(this.amount)) return true;
    if(this.amount <= 0) return false;
    return this.amount >= quantity;
  }

  /**
   * Decrements the world amount after an item is obtained.
   * @param {number} quantity
   */
  async decrementAmount(quantity = 1){
    if(this.amount === undefined || isNaN(this.amount)) return;
    const newAmount = Math.max(0, this.amount - quantity);
    this.amount = newAmount;
    await this.changeProperty('amount', String(newAmount));
  }
}

/**
 * Description placeholder
 *
 * @export
 * @class Mun
 * @typedef {Mun}
 * @extends {DBTable}
 */
export class Mun extends DBTable {
  constructor(name){
    super('muns', 'name', name)
    this.name = this.data.name;
    this.pronouns = this.data.pronouns;
    this.timezone = this.data.timezone;
    this.scrip = sanitizeScrip(this.data.scrip);
    this.id = this.data.id;
    this.status = this.data.status;
    this.ocs = this.data.ocs;
  }

  get inventory(){
    return (async () => {
        return await Inventory.init(this);
    })();
  }

  async setScrip(setAmount){
    this.scrip = setAmount
    await super.changeProperty('scrip', this.scrip)
  }

  async addScrip(addAmount){
    const add = sanitizeScrip(addAmount)
    const currentScrip = this.scrip;
    this.scrip = currentScrip + add
    await super.changeProperty('scrip', this.scrip)
  }

  async removeScrip(removeAmount){
    const currentScrip = this.scrip;
    const remove = sanitizeScrip(removeAmount)

    if(removeAmount > currentScrip){
      throw new Error("Not enough scrip!");
    }

    this.scrip = currentScrip - remove
    await super.changeProperty('scrip', this.scrip)
  }

}

export class Inventory{
  constructor(mun){
    this.mun = mun
  }

  async buyItem(itemName, quantity){
    const thisItem = new Item(itemName);

    // Check world amount availability (skip for negative quantity, i.e. item removal)
    if(quantity > 0 && !thisItem.canObtain(quantity)){
      throw new Error(thisItem.amount === 0 ? "Item unavailable!" : `Only ${thisItem.amount} left in stock!`);
    }

    //remove scrip
    try{
      if(quantity > 0){
        await this.mun.removeScrip(thisItem.buyPrice*quantity);
      }
      
    }
    catch (error){
      throw error;
    }
    
    const currentDate = new Date();
    const newRowData = {'id': this.mun.id, 'mun': this.mun.name, 'item': thisItem.name, 'amount': quantity, 'date': currentDate.toUTCString()};
    await addInventoryRow(newRowData);

    // Decrement world amount if applicable
    if(quantity > 0){
      await thisItem.decrementAmount(quantity);
    }
    
    await this.refresh();
    
  }

  async addItem(itemName, quantity){
    const thisItem = new Item(itemName);

    if(quantity > 0 && !thisItem.canObtain(quantity)){
      throw new Error(thisItem.amount === 0 ? "Item unavailable!" : `Only ${thisItem.amount} left in stock!`);
    }

    const currentDate = new Date();
    const newRowData = {'id': this.mun.id, 'mun': this.mun.name, 'item': thisItem.name, 'amount': quantity, 'date': currentDate.toUTCString()};
    await addInventoryRow(newRowData);

    if(quantity > 0){
      await thisItem.decrementAmount(quantity);
    }

    await this.refresh();
  }

  async refresh(){
    const refreshed = await Inventory.init(this.mun)
    this.items = refreshed.items
  }

  getItemQuantity(itemName){
    return this.items.find(item=>item.item===itemName).quantity;
  }

  
  /**
   * get an inventory item as an Item object
   *
   * @param {string} itemName 
   * @returns {(Item | "Not in inventory!")} 
   */
  getItem(itemName){
    
    if(this.checkInventory(itemName)){
      return new Item(itemName)
    }
    return 'Not in inventory!'
  }

  async useItem(itemName){
    /**
     * @type {Item}
     */
    const item = this.getItem(itemName)

    if(!item.useText || item.useText.trim() === ''){
      return {text: null, consumed: false}
    }

    // Support random flavor text separated by |||
    let flavorText = item.useText;
    if (flavorText.includes('|||')) {
      const options = flavorText.split('|||').map(s => s.trim()).filter(Boolean);
      flavorText = options[Math.floor(Math.random() * options.length)];
    }

    const useType = item.type

    if(useType === 'Usable'){
      return {text: flavorText, consumed: false}
    }
    else{
      await this.buyItem(item.name, -1)
      return {text: flavorText, consumed: true}
    }
  }

  checkInventory(itemName){

    const itemNames = this.getAllItemNames();
    if(itemNames.includes(itemName)){
      return true
    }
    return false
  }

  static async init(mun){
    const allRows = (getTableData('inventory')).filter(table => table.id === mun.id);
    const inventory = []
    let itemsArray = allRows.map(out => out.item)
    let itemSet = new Set(itemsArray)
    itemsArray = [...itemSet]

    for(const item of itemsArray){
        // console.log(item)

        let filteredRows = allRows.filter(row => row.item === item).map(row=> parseInt(row.amount));
        let quantity = filteredRows.reduce((total, currentNum)=>total + currentNum)

        if(quantity > 0){
          inventory.push({item: item, quantity: quantity})
        }
      }
    
    const newInv = new Inventory(mun)
    newInv.items = inventory;
    return newInv
  }

  getAllItemNames(){
    return this.items.map(item=> item.item)
  }

}

// MISC FUNCTIONS
export function getFlavorText(textID){
    return getData('flavorText', 'id', textID).text
}
export function getAllItemNames(shopType){
  const itemRows = getTableData('shop')
  // Filter out items with amount === 0 (unavailable)
  const available = itemRows.filter(row => {
    const amt = row.amount !== undefined && row.amount !== '' ? parseInt(row.amount) : undefined;
    return amt === undefined || isNaN(amt) || amt !== 0;
  });
  if(shopType === null || shopType === undefined){
    return available.map(row=> row.name)
  }
  else{
    return available.filter(row=>row.shop === shopType).map(row=> row.name)
  }
  
}

/**
 * Returns all open shops from the Shops And Gacha table
 * @returns {{name: string, open: string, type: string, description: string}[]}
 */
export function getOpenShops(){
  const allEntries = getTableData('shopsAndGacha')
  return allEntries.filter(entry => entry.open === 'TRUE' && entry.type === 'Shop')
}

/**
 * Returns all open gachas from the Shops And Gacha table
 * @returns {{name: string, open: string, type: string, description: string}[]}
 */
export function getOpenGachas(){
  const allEntries = getTableData('shopsAndGacha')
  return allEntries.filter(entry => entry.open === 'TRUE' && entry.type === 'Gacha')
}

/**
 * Gets all items belonging to a specific gacha (by shop name)
 * @param {string} gachaName 
 * @returns {Item[]}
 */
export function getGachaItems(gachaName){
  const itemRows = getTableData('shop')
  return itemRows.filter(row => {
    if(row.shop !== gachaName) return false;
    // Exclude items with amount === 0
    const amt = row.amount !== undefined && row.amount !== '' ? parseInt(row.amount) : undefined;
    return amt === undefined || isNaN(amt) || amt !== 0;
  })
}

function sanitizeScrip(scrip){
  if(typeof scrip === 'string'){
    const output = scrip.replaceAll(',','').replace('scrip', '').trim();
    return parseInt(output)
  }
  else if(typeof scrip === 'number'){
    return Math.round(scrip)
  }
}