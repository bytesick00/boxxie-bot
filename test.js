// pull request url: http://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@github.com/bytesick00/boxxie-bot.git

import { AB_DATA } from "./initialize-data.js"
import { randOutOf } from "./utility/utils.js"
import { AnomalyBoxData, Mun, Inventory } from "./utility/classes.js"
import { cacheShop } from "./utility/access_data.js";
import { JSONFilePreset } from "lowdb/node";

// for testing
const shopRange = {
        sheet: "All Items",
        range: "A:I"
    }

const shopDefault = {
    items: []
}

const shopDb = await JSONFilePreset('./data/shop-data.json', shopDefault)

await cacheShop(shopRange, shopDb);