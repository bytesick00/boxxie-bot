// import { AnomalyBoxData } from './utility/classes.js';
import 'dotenv/config';
import { JSONFilePreset } from 'lowdb/node';
import { cacheAllData } from './utility/access_data.js';

// await cacheAllData();

// export const AB_DATA = await AnomalyBoxData.init(SHEET_RANGES);

export const DEV_MODE = process.env.APP_ID.startsWith('146');