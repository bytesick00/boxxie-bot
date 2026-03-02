// pull request url: http://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@github.com/bytesick00/boxxie-bot.git

import { AB_DATA } from "./initialize-data.js"
import { randOutOf } from "./utility/utils.js"
import { AnomalyBoxData, Mun, Inventory } from "./utility/classes.js"
import { cacheAllData } from "./utility/access_data.js";
import { JSONFile, JSONFilePreset } from "lowdb/node";
import { SHEET_RANGES } from "./initialize-data.js";
import { readFile, readFileSync } from "node:fs"
import cache from "./data/cached-data.json" with { type: 'json' }


const dbDefault = {
    shop: [],
    muns: [],
    ocs: [],
    baseStats: [],
    currentStats: [],
    inventory: [],
    flavorText: [],
    customCommands: [],
    mechanics: []
}

// const db = await JSONFilePreset('./data/cached-data.json', dbDefault)


// await cacheAllData(SHEET_RANGES, db);

// const cachedData = JSON.parse(readFileSync('data/cached-data.json').toString());


console.log(cache.shop[0])