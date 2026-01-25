import {google} from 'googleapis';
import path from 'node:path';

const SPREADSHEET_ID = '13KW7JJNn-7TsoFZhYtmpQe3EO7ldlNr-iZVZNfThrvk';
// The scope for reading spreadsheets.
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
// The path to the credentials file.
const CREDENTIALS_PATH = path.join(process.cwd(), './serviceCreds.json');

const auth = new google.auth.GoogleAuth({
      scopes: SCOPES,
      keyFile: CREDENTIALS_PATH
    });

//sets to global default
google.options({
  auth: auth
});

const sheets = google.sheets({version: 'v4'});

//GENERAL SHEET FUNCTIONS

export function rowValueR1C1ToA1(rowIndex, columnIndex){
  const letter = numToLetter(columnIndex);
  //row 1 of data range = 2nd row + 1 for starting at 0
  const num = rowIndex + 2;
  return `${letter}${num}`;
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

export function numToLetter(number){

    return String.fromCharCode(97 + number);

}