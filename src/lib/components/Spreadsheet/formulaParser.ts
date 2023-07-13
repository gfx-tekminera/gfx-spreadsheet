import { HyperFormula } from 'hyperformula';
import { DataRow } from './Spreadsheet.types';

export const regexVariable = /{{\w+(\[((\'\w+\')|(\"\w+\")|([0-9]+))\])+}}/g;
export const regexAdressor = /\w+\[/g; // will match `row[` from `row[1]`
export const regexInSquareBracket = /\[(\w+|\'\w+\'|\"\w+\")\]/g; // will match `[1]`, `["lele"]`

export const NO_REFERENCE_MESSAGE = '#REF;';
export const ERROR_MESSAGE = '#ERR;';

export const getRow = (row: DataRow, key: string) => key in row ? row[key] : undefined;

export const getSheetData = (sheetData: DataRow[], i: number, j: string) => {
  const row = sheetData.at(i);
  if (row) {
    return getRow(row, j);
  }
  return undefined;
}

// TODO: validate right pattern for variable in string
export const variableMap: Record<string, any> = {
  'row': getRow,
  'sheetData': getSheetData,
};
const getPatternValue = (text: string, row: DataRow, sheetData: DataRow[]): string => {
  let strVariable = text.replace('{{', '').replace('}}', '');
  const addressor = strVariable.match(regexAdressor)?.at(0)?.replace('[', '');
  if (!addressor || addressor in variableMap === false) {
    return text;
  }
  const method = variableMap[addressor];
  const params: (number|string|DataRow|DataRow[])[] = [];

  strVariable = strVariable.replace(addressor, '');
  if (addressor === 'row') {
    params.push(row);
  }
  if (addressor === 'sheetData') {
    params.push(sheetData);
  }

  // TODO: better option than eval/Function?
  [...strVariable.matchAll(regexInSquareBracket)].forEach(item => {
    params.push((Function(`return ${item[0]}[0]`)()));
  });
  // console.log(addressor, method, params, 'getpatternvalue');
  // console.log(method(...params), 'method result');

  let result = method(...params);
  return result;
}
export const replaceVariable = (text: string, row: DataRow, sheetData: DataRow[]): string => {
  let newText = text;
  const variablePatterns = [...text.matchAll(regexVariable)].map(item => item[0]);
  try {
    variablePatterns.forEach(item => {
      // console.log(item, getPatternValue(item, row, sheetData), 'tobereplace');
      newText = newText.replaceAll(item, getPatternValue(item, row, sheetData));
    });
  } catch (error) {
    console.log(error);
    text = ERROR_MESSAGE;
  }
  // console.log(newText, 'newText');
  return newText
}

export const isFormulaString = (text: string) => text.startsWith('=');

/*
 * TODO: replace variable pattern with value
 * Example
 * IF({{sheetData[1]}}+{{row['hehe']}}+{{row["lele"]}}+{{sheetData[1]['yeye']}}=2, "true", "false")
 * expected
 * IF(0+1+2+3=2, "true", "false")
 */

const hfOption = {
  licenseKey: 'gpl-v3',
};

let hfInstance: HyperFormula|undefined = undefined;

export const initParser = () => {
  if (hfInstance === undefined) {
    hfInstance = HyperFormula.buildEmpty(hfOption);
    hfInstance.addSheet('sheet1');
  }
  return hfInstance;
}

export const getParser = (): HyperFormula => {
  if (!hfInstance) {
    const instance = initParser();
    return instance;
  }
  return hfInstance as HyperFormula;
}
