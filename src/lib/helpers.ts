// pattern of <word>-<word>
const regexSpreadsheetRange = /(\w+-\w+)+/;
export const isRangePattern = (val: string) => regexSpreadsheetRange.test(val);

// pattern of <word>:<word>
const regexColonDelimited = /(\w+:\w+)+|(:\w+)|(\w+:)/;
export const isColonPattern = (val: string) => regexColonDelimited.test(val);
