import { AnomalyBoxData } from './utility/classes.js';
import 'dotenv/config';

export const SHEET_RANGES = [
        {
            sheet: "Mun Info",
            range: "A:G"
        },
        {
            sheet: "OC Info",
            range: "A:J"
        },
        {
            sheet: "Base Stats",
            range: "A:G"
        },
        {
            sheet: "All Items",
            range: "A:I"
        },
        {
            sheet: "Current Stats",
            range: "A:H"
        },
        {   sheet: "Inventory Rows",
            range: "A:D"
        },
        {
            sheet: "Mechanics",
            range: "A:C",
        },
        {
            sheet: "Flavor Text",
            range: "A:B"
        },
        {
            sheet: "Custom Commands",
            range: "A:G"
        }
]

export const AB_DATA = await AnomalyBoxData.init(SHEET_RANGES);

export const DEV_MODE = process.env.APP_ID.startsWith('146');