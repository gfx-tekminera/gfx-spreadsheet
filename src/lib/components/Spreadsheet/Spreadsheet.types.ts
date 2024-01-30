import {
  CellLocation,
  Row,
  Column,
  TextCell,
  NumberCell,
  CheckboxCell,
  DateCell,
  TimeCell,
  DefaultCellTypes,
  CellStyle,
} from "@silevis/reactgrid";
import {
  ButtonCell,
  ButtonComponentProps,
  HeaderIconComponentProps,
  ModifiedDropdownCell,
  TextCreatableCell,
  SpreadsheetHeaderCell,
} from "./templates";

export type SpreadSheetCellTypes =
  | TextCreatableCell
  | SpreadsheetHeaderCell
  // FlagCell |
  | TextCell
  | NumberCell
  | CheckboxCell
  | ModifiedDropdownCell
  | DateCell
  | TimeCell
  | ButtonCell
  | DefaultCellTypes;
export type SpreadSheetRow = Row<SpreadSheetCellTypes>;

export type DataRowValue = string | number | boolean | Date;
export type DataRow = { [key: string]: DataRowValue | undefined } & {
  _idx?: number;
};
export type HeaderIcon = {
  [key: string]: React.FC<HeaderIconComponentProps> | undefined;
};
export type SpreadSheetColumnOption = {
  [key: string]: SpreadSheetCellTypes["type"];
};
export type CellState = { _idx?: number } & {
  [key: keyof DataRow]: SpreadSheetCellTypes;
};

export type ButtonAction = (e: React.MouseEvent, row: DataRow) => any;
export type RowAction = {
  text: string;
  action?: ButtonAction;
  component?: React.FC<ButtonComponentProps>;
};

// CompositeCellValidation, when fn returns false, return message
export type CellValidation = (
  location: CellLocation,
  data: DataRow[]
) => boolean;
export type CompositeCellValidation = {
  fn: CellValidation;
  message: string;
};
// ValuesFilter, callback for valuesMap[string] when row value are changed
// called as Array.from(valuesMap[string]).filter(item => cb(item, DataRow));
export type ValuesFilter = (optionItem: DataRowValue, row: DataRow) => boolean;

export type StyleStateNote = {
  [type: string]: "rowstyle" | "columnstyle" | "cellstyle";
};
export type RowStyle = Record<Row["rowId"], CellStyle>;
export type ColumnStyle = Record<Column["columnId"], CellStyle>;
export type SpreadsheetCellStyle = Record<Row["rowId"], ColumnStyle>;
export type CellStyleMap = Partial<
  RowStyle | ColumnStyle | SpreadsheetCellStyle
>;
export type StyleState = StyleStateNote | CellStyleMap;

export type CalculateMapCallback = (
  row: DataRow,
  data: DataRow[],
  location: CellLocation
) => DataRowValue;

export type SpreadSheetOption = {
  // cell type columnType[key] for DataRow[key]
  columnType: SpreadSheetColumnOption;
  // icon for spreadsheet header
  headerIcon: HeaderIcon;
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
  calculateMap: Record<keyof DataRow, CalculateMapCallback>;
  // dynamicaly use callback `fn` to do validation, returning boolean
  // location is cell location currently being validated
  // if false, return `message`
  validateMap: Record<keyof DataRow, CompositeCellValidation[]>;
  // map column to function (optionItem, row) => callback
  // function will be used as callback in Array(valuesMap[dataKey]).filter(callback)
  valuesFilter?: Record<keyof DataRow, ValuesFilter>;
  // in proposal, init spreadsheet style with array of pair range-CellStyle
  // defining style in range of columns and rows
  // "<rowIdA>-<rowIdB>:<colIdA>-<colIdB>" --> ["1-3:name-age", {...}]
  // style in range of columns of single row
  // "<rowId>:<colIdA>-<colIdB>" --> ["1:name-age", {...}]
  // style in range of rows of single column
  // "<rowIdA>-<rowIdB>:<colId>" --> ["1-3:name", {...}]
  // style single row indefinitely
  // "<rowId>:" --> ["1:", {...}]
  // style single column indefinitely
  // ":<colId>" --> [":name", {...}]
  initialSheetStyle: [string, CellStyle][];
  // cell style for header cell
  headerStyle: CellStyle;
  // cell style for validated cell
  validationCellStyle: CellStyle;
  // scroll listener for infinite scroll
  scrollListener: () => void;
  // header tooltip
  headerTooltipText: Record<keyof DataRow, string>;
  // header tooltip style
  headerTooltipStyle: React.CSSProperties;
};
export type SpreadSheetProps = {
  sheetData?: DataRow[];
  sheetOption?: Partial<SpreadSheetOption>;
  style?: React.CSSProperties;
  className?: string;
};

export type DataColumnMap = {
  [key: keyof DataRow]: string;
};
export type DataColumnHeaderMap = {
  rowNum: "#";
} & DataColumnMap;
export type DataColumnId = keyof DataColumnMap;

// TODO: strict typing needed, or just Set<string>?
export type ValuesMap = Set<any>;
export type ColumnValuesMap = {
  [key: keyof DataRow]: ValuesMap;
};

export type OptionItem = { value: string; label: string };

export type ValidationReport = Record<
  Row["rowId"],
  Record<keyof DataRow, string[]>
>;

export type RowChange = {
  uuid: string | Array<string>;
  rowId: Number | Array<Number>;
  data: any;
  prevData: any;
  changeType: "add" | "update" | "remove" | "duplicate";
}