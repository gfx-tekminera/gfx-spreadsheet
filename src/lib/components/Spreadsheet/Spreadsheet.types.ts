import {
  CellLocation,
  Row,
  TextCell,
  NumberCell,
  CheckboxCell,
  DateCell,
  TimeCell,
  DefaultCellTypes,
} from '@silevis/reactgrid';
import { ButtonCell, ButtonComponentProps, ModifiedDropdownCell, TextCreatableCell, SpreadsheetHeaderCell } from './templates';

export type SpreadSheetCellTypes = TextCreatableCell |
  SpreadsheetHeaderCell |
  // FlagCell |
  TextCell |
  NumberCell |
  CheckboxCell |
  ModifiedDropdownCell |
  DateCell |
  TimeCell |
  ButtonCell |
  DefaultCellTypes;
export type SpreadSheetRow = Row<SpreadSheetCellTypes>

export type DataRowValue = string|number|boolean|Date;
export type DataRow = {[key: string]: DataRowValue|undefined} & {_idx?: number};
export type SpreadSheetColumnOption = {
  [key: string]: SpreadSheetCellTypes['type'];
}
export type CellState = {_idx?: number} & {
  [key: keyof DataRow]: SpreadSheetCellTypes
};

export type ButtonAction = (e: React.MouseEvent, row: DataRow) => any;
export type RowAction = {
  text: string;
  action?: ButtonAction;
  component?: React.FC<ButtonComponentProps>;
}

// CompositeCellValidation, when fn returns false, return message
export type CellValidation = (location: CellLocation, data: DataRow[]) => boolean;
export type CompositeCellValidation = {
  fn: CellValidation;
  message: string;
}
export type SpreadSheetOption = {
  // cell type columnType[key] for DataRow[key]
  columnType: SpreadSheetColumnOption;
  // list of enum values for DataRow[key]
  valuesMap: Record<keyof DataRow, any[]>;
  // map of function to get label from valuesMap
  labelsMap: Record<keyof DataRow, (arg: string) => string>;
  // if provided, only show column included in list
  includes: (keyof DataRow)[];
  // column size started from first non 'header' column
  columnSize: number[];
  // action cell
  // { [action_name: string]: ButtonAction }
  rowActions: Record<string, RowAction>;
  // for column with dropdown type, map custom option that will be rendered
  customOption: Record<keyof DataRow, React.FC<any>>;
  // for column with dropdown type, map custom single value that will be rendered
  customSingleValue: Record<keyof DataRow, React.FC<any>>;
  // custom header label
  headersLabel: Record<keyof DataRow, string>;
  // datetime format, could be set for whole spreadsheet or each column
  dateFormatOptions: Intl.DateTimeFormatOptions;
  timeFormatOptions: Intl.DateTimeFormatOptions;
  sheetLocale: string;
  // map column name to be readOnly
  readOnly: Record<keyof DataRow, boolean>;
  // dynamically set readonly column with callback
  calculateMap: Record<keyof DataRow, (row: DataRow) => DataRowValue>;
  // dynamicaly use callback `fn` to do validation, returning boolean
  // location is cell location currently being validated
  // if false, return `message`
  validateMap: Record<keyof DataRow, CompositeCellValidation[]>;
}
export type SpreadSheetProps = {
  sheetData?: DataRow[];
  sheetOption?: Partial<SpreadSheetOption>;
};

export type DataColumnMap = {
  [key: keyof DataRow]: string
}
export type DataColumnHeaderMap = {
  rowNum: '#';
} & DataColumnMap;
export type DataColumnId = keyof DataColumnMap;

// TODO: strict typing needed, or just Set<string>?
export type ValuesMap = Set<any>;
export type ColumnValuesMap = {
  [key: keyof DataRow]: ValuesMap
}

export type OptionItem = {value: string, label: string};

export type ValidationReport = Record<Row['rowId'], Record<keyof DataRow, string[]>>;
