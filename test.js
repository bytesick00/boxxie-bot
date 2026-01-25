// pull request url: http://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@github.com/bytesick00/boxxie-bot.git

import { AB_DATA } from "./initialize-data.js"



console.log(AB_DATA.ocInfo.getRow("temp", "Full Name", true).getProp("Blood Type"));

console.log(AB_DATA.getOC("Temperance", true).getProp("Blood Type"));