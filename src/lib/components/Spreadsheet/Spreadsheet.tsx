import React, { useState, forwardRef, useImperativeHandle, useEffect } from "react";
import { ReactGrid, Column, Row, Id, CellChange, CellLocation, CellStyle } from '@silevis/reactgrid';

// import './react-grid-styles.css';
// import './spreadsheet.css';
import { 
  TextCreatableCellTemplate,
  ModifiedDropdownCellTemplate,
  ButtonCell, ButtonCellTemplate,
  SpreadsheetHeaderTemplate, SpreadsheetHeaderCell,
} from './templates';
import {
  SpreadSheetProps, SpreadSheetOption,
  SpreadSheetRow, SpreadSheetCellTypes, SpreadSheetColumnOption,
  DataRow, DataRowValue, DataColumnHeaderMap, DataColumnId,
  RowAction,
  ColumnValuesMap,
  CellState, CompositeCellValidation,
  OptionItem, ValidationReport,
} from './Spreadsheet.types';

const reorderArray = <T extends object>(arr: T[], idxs: number[], to: number) => {
  const movedElements = arr.filter((_, idx) => idxs.includes(idx));
  const targetIdx = Math.min(...idxs) < to ? to += 1 : to -= idxs.filter(idx => idx < to).length;
  const leftSide = arr.filter((_, idx) => idx < targetIdx && !idxs.includes(idx));
  const rightSide = arr.filter((_, idx) => idx >= targetIdx && !idxs.includes(idx));
  return [...leftSide, ...movedElements, ...rightSide];
};

const _newDate = (val: any): Date => {
  if (val instanceof Date) {
    return val;
  }
  try {
    return new Date(val);
  } catch {
    return new Date();
  }
}

const createOption = (
  item: string,
  getLabel?: (value: string) => string,
): OptionItem => {
  const option = {
    value: item as string,
    label: item as string,
  }
  if (getLabel) {
    option.label = getLabel(option.value);
  }
  if (option.label === undefined) {
    option.label = option.value;
  }
  return option;
}

const getValidationMessage = (
  validate: CompositeCellValidation,
  location: CellLocation,
  data: DataRow[],
): ( string | undefined ) => {
  const notPass = validate.fn(location, data);
  if (notPass) {
    return validate.message;
  }
  return undefined
}


const getDateTimeFormat = (
  options: SpreadSheetProps['sheetOption'],
  columnType: 'time' | 'date' = 'date',
): Intl.DateTimeFormat => {
  const key = columnType === 'date' ? 'dateFormatOptions' : 'timeFormatOptions';
  const locale = (options && options.sheetLocale) || 'en-US';
  const dtf = options && options[key];
  let format: Intl.DateTimeFormat;
  format = new Intl.DateTimeFormat();
  try {
    format = new Intl.DateTimeFormat(
      locale,
      dtf,
    );
  } catch {
    //
  }
  return format;
}

const _newBoolean = (val: DataRowValue|undefined): boolean => {
  if (val === undefined) {
    return false
  }
  if (typeof val === 'string' || typeof val === 'number') {
    try {
      return Boolean(JSON.parse(val.toString()));
    } catch {
      // 
    }
  }
  return Boolean(val);
}

