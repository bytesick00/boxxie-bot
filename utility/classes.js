import {
  pullInfo,
  appendToRange,
  updateRange,
  rowValueR1C1ToA1,
} from "../sheets.js";
import { addData, getData, getFieldProperties, getTableData, updateData } from "./access_data.js";

/**
 * Holds data as an array of DataRow objects, in the form {header1: value1, header2: value2, ...}
 * @class DataTable
 * @typedef {DataTable}
 **/
export class DataTable {
  /**
   * Creates an instance of DataTable.
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
   * Gets a DataRow from the table
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
 * Cached data table
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

  changeProperty(property, newValue){
    updateData(this.indexInfo.tableField, this.indexInfo.indexProperty, this.indexInfo.indexValue, property, newValue)
  }
}

export class Character extends DBTable {
  constructor(name) {
    super("ocs", "name", name);

    this.name = this.data.name;
    this.aka = this.data.aka;
    this.mun = this.data.mun;
    this.age = this.data.age;
    this.gender = this.data.gender;
    this.pronouns = this.data.pronouns;
    this.birthday = this.data.birthday;
    this.bloodType = this.data.bloodType;
    this.image = this.data.image;
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
    this.buyPrice = parseInt(this.data.buyPrice);
    this.sellPrice = parseInt(this.data.sellPrice);
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
    this.scrip = parseInt(this.data.scrip);
    this.id = this.data.id;
    this.status = this.data.status;
    this.ocs = this.data.ocs;
  }

  get inventory(){
    return new Inventory(this);
  }

  addScrip(addAmount){
    this.scrip += addAmount
    super.changeProperty('scrip', this.scrip)
  }

  removeScrip(removeAmount){
    this.scrip -= removeAmount
    super.changeProperty('scrip', this.scrip)
  }

}

export class Inventory{
  constructor(mun){
    this.mun = mun;
    this.pullFromCache();
  }

  async buyItem(itemName, quantity){
    const thisItem = new Item(itemName);

    if(this.mun.scrip < thisItem.buyPrice*quantity){
      throw new Error("Not enough scrip!");
    }

    //remove scrip
    this.mun.removeScrip(thisItem.buyPrice);
    const currentDate = new Date();
    const newRowData = {'id': this.mun.id, 'name': this.mun.name, 'item': thisItem.name, 'amount': quantity, 'date': currentDate.toUTCString()};
    await addData('inventory', newRowData).then(()=>{return true})
    
    // this.pullFromCache();
    
  }

  getItemQuantity(itemName){
    return this.items.find(item=>item.item===itemName).quantity;
  }

  pullFromCache(){
    const allRows = getTableData('inventory').filter(table => table.id === this.mun.id);
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

    this.items = inventory;
  }

}
