// pull request url: http://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@github.com/bytesick00/boxxie-bot.git


import { addData, cacheAllData, getFieldProperties, updateData } from "./utility/access_data.js";
import { Character, DBTable, Mun} from "./utility/classes.js";

await cacheAllData(true);

const itemRow = {
      "id": "308388985540050956",
      "mun": "Marcus",
      "item": "Half & Half",
      "amount": "1"
    }

const test = new Mun('Marcus');
test.scrip = 20
test.buyItem('Weed Bunt', 2)