const SpreadSheet = forwardRef((props: SpreadSheetProps, ref) => {
  const getHeader = () => {
    if (data.length === 0) {
      return []
    }
    if (props?.sheetOption?.includes) {
      return Object.keys(data[0]).slice(1).filter(key => props?.sheetOption?.includes && props.sheetOption.includes.includes(key))
    }
    return Object.keys(data[0]).slice(1);
  };

  const getDataColumnHeaderMap = (): DataColumnHeaderMap => {
    const _columnHeaderMap: DataColumnHeaderMap = {
      rowNum: '#',
    };
    const headersLabel_ = props?.sheetOption?.headersLabel || {};
    getHeader().forEach((key) => {
      if (key in headersLabel_) {
        _columnHeaderMap[key] = headersLabel_[key];
      } else {
        _columnHeaderMap[key] = key;
      }
    });
    return _columnHeaderMap;
  };
  const getHeaderColumnType = (header: string, columnType: SpreadSheetColumnOption = {}): SpreadSheetCellTypes['type'] => {
    return columnType[header] || 'text';
  }

  const getData = (
    sheetData?: DataRow[],
    sheetOption?: SpreadSheetProps['sheetOption']
  ) => {
    const sheetOption_ = Object.assign({}, sheetOption);
    const calculateMap = sheetOption_?.calculateMap || {};
    if (sheetData === null || sheetData === undefined) {
      return []
    }
    const columnOrder = sheetOption_?.includes || [];
    return sheetData.map((row, idx) => {
      // TODO: row[key] with value from calculatedMap are not passed correctly
      // calculate current 'row' value before passing to calculateMap[key](row)
      const row_ = Object.assign(
        Object.assign(
          {_idx: idx},
          Object.fromEntries(columnOrder.map((key) => [key, ''])),
        ),
        Object.fromEntries(Object.entries(row).map(([key, val]) => {
          if (calculateMap[key]) {
            return [key, calculateMap[key](row)]
          }
          return [key, val];
        })),
      );
      return row_;
    });
  }

  const [data, setData] = useState<DataRow[]>(getData(props?.sheetData, props?.sheetOption));
  const [dataColumnHeaderMap, setDataColumnHeaderMap] = useState<DataColumnHeaderMap>(getDataColumnHeaderMap())
  const [cellChanges, setCellChanges] = useState<CellChange<SpreadSheetCellTypes>[][]>(() => []);
  const [cellChangesIndex, setCellChangesIndex] = useState(() => -1);

  const getRowActions = (): Record<string, RowAction> => {
    return props?.sheetOption?.rowActions || {};
  }
  const _getColumnSize = (idx: number) => {
    const columnSize: number[] = props?.sheetOption?.columnSize || [];
    if (columnSize.length <= idx) {
      return 100 // default column size
    }
    return columnSize[idx];
  }
  const getColumns = (): Column[] => {
    const columns: Column[] = [
      { columnId: 'rowNum', width: 50, resizable: false, reorderable: false, },
    ];
    if (data.length === 0) {
      return columns;
    }

    getHeader().forEach((key, idx) => {
      columns.push({
        columnId: key,
        width: _getColumnSize(idx),
        resizable: true,
        reorderable: true,
      });
    });
    return columns;
  };
  const getColumnValuesMap = (): ColumnValuesMap => {
    const options = props?.sheetOption?.valuesMap || {};
    const valuesMap: ColumnValuesMap = {};
    let isFromOption = false;

    Object.keys(dataColumnHeaderMap).forEach((key) => {
      const _colType = getHeaderColumnType(key, props?.sheetOption?.columnType);
      if (_colType === 'dropdown' ||
          _colType === 's_creatable') {
        delete valuesMap[key];
        valuesMap[key] = new Set([]);
        valuesMap[key].clear();
        if (key in options) {
          options[key].forEach((item) => {
            valuesMap[key].add(item);
          })
          isFromOption = true;
        }
      }
    });
    if (isFromOption) {
      return valuesMap;
    }

    data.forEach((row) => {
      Object.keys(valuesMap).forEach(key => {
        if (key in row) {
          valuesMap[key].add(row[key]);
        }
      });
    });
    return valuesMap;
  }
  const addNewColumnValuesMap = (key: keyof ColumnValuesMap, value: any) => {
    setColumnValuesMap((prev) => {
      const updated = { ...prev };
      updated[key].add(value);
      return updated;
    })
  }
  const getActionColumns = (): Column[] => {
    const rowActionMap = getRowActions();
    let columns: Column[] = [];
    if (Object.values(rowActionMap).length === 0) {
      return columns;
    }
    columns = Object.keys(rowActionMap).map((key, idx) => ({
      columnId: `action-${key}`,
      width: _getColumnSize(idx+getHeader().length),
      resizable: false,
      reorderable: false,
    }))
    return columns;
  }

  const createCellState = (row: DataRow): CellState => {
    return Object.assign(
      {_idx: row._idx},
      ...Object.keys(row).filter(key => key !== '_idx').map(key => ({[key]: {}})),
    )
  }
  const getCellState = (): CellState[] => {
    return data.map((row) => createCellState(row));
  }

  // to access cell value => data[rowId][columnId]
  // to access cell validation => validation[rowId][columnId] ????
  // TODO: rather than splitting between `fn` and `message`,
  // why dont validation function returns `string` ?
  const getCellValidations = (
    data: SpreadSheetProps['sheetData'],
    sheetOption: SpreadSheetProps['sheetOption'],
  ): ValidationReport => {
    const result = {};
    const validateMap = sheetOption?.validateMap || {};
    let validationMessage: string[];
    let rowValidation: Record<string, string[]> = {};
    if (data === undefined) {
      return result;
    }
    data.forEach((row) => {
      rowValidation = {};
      Object.keys(row).forEach((column) => {
        if (column in validateMap) {
          validationMessage = validateMap[column].map(validate_ => {
            return getValidationMessage(
              validate_,
              { rowId: row._idx as Id, columnId: column },
              data,
            )
          }).filter(item => item !== undefined) as string[];
          Object.assign(
            rowValidation,
            { [column]: validationMessage },
          );
        }
      });
      Object.assign(result, { [row._idx as Id]: rowValidation });
    });
    return result;
  }

  const [columns, setColumns] = useState<Column[]>(getColumns());
  const [actionColumns] = useState<Column[]>(getActionColumns())
  const [columnValuesMap, setColumnValuesMap] = useState<ColumnValuesMap>(getColumnValuesMap());
  const _getColumnsWidth = () => columns.slice(1).map(col => col.width).filter(item => item !== undefined);
  const [cellStates, setCellStates] = useState<CellState[]>(getCellState());
  const [focusState, setFocusState] = useState<CellLocation|undefined>(undefined);
  const [validationReport, setValidationReport] = useState<ValidationReport>(
    getCellValidations(data, props?.sheetOption)
  );

  useEffect(() => {
    const data_ = getData(props?.sheetData, props?.sheetOption);
    setData(data_);
    setCellStates(prev => getCellState());
    setDataColumnHeaderMap(getDataColumnHeaderMap());
    setCellChanges([]);
    setCellChangesIndex(-1);
    setColumns(getColumns());
    setColumnValuesMap((prev) => getColumnValuesMap());
    setValidationReport(
      getCellValidations(data_, props?.sheetOption)
    );
  }, [props]);

  const getCellStyle = (
    rowId: Row['rowId'],
    columnId: Column['columnId'],
  ): CellStyle => {
    const cellStyle: Record<string, any> = {};
    let cellValidation: string[] = [];
    try {
      cellValidation = validationReport[rowId][columnId] || [];
    } catch {
      cellValidation = [];
    }

    // apply style if validation failed
    if (cellValidation.length > 0) {
      cellStyle.background = 'rgba(240, 23, 23, 0.69)';
    }
    return cellStyle;
  }

  const getCellStateValue = (cell: Record<string, any>, key: string) => {
    if (key in cell) {
      return cell[key];
    }
    return null;
  }

  const dumpData = () => {
    const calculateMap = props?.sheetOption?.calculateMap || {};
    return data.map((row: DataRow) => Object.fromEntries(Object.entries(row).map(
      ([key, val]) => {
        if (key === '_idx') {
          return [key, val]
        }
        if (key in calculateMap && val === '') {
          return [key, calculateMap[key](row).toString()]
        }
        return [key, val?.toString() || '']
      },
    )));
  };

  // expose state to ref.current
  useImperativeHandle(ref, () => ({
    getColumns: () => columns.slice(1),
    getData: () => dumpData(),
    getHeaderMap: () => dataColumnHeaderMap,
    getRows: () => getRows(
      data, columns.map(c => c.columnId as DataColumnId), cellStates,
    ),
    getValuesMap: () => columnValuesMap,
    getColumnSize: () => _getColumnsWidth(),
    getCellStates: () => cellStates,
    getSheetOption: (): SpreadSheetProps['sheetOption'] => ({
      includes: props?.sheetOption?.includes,
      columnSize: _getColumnsWidth() as number[],
      valuesMap: Object.fromEntries(
        Object.entries(columnValuesMap).map(([key, val]) => {
          return [key, [...val]]
        })
      ),
      // labelsMap: props?.sheetOption?.labelsMap || {},
      columnType: props?.sheetOption?.columnType || {},
      headersLabel: props?.sheetOption?.headersLabel || {},
      timeFormatOptions: props?.sheetOption?.timeFormatOptions,
      dateFormatOptions: props?.sheetOption?.dateFormatOptions,
      sheetLocale: props?.sheetOption?.sheetLocale,
      readOnly: props?.sheetOption?.readOnly,
    }),
    getValidationReport: () => {
      const reports = getCellValidations(data, props?.sheetOption);
      setValidationReport(reports);
      return reports;
    },
  }), [columns, data, dataColumnHeaderMap, columnValuesMap, validationReport]);

  // TODO: handle copy/paste value are taken from cell.text
  const createCellProps = (
    type: SpreadSheetCellTypes['type'],
    row: DataRow,
    state: CellState,
    dataKey: string,
    options: SpreadSheetProps['sheetOption'] = {},
  ): SpreadSheetCellTypes => {
    let nonEditable: SpreadSheetOption['readOnly'][string] = false;
    if (options?.readOnly !== undefined && dataKey in options.readOnly) {
      nonEditable = options.readOnly[dataKey];
    }
    let calculateMap: SpreadSheetOption['calculateMap'][string] | undefined = undefined;
    if (options?.calculateMap !== undefined && dataKey in options.calculateMap) {
      calculateMap = options.calculateMap[dataKey];
    }

    // cell value: taking value from sheetData or calculated
    let cellValue: DataRowValue | undefined = row[dataKey];
    if (nonEditable && calculateMap !== undefined) {
      cellValue = calculateMap(row) || '';
    }

    switch(type) {
      case 's_creatable': {
        let labelMap: SpreadSheetOption['labelsMap'][string] | undefined = undefined;
        if (options?.labelsMap !== undefined && dataKey in options.labelsMap) {
          labelMap = options.labelsMap[dataKey];
        }
        return {
          type,
          // inputValue: row[dataKey].toString(),
          options: Array.from(columnValuesMap[dataKey]).map(val => createOption(val, labelMap)),
          selectedValue: cellValue?.toString(),
          isOpen: getCellStateValue(state[dataKey], 'isOpen') || false,
          // text: row[dataKey]?.toString() || '',
          nonEditable,
          style: getCellStyle(row._idx as Id, dataKey),
        }
      }
      case 'dropdown': {
        const customOptionMap = options?.customOption || {};
        let customOption = undefined;
        if (dataKey in customOptionMap) {
          customOption = customOptionMap[dataKey];
        }
        let customSingleValue = undefined;
        const customSingleValueMap = options?.customSingleValue || {};
        if (dataKey in customSingleValueMap) {
          customSingleValue = customSingleValueMap[dataKey];
        }
        let labelMap: SpreadSheetOption['labelsMap'][string] | undefined = undefined;
        if (options?.labelsMap !== undefined && dataKey in options.labelsMap) {
          labelMap = options.labelsMap[dataKey];
        }
        return {
          type,
          inputValue: createOption(row[dataKey]?.toString() || '', labelMap).label,
          selectedValue: cellValue?.toString(),
          values: Array.from(columnValuesMap[dataKey]).map(val => createOption(val, labelMap)),
          isOpen: getCellStateValue(state[dataKey], 'isOpen') || false,
          text: row[dataKey]?.toString() || '',
          componentOption: customOption,
          componentSingleValue: customSingleValue,
          nonEditable,
          style: getCellStyle(row._idx as Id, dataKey),
        }
      }
      case 'checkbox': {
        return {
          type,
          checked: _newBoolean(cellValue),
          nonEditable,
          style: getCellStyle(row._idx as Id, dataKey),
        }
      }
      case 'date': {
        return {
          type,
          date: _newDate(cellValue),
          // text: row[dataKey]?.toString() || '',
          format: getDateTimeFormat(options,),
          nonEditable,
          style: getCellStyle(row._idx as Id, dataKey),
        }
      }
      case 'time': {
        return {
          type,
          time: _newDate(cellValue),
          // text: row[dataKey]?.toString() || '',
          format: getDateTimeFormat(options, 'time'),
          nonEditable,
          style: getCellStyle(row._idx as Id, dataKey),
        }
      }
      case 'email': {
        return {
          type,
          text: cellValue ? cellValue.toString() : '',
          validator: (v: string) => /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/.test(v),
          nonEditable,
          style: getCellStyle(row._idx as Id, dataKey),
        }
      }
      case 'number': {
        return {
          type,
          value: Number(cellValue),
          nonEditable,
          style: getCellStyle(row._idx as Id, dataKey),
        }
      }
      case 'text': {
        return {
          type,
          text: cellValue?.toString() || '',
          nonEditable,
          style: getCellStyle(row._idx as Id, dataKey),
        }
      }
      default: {
        return {
          type: 'text',
          text: cellValue?.toString() || '',
          nonEditable,
          style: getCellStyle(row._idx as Id, dataKey),
        }
      }
    }
  }

  const rowActionToButtonCell = (action: RowAction, row: DataRow): ButtonCell => {
    const decorated = (e: React.MouseEvent) => {
      return action?.action && action.action(e, row)
    }
    return {
      type: 'button',
      text: action.text,
      onClick: decorated,
      component: action?.component,
    }
  }

  const getRows = (
    dataRow: DataRow[],
    columnsOrder: DataColumnId[],
    cellStates: CellState[],
  ): SpreadSheetRow[] => {
    const itemRows = (_row: DataRow, cellState: CellState): SpreadSheetCellTypes[] => {
      return columnsOrder.slice(1).map<SpreadSheetCellTypes>((val) => Object.assign(
        {
          type: getHeaderColumnType(val.toString(), props?.sheetOption?.columnType),
        },
        {
          ...createCellProps(
            getHeaderColumnType(val.toString(), props?.sheetOption?.columnType),
            _row,
            cellState,
            val.toString(),
            props?.sheetOption || {},
          )
        }
      ));
    }
    const headersRow = (_col: Column[], headerMap: DataColumnHeaderMap): SpreadsheetHeaderCell[] => {
      return [
        ..._col.map((_, _idx) => ({
        type: 's_header',
        dataKey: columnsOrder[_idx].toString(),
        text: headerMap[columnsOrder[_idx]] ?
          headerMap[columnsOrder[_idx]].toString() : columnsOrder[_idx].toString(),
        })),
        ...actionColumns.map((col) => ({
          type: 's_header',
          text: getRowActions()[col.columnId.toString().split('-')[1]].text,
          dataKey: getRowActions()[col.columnId.toString().split('-')[1]].text,
        })),
      ] as SpreadsheetHeaderCell[];
    }
    return [
      {
        rowId: 'header',
        cells: headersRow(columns, dataColumnHeaderMap),
      },
      ...dataRow.map<SpreadSheetRow>((row, rowIdx) => ({
        rowId: row._idx as Id,
        reorderable: true,
        // height: 80,
        cells: [
          { type: 'header', text: rowIdx.toString(), },
          ...itemRows(row, cellStates[rowIdx] || createCellState(row)),
          // add action cell here?
          ...Object.values(getRowActions()).map((item) => rowActionToButtonCell(item, row)),
        ]
      })),
    ]
  }

  // extracting text/selected value in CellChange<T>
  // used in applyNewValue
  const getCellData = (cell: SpreadSheetCellTypes) => {
    switch(cell.type) {
      case "s_creatable":
      case "dropdown": {
        return cell.selectedValue;
      }
      case "checkbox": {
        return cell.checked;
      }
      case "date": {
        return cell.date;
      }
      case "number": {
        return cell.value;
      }
      case "time": {
        return cell.time;
      }
      case "text":
      default: {
        return cell.text;
      }
    }
  }

  const applyNewValue = (
    changes: CellChange<SpreadSheetCellTypes>[],
    prevData: DataRow[],
    sheetOption: SpreadSheetProps['sheetOption'],
    usePrevValue = false,
  ): DataRow[] => {
    const calculateMap = sheetOption?.calculateMap || {};
    const validateMap = sheetOption?.validateMap || {};
    changes.forEach((change) => {
      const rowIndex = prevData.findIndex(row => row._idx === change.rowId);
      const fieldName = change.columnId;
      const cell = usePrevValue ? change.previousCell : change.newCell;
      prevData[rowIndex][fieldName] = getCellData(cell);
      Object.keys(calculateMap).forEach(key => {
        if (key in prevData[rowIndex]) {
          prevData[rowIndex][key] = calculateMap[key](prevData[rowIndex]);
        }
      });
      // should validation done per changes or once for the whole sheet?
      const rowValidations: Record<string, string[]> = {};
      Object.keys(validateMap).forEach(key => {
        const validationMessage = validateMap[key].map(validate_ => {
          return getValidationMessage(
            validate_,
            { rowId: change.rowId, columnId: key },
            prevData,
          );
        }).filter(item => item !== undefined);
        Object.assign(rowValidations, { [key]: validationMessage });
        setValidationReport((prev) => {
          return Object.assign(
            prev,
            { [change.rowId]: rowValidations }
          );
        });
      });
    });
    return [...prevData];
  }
  const applyNewCellState = (
    changes: CellChange<SpreadSheetCellTypes>[],
    prevCellState: CellState[],
  ): CellState[] => {
    changes.forEach((change) => {
      const rowIndex = prevCellState.findIndex(row => row._idx === change.rowId);
      const fieldName = change.columnId;
      const cell = change.newCell;
      prevCellState[rowIndex][fieldName] = { ...cell };
      if (cell.type === 's_creatable') {
        const  options = cell?.options || [];
        options.forEach(item => {
          addNewColumnValuesMap(fieldName, item.value);
        });
      }
    })
    return [...prevCellState];
  }

  const applyChangesToHeader = (
    changes: CellChange<SpreadsheetHeaderCell>[],
    prevHeader: DataColumnHeaderMap,
  ): DataColumnHeaderMap => {
    const updated = { ...prevHeader };
    changes.forEach((change) => {
      const cell = change.newCell;
      const prevCell = change.previousCell;
      updated[prevCell.dataKey] = cell.text || '';
    });
    return updated
  }

  const getFilterDataChanges = (cell: CellChange<SpreadSheetCellTypes>) => {
    switch (cell.type) {
      case 's_creatable': {
        if (cell.newCell.options && cell.previousCell.options) {
          return (
            getCellData(cell.newCell) !== getCellData(cell.previousCell) ||
            cell.newCell.options.length !== cell.previousCell.options.length
          )
        }
        return (
          getCellData(cell.newCell) !== getCellData(cell.previousCell)
        )
      }
      case 'dropdown': {
        return getCellData(cell.newCell) !== getCellData(cell.previousCell)
      }
      default: {
        return true
      }
    }
  }
  const applyChangesToData = (
    changes: CellChange<SpreadSheetCellTypes>[],
    prevData: DataRow[],
    sheetOption: SpreadSheetProps['sheetOption'],
  ): DataRow[] => {
    const dataChanges = changes.filter((item) => {
      return getFilterDataChanges(item)
    });
    if (dataChanges.length > 0) {
      const updated = applyNewValue(changes, prevData, sheetOption);
      setCellChanges([...cellChanges.slice(0, cellChangesIndex + 1), dataChanges]);
      setCellChangesIndex(cellChangesIndex + 1);
      return updated;
    }
    return prevData
  }

  const applyChangesToCellState = (
    changes: CellChange<SpreadSheetCellTypes>[],
    prevCellState: CellState[],
  ) => {
    const updated = applyNewCellState(changes, prevCellState);
    return updated;
  }

  const undoChanges = (
    changes: CellChange<SpreadSheetCellTypes>[],
    prevData: DataRow[],
    sheetOption: SpreadSheetProps['sheetOption'],
  ) => {
    const updated = applyNewValue(changes, prevData, sheetOption, true);
    setCellChangesIndex(cellChangesIndex - 1);
    return updated;
  }
  const redoChanges = (
    changes: CellChange<SpreadSheetCellTypes>[],
    prevData: DataRow[],
    sheetOption: SpreadSheetProps['sheetOption'],
  ) => {
    const updated = applyNewValue(changes, prevData, sheetOption);
    setCellChangesIndex(cellChangesIndex + 1);
    return updated;
  }

  const handleChanges = (
    changes: CellChange<SpreadSheetCellTypes | SpreadsheetHeaderCell>[],
    // sheetOption: SpreadSheetProps['sheetOption'],
  ) => {
    // changes to header filter by 's_header'
    // else changes to data
    setDataColumnHeaderMap((prevHeader) => applyChangesToHeader(
      changes.filter(cell => cell.type === 's_header') as CellChange<SpreadsheetHeaderCell>[],
      prevHeader,
    ))
    /*
     */
    setCellStates((prevCellState) => applyChangesToCellState(
      changes.filter(cell => cell.type !== 's_header') as CellChange<SpreadSheetCellTypes>[],
      prevCellState,
    ));
    setData((prevData) => applyChangesToData(
      changes.filter(cell => cell.type !== 's_header') as CellChange<SpreadSheetCellTypes>[],
      prevData,
      props.sheetOption,
    ))
  }
  const handleUndoChanges = () => {
    console.log(cellChangesIndex, 'undo changesindex');
    if (cellChangesIndex >= 0) {
      setData((prevData) => undoChanges(
        cellChanges[cellChangesIndex],
        prevData,
        props.sheetOption,
      ));
    }
  }
  const handleRedoChanges = () => {
    console.log(cellChangesIndex, 'redo changesindex <= cellcahngeslength', cellChanges.length);
    if (cellChangesIndex + 1 <= cellChanges.length - 1) {
      setData((prevData) => redoChanges(
        cellChanges[cellChangesIndex + 1],
        prevData,
        props.sheetOption,
      ));
    }
  }

  const rows = getRows(
    data, columns.map(c => c.columnId as DataColumnId), cellStates,
  );

  const handleColumnResize = (ci: Id, width: number) => {
    setColumns((prevColumn) => {
      const columnIndex = prevColumn.findIndex(el => el.columnId === ci);
      const resizedColumn = prevColumn[columnIndex];
      const updatedColumn = {...resizedColumn, width};
      prevColumn[columnIndex] = updatedColumn;
      return [...prevColumn];
    });
  };

  const handleColumnsReorder = (targetColumnId: Id, columnsId: Id[]) => {
    const to = columns.findIndex((column) => column.columnId === targetColumnId);
    const columnIdxs = columnsId.map((columnId) => columns.findIndex((c) => c.columnId === columnId));
    setColumns(prevColumns => reorderArray(prevColumns, columnIdxs, to));
  };

  const handleRowsReorder = (targetRowId: Id, rowIds: Id[]) => {
    const to = data.findIndex((row) => row._idx === targetRowId);
    const rowsIds = rowIds.map((id) => data.findIndex(row => row._idx === id));
    setData((prevData) => reorderArray(prevData, rowsIds, to));
  };

  const handleCanReorderRows = (targetRowId: Id, rowIds: Id[]): boolean => {
    return targetRowId !== 'header';
  };

  const handleFocusLocationChanging = (location: CellLocation): boolean => {
    setFocusState((prev) => location);
    return true
  }

  return (
    <div
      onKeyDown={(e) => {
        const validateMap = props?.sheetOption?.validateMap || {};
        const calculateMap = props?.sheetOption?.calculateMap || {};
        // TODO: handle enterkey on cell.type=='text' still throwing error
        if (e.key === 'ArrowDown') {
          const lastData = data.at(-1);
          if (lastData && focusState && lastData._idx === focusState.rowId) {
            const empty: DataRow = {
              _idx: lastData._idx + 1,
            };
            Object.keys(lastData).slice(1).forEach((key) => {
              empty[key] = ''
            });
            Object.keys(calculateMap).forEach(key => {
              if (key in calculateMap) {
                empty[key] = calculateMap[key](empty).toString();
              }
            });
            const newState = createCellState(empty);
            const newData: DataRow[] = [...data, empty];

            setCellStates((prev) => {
              return [...prev, newState];
            });
            setData((prev) => {
              return [...prev, empty];
            });

            const newValidation: Record<string, string[]> =Object.fromEntries(Object.entries(validateMap)
            .filter(([key, val]) => empty[key] !== undefined)
            .map(([key, val]) => {
              const messages = val.map(validate_ => {
                return getValidationMessage(
                  validate_,
                  { rowId: empty._idx as Id, columnId: key },
                  newData,
                );
              }).filter(item => item !== undefined) as string[];
              return [key, messages];
            }));

            setValidationReport((prev) => ({
              ...prev,
              [empty._idx as Id]: newValidation,
            }));
          }
        }
        if (e.ctrlKey) {
          switch(e.key) {
            case 'z':
              handleUndoChanges();
              break;
            case 'y':
              handleRedoChanges();
              break;
          }
          e.stopPropagation();
        }
      }}
      onClick={() => {
        // console.log(data, 'data');
        // console.log(cellStates, 'cellstate');
      }}
      data-testid={"spreadsheet"}
    >
      <ReactGrid
        rows={rows} columns={[...columns, ...actionColumns]}
        onColumnResized={handleColumnResize}
        onColumnsReordered={handleColumnsReorder}
        onRowsReordered={handleRowsReorder}
        enableColumnSelection
        enableRowSelection
        enableRangeSelection
        canReorderRows={handleCanReorderRows}
        onCellsChanged={handleChanges}
        enableFillHandle
        customCellTemplates={{
          s_header: new SpreadsheetHeaderTemplate(),
          s_creatable: new TextCreatableCellTemplate(),
          dropdown: new ModifiedDropdownCellTemplate(),
          button: new ButtonCellTemplate(),
        }}
        initialFocusLocation={{
          columnId: columns[1] ? columns[1].columnId : columns[0].columnId,
          rowId: rows[1] ? rows[1].rowId : rows[0].rowId,
        }}
        onFocusLocationChanging={handleFocusLocationChanging}
      />
    </div>
  );
});

export default SpreadSheet;
