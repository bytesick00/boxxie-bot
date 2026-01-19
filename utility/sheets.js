import {google} from 'googleapis';
import path from 'node:path';
// import {authenticate} from '@google-cloud/local-auth';
import { numToLetter } from './utils.js';

const SPREADSHEET_ID = '13KW7JJNn-7TsoFZhYtmpQe3EO7ldlNr-iZVZNfThrvk';
// The scope for reading spreadsheets.
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
// The path to the credentials file.
// const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'serviceCreds.json');

const auth = new google.auth.GoogleAuth({
      scopes: SCOPES,
      keyFile: CREDENTIALS_PATH
    });

//sets to global default
google.options({
  auth: auth
});

const sheets = google.sheets({version: 'v4'});

export const TABLE_RANGES = {
  munInfo: "A:G",
  ocInfo: "A:J",
  baseStats: "A:G",
  currentStats: "A:G",
  allItems: "A:H",
  inventory: "A:D",
  flavorText: "A:B"
}

//GENERAL SHEET FUNCTIONS

export function rowValueR1C1ToA1(rowIndex, columnIndex){
  const letter = numToLetter(columnIndex);
  //row 1 of data range = 2nd row
  const num = rowIndex + 1;
  return letter & num;
}

export async function pullInfo(sheetName, rangeA1) {
  // Get the values from the spreadsheet.
  const result = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${sheetName}'!${rangeA1}`,
  
  });
  return result.data.values;
}

export function updateRange(sheetName, rangeA1, newValue){
  const resource = {
    values: [
      [newValue]
    ]
  }
  const result = sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${sheetName}'!${rangeA1}`,
    valueInputOption: "USER_ENTERED",
    resource: resource
  })

  return result;
}

export function appendToRange(sheetName, rangeA1, rowValueArray){
  const resource = {
    values: [
      rowValueArray
    ]
  };

  const result = sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${sheetName}'!${rangeA1}`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROW",
    resource: resource
  })

  return result;
}

// let data = await pullInfo('Mun Info', TABLE_RANGES.munInfo);
// console.log(data);