import React, {
  useState,
  forwardRef,
  useImperativeHandle,
  useEffect,
  useRef,
} from "react";
import {
  ReactGrid,
  Column,
  Row,
  Id,
  CellChange,
  CellLocation,
  CellStyle,
} from "@silevis/reactgrid";

import {
  TextCreatableCellTemplate,
  ModifiedDropdownCellTemplate,
  ButtonCell,
  ButtonCellTemplate,
  SpreadsheetHeaderTemplate,
  SpreadsheetHeaderCell,
} from "./templates";
import {
  SpreadSheetProps,
  SpreadSheetOption,
  SpreadSheetRow,
  SpreadSheetCellTypes,
  SpreadSheetColumnOption,
  DataRow,
  DataRowValue,
  DataColumnHeaderMap,
  DataColumnId,
  RowAction,
  ColumnValuesMap,
  CellState,
  CompositeCellValidation,
  OptionItem,
  ValidationReport,
  StyleState,
  SpreadsheetCellStyle,
  StyleStateNote,
  RowChange
} from "./Spreadsheet.types";
import { isRangePattern, isColonPattern } from "../../helpers";
import { getParser, replaceVariable } from "./formulaParser";
import useClickOutside from "../../hooks/useClickOutside";
import useOnScreen from "../../hooks/useOnScreen";
import { set } from "cypress/types/lodash";
import { v4 as uuid } from 'uuid';

const reorderArray = <T extends object>(
  arr: T[],
  idxs: number[],
  to: number
) => {
  const movedElements = arr.filter((_, idx) => idxs.includes(idx));
  const targetIdx =
    Math.min(...idxs) < to
      ? (to += 1)
      : (to -= idxs.filter((idx) => idx < to).length);
  const leftSide = arr.filter(
    (_, idx) => idx < targetIdx && !idxs.includes(idx)
  );
  const rightSide = arr.filter(
    (_, idx) => idx >= targetIdx && !idxs.includes(idx)
  );
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
};

const createOption = (
  item: string,
  getLabel?: (value: string) => string
): OptionItem => {
  const option = {
    value: item as string,
    label: item as string,
  };
  if (getLabel) {
    option.label = getLabel(option.value);
  }
  if (option.label === undefined) {
    option.label = option.value;
  }
  return option;
};

const getValidationMessage = (
  validate: CompositeCellValidation,
  location: CellLocation,
  data: DataRow[]
): string | undefined => {
  const notPass = validate.fn(location, data);
  if (notPass) {
    return validate.message;
  }
  return undefined;
};

const getDateTimeFormat = (
  options: SpreadSheetProps["sheetOption"],
  columnType: "time" | "date" = "date"
): Intl.DateTimeFormat => {
  const key = columnType === "date" ? "dateFormatOptions" : "timeFormatOptions";
  const locale = (options && options.sheetLocale) || "en-US";
  const dtf = options && options[key];
  let format: Intl.DateTimeFormat;
  format = new Intl.DateTimeFormat();
  try {
    format = new Intl.DateTimeFormat(locale, dtf);
  } catch {
    //
  }
  return format;
};

const _newBoolean = (val: DataRowValue | undefined): boolean => {
  if (val === undefined) {
    return false;
  }
  if (typeof val === "string" || typeof val === "number") {
    try {
      return Boolean(JSON.parse(val.toString()));
    } catch {
      //
    }
  }
  return Boolean(val);
};

const rangeDelimiter = "-";
const createRowStyle = (range: string, cellStyle: CellStyle) => {
  if (isRangePattern(range)) {
    const [start, end] = range
      .split(rangeDelimiter)
      .map((item) => Number(item));
    const result: Record<number, CellStyle> = {};
    if (start > end) {
      for (let i = end; i <= start; i++) {
        result[i] = cellStyle;
      }
      return result;
    }
    for (let i = start; i <= end; i++) {
      result[i] = cellStyle;
    }
    return result;
  } else {
    return { [range]: cellStyle };
  }
};
const createColumnStyle = (range: string, cellStyle: CellStyle) => {
  if (isRangePattern(range)) {
    const result: Record<string, CellStyle> = {};
    range.split(rangeDelimiter).forEach((col) => {
      result[col] = cellStyle;
    });
    return result;
  } else {
    return { [range]: cellStyle };
  }
};
const createSpreadsheetStyle = (
  rowRange: string,
  colRange: string,
  cellStyle: CellStyle
) => {
  if (isRangePattern(rowRange)) {
    const [start, end] = rowRange
      .split(rangeDelimiter)
      .map((item) => Number(item));
    const result: Record<number, Record<string, CellStyle>> = {};
    if (start > end) {
      for (let i = end; i <= start; i++) {
        result[i] = createColumnStyle(colRange, cellStyle);
      }
      return result;
    }
    for (let i = start; i <= end; i++) {
      result[i] = createColumnStyle(colRange, cellStyle);
    }
    return result;
  } else {
    return { [rowRange]: createColumnStyle(colRange, cellStyle) };
  }
};

const SpreadSheet = forwardRef((props: SpreadSheetProps, ref) => {
  const getHeader = () => {
    if (data.length === 0) {
      return [];
    }
    if (props?.sheetOption?.includes) {
      return Object.keys(data[0])
        .slice(1)
        .filter(
          (key) =>
            props?.sheetOption?.includes &&
            props.sheetOption.includes.includes(key)
        );
    }
    return Object.keys(data[0]).slice(1);
  };

  const getDataColumnHeaderMap = (): DataColumnHeaderMap => {
    const _columnHeaderMap: DataColumnHeaderMap = {
      rowNum: "#",
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
  const getHeaderColumnType = (
    header: string,
    columnType: SpreadSheetColumnOption = {}
  ): SpreadSheetCellTypes["type"] => {
    return columnType[header] || "text";
  };

  const getData = (
    sheetData?: DataRow[],
    sheetOption?: SpreadSheetProps["sheetOption"]
  ) => {
    const sheetOption_ = Object.assign({}, sheetOption);
    const calculateMap = sheetOption_?.calculateMap || {};
    if (sheetData === null || sheetData === undefined) {
      return [];
    }
    const columnOrder = sheetOption_?.includes || [];
    return sheetData.map((row, idx) => {
      // TODO: row[key] with value from calculatedMap are not passed correctly
      // calculate current 'row' value before passing to calculateMap[key](row)
      const row_ = Object.assign(
        Object.assign(
          { _idx: idx },
          Object.fromEntries(columnOrder.map((key) => [key, ""]))
        ),
        Object.fromEntries(
          Object.entries(row).map(([key, val]) => {
            if (calculateMap[key]) {
              return [
                key,
                calculateMap[key](row, sheetData, {
                  rowId: idx,
                  columnId: key,
                }),
              ];
            }
            return [key, val];
          })
        )
      );
      return row_;
    });
  };

  const [data, setData] = useState<DataRow[]>(
    getData(props?.sheetData, props?.sheetOption)
  );
  const [dataColumnHeaderMap, setDataColumnHeaderMap] =
    useState<DataColumnHeaderMap>(getDataColumnHeaderMap());
  const [cellChanges, setCellChanges] = useState<
    CellChange<SpreadSheetCellTypes>[][]
  >(() => []);
  const [rowChanges, setRowChanges] = useState<
    RowChange[]
  >(() => []);
  const [cellChangesIndex, setCellChangesIndex] = useState(() => -1);

  const getRowActions = (): Record<string, RowAction> => {
    return props?.sheetOption?.rowActions || {};
  };
  const _getColumnSize = (idx: number) => {
    const columnSize: number[] = props?.sheetOption?.columnSize || [];
    if (columnSize.length <= idx) {
      return 100; // default column size
    }
    return columnSize[idx];
  };
  const getColumns = (): Column[] => {
    const columns: Column[] = [
      { columnId: "rowNum", width: 50, resizable: false, reorderable: false },
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
      if (_colType === "dropdown" || _colType === "s_creatable") {
        delete valuesMap[key];
        valuesMap[key] = new Set([]);
        valuesMap[key].clear();
        if (key in options) {
          options[key].forEach((item) => {
            valuesMap[key].add(item);
          });
          isFromOption = true;
        }
      }
    });
    if (isFromOption) {
      return valuesMap;
    }

    data.forEach((row) => {
      Object.keys(valuesMap).forEach((key) => {
        if (key in row) {
          valuesMap[key].add(row[key]);
        }
      });
    });
    return valuesMap;
  };
  const addNewColumnValuesMap = (key: keyof ColumnValuesMap, value: any) => {
    setColumnValuesMap((prev) => {
      const updated = { ...prev };
      updated[key].add(value);
      return updated;
    });
  };
  const getActionColumns = (): Column[] => {
    const rowActionMap = getRowActions();
    let columns: Column[] = [];
    if (Object.values(rowActionMap).length === 0) {
      return columns;
    }
    columns = Object.keys(rowActionMap).map((key, idx) => ({
      columnId: `action-${key}`,
      width: _getColumnSize(idx + getHeader().length),
      resizable: false,
      reorderable: false,
    }));
    return columns;
  };

  const createCellState = (row: DataRow): CellState => {
    return Object.assign(
      { _idx: row._idx },
      ...Object.keys(row)
        .filter((key) => key !== "_idx")
        .map((key) => ({ [key]: {} }))
    );
  };
  const getCellState = (): CellState[] => {
    return data.map((row) => createCellState(row));
  };

  // to access cell value => data[rowId][columnId]
  // to access cell validation => validation[rowId][columnId] ????
  // TODO: rather than splitting between `fn` and `message`,
  // why dont validation function returns `string` ?
  const getCellValidations = (
    data: SpreadSheetProps["sheetData"],
    sheetOption: SpreadSheetProps["sheetOption"]
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
          validationMessage = validateMap[column]
            .map((validate_) => {
              return getValidationMessage(
                validate_,
                { rowId: row._idx as Id, columnId: column },
                data
              );
            })
            .filter((item) => item !== undefined) as string[];
          Object.assign(rowValidation, { [column]: validationMessage });
        }
      });
      Object.assign(result, { [row._idx as Id]: rowValidation });
    });
    return result;
  };

  // parse initial spreadsheet style
  // style in range of columns and rows
  // "<rowIdA>-<rowIdB>:<colIdA>-<colIdB>" --> 1-3:name-age
  // style in range of columns of single row
  // "<rowId>:<colIdA>-<colIdB>" --> 1:name-age
  // style in range of rows of single column
  // "<rowIdA>-<rowIdB>:<colId>" --> 1-3:name
  // style single row indefinitely
  // "<rowId>:" --> 1:
  // style single column indefinitely
  // ":<colId>" --> :name
  // TODO: currently will leave colRange "colNameA-colNameZ" to apply style to
  // only colNameA and colNameZ instead of "colNameA through colNameZ"
  const createStyleState = (): StyleState => {
    const initialStyles = props?.sheetOption?.initialSheetStyle || [];
    let styleType: StyleStateNote["type"];
    const state_: StyleState = { type: "columnstyle" };

    initialStyles.forEach((item) => {
      if (item && item?.at(0) && isColonPattern(item[0])) {
        const strRange: string = item[0];
        const [rowRange, colRange] = strRange.split(":");
        if (styleType === undefined) {
          if (rowRange === "") {
            styleType = "columnstyle";
          } else if (colRange === "") {
            styleType = "rowstyle";
          } else {
            styleType = "cellstyle";
          }

          state_["type"] = styleType;
        }

        if (rowRange && colRange) {
          // assign SpreadsheetCellStyle
          Object.assign(
            state_,
            createSpreadsheetStyle(rowRange, colRange, item[1])
          );
        } else if (rowRange) {
          // assign rowstyle
          Object.assign(state_, createRowStyle(rowRange, item[1]));
        } else if (colRange) {
          // assign colstyle
          Object.assign(state_, createColumnStyle(colRange, item[1]));
        }
      }
    });
    return state_;
  };

  const [columns, setColumns] = useState<Column[]>(getColumns());
  const [actionColumns] = useState<Column[]>(getActionColumns());
  const [columnValuesMap, setColumnValuesMap] = useState<ColumnValuesMap>(
    getColumnValuesMap()
  );
  const _getColumnsWidth = () =>
    columns
      .slice(1)
      .map((col) => col.width)
      .filter((item) => item !== undefined);
  const [cellStates, setCellStates] = useState<CellState[]>(getCellState());
  const [focusState, setFocusState] = useState<CellLocation | undefined>(
    undefined
  );
  const [validationReport, setValidationReport] = useState<ValidationReport>(
    getCellValidations(data, props?.sheetOption)
  );
  const [styleState, setStyleState] = useState<StyleState>(() =>
    createStyleState()
  );

  useEffect(() => {
    const data_ = getData(props?.sheetData, props?.sheetOption);
    setData(data_);
    setCellStates((prev) => getCellState());
    setDataColumnHeaderMap(getDataColumnHeaderMap());
    setCellChanges([]);
    setCellChangesIndex(-1);
    setColumns(getColumns());
    setColumnValuesMap((prev) => getColumnValuesMap());
    setValidationReport(getCellValidations(data_, props?.sheetOption));
    setStyleState(() => createStyleState());
  }, [props]);

  const getValidationStyle = () => {
    return props?.sheetOption?.validationCellStyle || {};
  };
  const getCellStyle = (
    rowId: Row["rowId"],
    columnId: Column["columnId"]
  ): CellStyle => {
    let cellStyle: Record<string, any> = {};

    switch (styleState.type) {
      case "rowstyle":
        if (rowId in styleState) {
          cellStyle = styleState[rowId] as typeof cellStyle;
        }
        break;
      case "columnstyle":
        if (columnId in styleState) {
          cellStyle = styleState[columnId] as typeof cellStyle;
        }
        break;
      case "cellstyle":
        if (
          rowId in styleState &&
          styleState[rowId] !== undefined &&
          columnId in (styleState[rowId] as SpreadsheetCellStyle)
        ) {
          cellStyle = (styleState[rowId] as SpreadsheetCellStyle)[columnId];
        }
        break;
    }

    let cellValidation: string[] = [];
    try {
      cellValidation = validationReport[rowId][columnId] || [];
    } catch {
      cellValidation = [];
    }

    // apply style if validation failed
    // TODO: expose validation styling option
    // key => columnId + message
    if (cellValidation.length > 0) {
      cellStyle.background = "rgba(240, 23, 23, 0.69)";
      Object.assign(cellStyle, getValidationStyle());
    }
    return cellStyle;
  };

  const getCellStateValue = (cell: Record<string, any>, key: string) => {
    if (key in cell) {
      return cell[key];
    }
    return null;
  };

  const dumpData = () => {
    const calculateMap = props?.sheetOption?.calculateMap || {};
    return data.map((row: DataRow) =>
      Object.fromEntries(
        Object.entries(row).map(([key, val]) => {
          if (key === "_idx") {
            return [key, val];
          }
          if (key in calculateMap && val === "") {
            return [
              key,
              calculateMap[key](row, data, {
                rowId: row._idx as Id,
                columnId: key,
              }).toString(),
            ];
          }
          return [key, val?.toString() || ""];
        })
      )
    );
  };

  // expose state to ref.current
  useImperativeHandle(
    ref,
    () => ({
      getColumns: () => columns.slice(1),
      getData: () => dumpData(),
      getHeaderMap: () => dataColumnHeaderMap,
      getRows: () =>
        getRows(
          data,
          columns.map((c) => c.columnId as DataColumnId),
          cellStates
        ),
      getValuesMap: () => columnValuesMap,
      getColumnSize: () => _getColumnsWidth(),
      getCellStates: () => cellStates,
      getSheetOption: (): SpreadSheetProps["sheetOption"] => ({
        includes: props?.sheetOption?.includes,
        columnSize: _getColumnsWidth() as number[],
        valuesMap: Object.fromEntries(
          Object.entries(columnValuesMap).map(([key, val]) => {
            return [key, [...val]];
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
      getStyleState: () => styleState,
      // expose setFocusState
      setFocusState: (newState: CellLocation | undefined) => {
        // console.log('setfocusstate', newState);
        setFocusState(newState);
      },
      // function add row below the focusstate or at the end of the sheet
      addRow: () => {
        const newRow = Object.assign(
          { _idx: data.length },
          Object.fromEntries(
            Object.keys(data[0])
              .filter((key) => key !== "_idx")
              .map((key) => [key, ""])
          )
        );
        newRow.uuid=uuid()
        let newData = [...data];
        if (focusState !== undefined) {
          const rowId = focusState.rowId;
          newRow._idx = +rowId;
          newData.splice(+rowId + 1, 0, newRow);
          newData = newData.map((obj, i) => ({ ...obj, _idx: i }));
          setData(newData);
          setCellStates((prev) => {
            const newState = [...prev];
            newState.splice(+rowId + 1, 0, createCellState(newRow));
            let newCellState = newState.map((obj, i) => ({
              ...obj,
              _idx: i,
            })) as CellState[];
            return newCellState;
          });
          setValidationReport(getCellValidations(newData, props?.sheetOption));
        } else {
          setData([...data, newRow]);
          setCellStates((prev) => [...prev, createCellState(newRow)]);
          setValidationReport(getCellValidations([...data, newRow], props?.sheetOption));
        }
        setCellChanges([
          ...cellChanges.slice(0, cellChangesIndex + 1),
          {} as CellChange<SpreadSheetCellTypes>[],
        ]);
        setCellChangesIndex(cellChangesIndex + 1);
        setRowChanges([...rowChanges.slice(0, cellChangesIndex + 1), {uuid: newRow.uuid,
          rowId: newRow._idx +1,
          data: newRow,
          prevData: {},
          changeType: "add"}]);
        setFocusState(undefined);
      },
      // create remove row on focusstate location and multiple selected rows
      removeRow: () => {
        if (focusState !== undefined) {
          const rowId = getSelectedRowIds();
          let newData = [...data];
          for (const id of rowId) {
            newData.splice(+id, 1);
          }
          newData = newData.map((obj, i) => ({ ...obj, _idx: i }));
          setData(newData);
          setCellStates((prev) => {
            const newState = [...prev];
            for (const id of rowId) {
              newState.splice(+rowId, 1);
            }
            let newCellState = newState.map((obj, i) => ({
              ...obj,
              _idx: i,
            })) as CellState[];
            return newCellState;
          });
          let arrCellChanges = rowId.map(() => {return({})}) as CellChange<SpreadSheetCellTypes>[][]
          let arrRowChange = rowId.map((id) => {
            return (
              {
                uuid: String(data[id as number].uuid),
                rowId: id,
                data: {},
                prevData: data[id as number],
                changeType: "remove"
              })
          }) as RowChange[];
          setCellChanges([
            ...cellChanges.slice(0, cellChangesIndex + 1),
            ...arrCellChanges,
          ]);
          setCellChangesIndex(cellChangesIndex + rowId.length);
          setRowChanges([...rowChanges.slice(0, cellChangesIndex + 1), ...arrRowChange]);              
          setFocusState(undefined);
        }
      },
      // get cellchange (already consider undo/redo)
      getCellChanges: () => {
        if (cellChangesIndex >= 0) {
          return rowChanges.slice(0, cellChangesIndex + 1);
        }
        return [];
      },
      //sort data based on multiple keys
      sortData: (sortKeys: string[]) => {
        const _sortKeys = sortKeys.map((key) => {
          if (key.startsWith("-")) {
            return { key: key.slice(1), order: "desc" };
          }
          return { key, order: "asc" };
        });
        const newData = [...data];
        newData.sort((a, b) => {
          for (let i = 0; i < _sortKeys.length; i++) {
            const key = _sortKeys[i].key;
            const order = _sortKeys[i].order;
            if ((a[key] ?? 0) < (b[key] ?? 0)) {
              return order === "asc" ? -1 : 1;
            }
            if ((a[key] ?? 0) > (b[key] ?? 0)) {
              return order === "asc" ? 1 : -1;
            }
          }
          return 0;
        });
        setData(newData);
        setCellStates(getCellState());
      },
      // add new data to spreadsheet
      addNewData: (newData: DataRow[]) => {
        let newRow = getData(newData, props?.sheetOption);
        let newDataInfiniteScroll 
        if (data.length === 1) {
          newDataInfiniteScroll = [...newRow]
        } else {
          let newRow2 = newRow.map((row) => {
            return { ...row, _idx: row._idx + data.length };
          });
          newDataInfiniteScroll=[...data, ...newRow2];
        }
        setData(newDataInfiniteScroll);
        setCellStates(newDataInfiniteScroll.map((row) => createCellState(row)));
        setValidationReport(getCellValidations(newDataInfiniteScroll, props?.sheetOption));
        if (isOnScreen) {
          setForceFetch(pre=>pre+1);
        }
      },
      // undo changes
      undo: () => handleUndoChanges(),
      // redo changes
      redo: () => handleRedoChanges(),
      // duplicate row
      duplicateRow: () => {
        if (focusState !== undefined) {
          const rowId = focusState.rowId;
          const newRow = Object.assign(
            { _idx: rowId as number },
            Object.fromEntries(
              Object.keys(data[0])
                .filter((key) => key !== "_idx")
                .map((key) => [key, data[rowId as number][key]])
            )
          );
          newRow.uuid=uuid()
          let newData = [...data];
          newData.splice(+rowId + 1, 0, newRow);
          newData = newData.map((obj, i) => ({ ...obj, _idx: i }));
          setData(newData);
          setCellStates((prev) => {
            const newState = [...prev];
            newState.splice(+rowId + 1, 0, createCellState(newRow));
            let newCellState = newState.map((obj, i) => ({
              ...obj,
              _idx: i,
            })) as CellState[];
            return newCellState;
          });
          setValidationReport(getCellValidations(newData, props?.sheetOption));
          setCellChanges([
            ...cellChanges.slice(0, cellChangesIndex + 1),
            {} as CellChange<SpreadSheetCellTypes>[],
          ]);
          setCellChangesIndex(cellChangesIndex + 1);
          setRowChanges([...rowChanges.slice(0, cellChangesIndex + 1), {uuid: newRow.uuid,
            rowId: newRow._idx +1,
            data: newRow,
            prevData: {},
            changeType: "duplicate"}]);
          setFocusState(undefined);
        }
      },
    }),
    [
      columns,
      data,
      dataColumnHeaderMap,
      columnValuesMap,
      validationReport,
      styleState,
      focusState,
    ]
  );

  const getSpreadsheetColumnValuesMap = (
    dataKey: string,
    row: DataRow,
    options: SpreadSheetProps["sheetOption"] = {}
  ): OptionItem[] => {
    if (!columnValuesMap[dataKey]) {
      return [];
    }
    let labelMap: ((val: string) => string) | undefined = undefined;
    if (options?.labelsMap !== undefined && dataKey in options.labelsMap) {
      labelMap = options.labelsMap[dataKey];
    }
    let values = Array.from(columnValuesMap[dataKey]);
    if (options?.valuesFilter && dataKey in options.valuesFilter) {
      const filter_ = options.valuesFilter[dataKey];
      values = values.filter((item) => {
        return filter_(item, row);
      });
    }
    return values.map((val) => createOption(val, labelMap));
  };

  // TODO: handle copy/paste value are taken from cell.text
  const createCellProps = (
    type: SpreadSheetCellTypes["type"],
    row: DataRow,
    state: CellState,
    dataKey: string,
    dataRow: DataRow[],
    options: SpreadSheetProps["sheetOption"] = {}
  ): SpreadSheetCellTypes => {
    let nonEditable: SpreadSheetOption["readOnly"][string] = false;
    if (options?.readOnly !== undefined && dataKey in options.readOnly) {
      nonEditable = options.readOnly[dataKey];
    }
    let calculateMap: SpreadSheetOption["calculateMap"][string] | undefined =
      undefined;
    if (
      options?.calculateMap !== undefined &&
      dataKey in options.calculateMap
    ) {
      calculateMap = options.calculateMap[dataKey];
    }

    // cell value: taking value from sheetData or calculated
    let cellValue: DataRowValue | undefined = row[dataKey];
    if (nonEditable && calculateMap !== undefined) {
      cellValue =
        calculateMap(row, dataRow, {
          rowId: row._idx as Id,
          columnId: dataKey,
        }) || "";
    }

    switch (type) {
      case "s_creatable": {
        return {
          type,
          // inputValue: row[dataKey].toString(),
          options: getSpreadsheetColumnValuesMap(dataKey, row, options),
          selectedValue: cellValue?.toString(),
          isOpen: getCellStateValue(state[dataKey], "isOpen") || false,
          // text: row[dataKey]?.toString() || '',
          nonEditable,
          style: getCellStyle(row._idx as Id, dataKey),
        };
      }
      case "dropdown": {
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
        let labelMap: SpreadSheetOption["labelsMap"][string] | undefined =
          undefined;
        if (options?.labelsMap !== undefined && dataKey in options.labelsMap) {
          labelMap = options.labelsMap[dataKey];
        }
        return {
          type,
          inputValue: createOption(row[dataKey]?.toString() || "", labelMap)
            .label,
          selectedValue: cellValue?.toString(),
          values: getSpreadsheetColumnValuesMap(dataKey, row, options),
          isOpen: getCellStateValue(state[dataKey], "isOpen") || false,
          text: row[dataKey]?.toString() || "",
          componentOption: customOption,
          componentSingleValue: customSingleValue,
          nonEditable,
          style: getCellStyle(row._idx as Id, dataKey),
        };
      }
      case "checkbox": {
        return {
          type,
          checked: _newBoolean(cellValue),
          nonEditable,
          style: getCellStyle(row._idx as Id, dataKey),
        };
      }
      case "date": {
        return {
          type,
          date: _newDate(cellValue),
          // text: row[dataKey]?.toString() || '',
          format: getDateTimeFormat(options),
          nonEditable,
          style: getCellStyle(row._idx as Id, dataKey),
        };
      }
      case "time": {
        return {
          type,
          time: _newDate(cellValue),
          // text: row[dataKey]?.toString() || '',
          format: getDateTimeFormat(options, "time"),
          nonEditable,
          style: getCellStyle(row._idx as Id, dataKey),
        };
      }
      case "email": {
        return {
          type,
          text: cellValue ? cellValue.toString() : "",
          validator: (v: string) =>
            /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/.test(
              v
            ),
          nonEditable,
          style: getCellStyle(row._idx as Id, dataKey),
        };
      }
      case "number": {
        return {
          type,
          value: Number(cellValue),
          nonEditable,
          style: getCellStyle(row._idx as Id, dataKey),
        };
      }
      case "text":
      default: {
        return {
          type: "text",
          text: cellValue?.toString() || "",
          nonEditable,
          style: getCellStyle(row._idx as Id, dataKey),
          renderer: (text: string): string => {
            const formulaParser = getParser();
            // TODO: formula pattern?
            if (text.startsWith("=")) {
              let cellText = text;
              // TODO: parse variable pattern
              try {
                // parse formula(row, sheetData)
                // cellText = String(formulaParser.calculateFormula(text, 0));
                // cellText = replaceVariable(text, row, data);
                cellText = String(
                  formulaParser.calculateFormula(
                    replaceVariable(text, row, data),
                    0
                  )
                );
              } catch (error) {
                console.log(error);
                cellText = "#FORMULA";
              }
              return cellText;
            }
            return text;
          },
        };
      }
    }
  };

  const rowActionToButtonCell = (
    action: RowAction,
    row: DataRow
  ): ButtonCell => {
    const decorated = (e: React.MouseEvent) => {
      return action?.action && action.action(e, row);
    };
    return {
      type: "button",
      text: action.text,
      onClick: decorated,
      component: action?.component,
    };
  };

  const getHeaderStyle = (): CellStyle => {
    return props?.sheetOption?.headerStyle || {};
  };

  const getRows = (
    dataRow: DataRow[],
    columnsOrder: DataColumnId[],
    cellStates: CellState[]
  ): SpreadSheetRow[] => {
    const itemRows = (
      _row: DataRow,
      cellState: CellState
    ): SpreadSheetCellTypes[] => {
      return columnsOrder.slice(1).map<SpreadSheetCellTypes>((val) =>
        Object.assign(
          {
            type: getHeaderColumnType(
              val.toString(),
              props?.sheetOption?.columnType
            ),
          },
          {
            ...createCellProps(
              getHeaderColumnType(
                val.toString(),
                props?.sheetOption?.columnType
              ),
              _row,
              cellState,
              val.toString(),
              dataRow,
              props?.sheetOption || {}
            ),
          }
        )
      );
    };
    const headersRow = (
      _col: Column[],
      headerMap: DataColumnHeaderMap
    ): SpreadsheetHeaderCell[] => {
      return [
        ..._col.map((_, _idx) => ({
          type: "s_header",
          dataKey: columnsOrder[_idx].toString(),
          text: headerMap[columnsOrder[_idx]]
            ? headerMap[columnsOrder[_idx]].toString()
            : columnsOrder[_idx].toString(),
          icon: props?.sheetOption?.headerIcon
            ? props?.sheetOption?.headerIcon[columnsOrder[_idx].toString()] ||
              function () {
                return;
              }
            : function () {
                return;
              },
          style: getHeaderStyle(), // headerStyle
        })),
        ...actionColumns.map((col) => ({
          type: "s_header",
          text: getRowActions()[col.columnId.toString().split("-")[1]].text,
          dataKey: getRowActions()[col.columnId.toString().split("-")[1]].text,
        })),
      ] as SpreadsheetHeaderCell[];
    };
    return [
      {
        rowId: "header",
        cells: headersRow(columns, dataColumnHeaderMap),
      },
      ...dataRow.map<SpreadSheetRow>((row, rowIdx) => ({
        rowId: row._idx as Id,
        reorderable: true,
        // height: 80,
        cells: [
          {
            type: "header",
            text: rowIdx.toString(),
            style: getHeaderStyle(), // headerStyle
          },
          ...itemRows(row, cellStates[rowIdx] || createCellState(row)),
          // add action cell here?
          ...Object.values(getRowActions()).map((item) =>
            rowActionToButtonCell(item, row)
          ),
        ],
      })),
    ];
  };

  // extracting text/selected value in CellChange<T>
  // used in applyNewValue
  const getCellData = (cell: SpreadSheetCellTypes) => {
    switch (cell.type) {
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
  };

  const applyNewValue = (
    changes: CellChange<SpreadSheetCellTypes>[],
    prevData: DataRow[],
    sheetOption: SpreadSheetProps["sheetOption"],
    usePrevValue = false
  ): DataRow[] => {
    const calculateMap = sheetOption?.calculateMap || {};
    const validateMap = sheetOption?.validateMap || {};
    changes.forEach((change) => {
      const rowIndex = prevData.findIndex((row) => row._idx === change.rowId);
      const fieldName = change.columnId;
      const cell = usePrevValue ? change.previousCell : change.newCell;
      prevData[rowIndex][fieldName] = getCellData(cell);
      Object.keys(calculateMap).forEach((key) => {
        if (key in prevData[rowIndex]) {
          prevData[rowIndex][key] = calculateMap[key](
            prevData[rowIndex],
            prevData,
            { rowId: change.rowId, columnId: change.columnId }
          );
        }
      });
      // should validation done per changes or once for the whole sheet?
      const rowValidations: Record<string, string[]> = {};
      Object.keys(validateMap).forEach((key) => {
        const validationMessage = validateMap[key]
          .map((validate_) => {
            return getValidationMessage(
              validate_,
              { rowId: change.rowId, columnId: key },
              prevData
            );
          })
          .filter((item) => item !== undefined);
        Object.assign(rowValidations, { [key]: validationMessage });
        setValidationReport((prev) => {
          return Object.assign(prev, { [change.rowId]: rowValidations });
        });
      });
    });
    return [...prevData];
  };
  const applyNewCellState = (
    changes: CellChange<SpreadSheetCellTypes>[],
    prevCellState: CellState[]
  ): CellState[] => {
    changes.forEach((change) => {
      const rowIndex = prevCellState.findIndex(
        (row) => row._idx === change.rowId
      );
      const fieldName = change.columnId;
      const cell = change.newCell;
      prevCellState[rowIndex][fieldName] = { ...cell };
      if (cell.type === "s_creatable") {
        const options = cell?.options || [];
        options.forEach((item) => {
          addNewColumnValuesMap(fieldName, item.value);
        });
      }
    });
    return [...prevCellState];
  };

  const applyChangesToHeader = (
    changes: CellChange<SpreadsheetHeaderCell>[],
    prevHeader: DataColumnHeaderMap
  ): DataColumnHeaderMap => {
    const updated = { ...prevHeader };
    changes.forEach((change) => {
      const cell = change.newCell;
      const prevCell = change.previousCell;
      updated[prevCell.dataKey] = cell.text || "";
    });
    return updated;
  };

  const getFilterDataChanges = (cell: CellChange<SpreadSheetCellTypes>) => {
    switch (cell.type) {
      case "s_creatable": {
        if (cell.newCell.options && cell.previousCell.options) {
          return (
            getCellData(cell.newCell) !== getCellData(cell.previousCell) ||
            cell.newCell.options.length !== cell.previousCell.options.length
          );
        }
        return getCellData(cell.newCell) !== getCellData(cell.previousCell);
      }
      case "dropdown": {
        return getCellData(cell.newCell) !== getCellData(cell.previousCell);
      }
      default: {
        return true;
      }
    }
  };
  const applyChangesToData = (
    changes: CellChange<SpreadSheetCellTypes>[],
    prevData: DataRow[],
    sheetOption: SpreadSheetProps["sheetOption"]
  ): DataRow[] => {
    const dataChanges = changes.filter((item) => {
      return getFilterDataChanges(item);
    });
    if (dataChanges.length > 0) {
      const updated = applyNewValue(changes, prevData, sheetOption);
      setCellChanges([
        ...cellChanges.slice(0, cellChangesIndex + 1),
        dataChanges,
      ]);
      setCellChangesIndex(cellChangesIndex + 1);
      setRowChanges([...rowChanges.slice(0, cellChangesIndex + 1), {
        uuid: changes.map(el=>String(data[el.rowId as number].uuid)) ,
        rowId: changes.map(el=>el.rowId as number),
        data: changes.map(el=>{return({[el.columnId]:el.newCell})}),
        prevData: changes.map(el=>{return({[el.columnId]:el.previousCell})}),
        changeType: "update"}]);
      return updated;
    }
    return prevData;
  };

  const applyChangesToCellState = (
    changes: CellChange<SpreadSheetCellTypes>[],
    prevCellState: CellState[]
  ) => {
    const updated = applyNewCellState(changes, prevCellState);
    return updated;
  };

  const undoChanges = (
    changes: CellChange<SpreadSheetCellTypes>[],
    prevData: DataRow[],
    sheetOption: SpreadSheetProps["sheetOption"]
  ) => {
    const updated = applyNewValue(changes, prevData, sheetOption, true);
    setCellChangesIndex(cellChangesIndex - 1);
    return updated;
  };
  const redoChanges = (
    changes: CellChange<SpreadSheetCellTypes>[],
    prevData: DataRow[],
    sheetOption: SpreadSheetProps["sheetOption"]
  ) => {
    const updated = applyNewValue(changes, prevData, sheetOption);
    setCellChangesIndex(cellChangesIndex + 1);
    return updated;
  };

  const handleChanges = (
    changes: CellChange<SpreadSheetCellTypes | SpreadsheetHeaderCell>[]
    // sheetOption: SpreadSheetProps['sheetOption'],
  ) => {
    // changes to header filter by 's_header'
    // else changes to data
    setDataColumnHeaderMap((prevHeader) =>
      applyChangesToHeader(
        changes.filter(
          (cell) => cell.type === "s_header"
        ) as CellChange<SpreadsheetHeaderCell>[],
        prevHeader
      )
    );
    /*
     */
    setCellStates((prevCellState) =>
      applyChangesToCellState(
        changes.filter(
          (cell) => cell.type !== "s_header"
        ) as CellChange<SpreadSheetCellTypes>[],
        prevCellState
      )
    );
    setData((prevData) =>
      applyChangesToData(
        changes.filter(
          (cell) => cell.type !== "s_header"
        ) as CellChange<SpreadSheetCellTypes>[],
        prevData,
        props.sheetOption
      )
    );
  };
  const handleUndoChanges = () => {
    console.log(cellChangesIndex, "undo changesindex");
    if (cellChangesIndex >= 0) {
      if (rowChanges[cellChangesIndex].changeType === "add") {
        undoAddRow()
      } else if (rowChanges[cellChangesIndex].changeType === "remove"){
        undoRemoveRow()
      } else if (rowChanges[cellChangesIndex].changeType === "duplicate"){
        undoAddRow() // same as add row
      }
      else{
        setData((prevData) =>
          undoChanges(cellChanges[cellChangesIndex], prevData, props.sheetOption)
        );
      }
    }
  };
  const handleRedoChanges = () => {
    console.log(
      cellChangesIndex,
      "redo changesindex <= cellcahngeslength",
      cellChanges.length
    );
    if (cellChangesIndex + 1 <= cellChanges.length - 1) {
      if (rowChanges[cellChangesIndex+1].changeType === "add") {
        redoAddRow()
      } else if (rowChanges[cellChangesIndex+1].changeType === "remove"){
        redoRemoveRow()
      } else if (rowChanges[cellChangesIndex+1].changeType === "duplicate"){
        redoAddRow() // same as add row
      }
      else{
      setData((prevData) =>
        redoChanges(
          cellChanges[cellChangesIndex + 1],
          prevData,
          props.sheetOption
        )
      );
        }
    }
  };
  const undoAddRow = () => {
    const rowId = rowChanges[cellChangesIndex].rowId;
    let newData = [...data];
    newData.splice(+rowId, 1);
    newData = newData.map((obj, i) => ({ ...obj, _idx: i }));
    setData(newData);
    setCellStates((prev) => {
      const newState = [...prev];
      newState.splice(+rowId, 1);
      let newCellState = newState.map((obj, i) => ({
        ...obj,
        _idx: i,
      })) as CellState[];
      return newCellState;
    });
    setCellChangesIndex(cellChangesIndex - 1);
  }
  const redoAddRow = () => {
    let newRow = rowChanges[cellChangesIndex+1].data
    let newData = [...data];
    if (rowChanges[cellChangesIndex+1].rowId !== data.length+1) {
      const rowId = rowChanges[cellChangesIndex+1].rowId;
      newRow._idx = +rowId ;
      newData.splice(+rowId, 0, newRow);
      newData = newData.map((obj, i) => ({ ...obj, _idx: i }));
      setData(newData);
      setCellStates((prev) => {
        const newState = [...prev];
        newState.splice(+rowId, 0, createCellState(newRow));
        let newCellState = newState.map((obj, i) => ({
          ...obj,
          _idx: i,
        })) as CellState[];
        return newCellState;
      });
      setValidationReport(getCellValidations(newData, props?.sheetOption));
    } else {
      setData([...data, newRow]);
      setCellStates((prev) => [...prev, createCellState(newRow)]);
      setValidationReport(getCellValidations([...data, newRow], props?.sheetOption));
    }
    setCellChangesIndex(cellChangesIndex + 1);
  }
  const undoRemoveRow = () => {
    let newRow = rowChanges[cellChangesIndex].prevData
    let newData = [...data];
    if (rowChanges[cellChangesIndex].rowId !== data.length+1) {
      const rowId = rowChanges[cellChangesIndex].rowId;
      newRow._idx = +rowId;
      newData.splice(+rowId , 0, newRow);
      newData = newData.map((obj, i) => ({ ...obj, _idx: i }));
      setData(newData);
      setCellStates((prev) => {
        const newState = [...prev];
        newState.splice(+rowId , 0, createCellState(newRow));
        let newCellState = newState.map((obj, i) => ({
          ...obj,
          _idx: i,
        })) as CellState[];
        return newCellState;
      });
      setValidationReport(getCellValidations(newData, props?.sheetOption));
    } else {
      setData([...data, newRow]);
      setCellStates((prev) => [...prev, createCellState(newRow)]);
      setValidationReport(getCellValidations([...data, newRow], props?.sheetOption));
    }
    setCellChangesIndex(cellChangesIndex - 1);
  }
  const redoRemoveRow = () => {
    const rowId = rowChanges[cellChangesIndex+1].rowId;
    let newData = [...data];
    newData.splice(+rowId, 1);
    newData = newData.map((obj, i) => ({ ...obj, _idx: i }));
    setData(newData);
    setCellStates((prev) => {
      const newState = [...prev];
      newState.splice(+rowId, 1);
      let newCellState = newState.map((obj, i) => ({
        ...obj,
        _idx: i,
      })) as CellState[];
      return newCellState;
    });
    setCellChangesIndex(cellChangesIndex + 1);
  }
  const rows = getRows(
    data,
    columns.map((c) => c.columnId as DataColumnId),
    cellStates
  );

  const handleColumnResize = (ci: Id, width: number) => {
    setColumns((prevColumn) => {
      const columnIndex = prevColumn.findIndex((el) => el.columnId === ci);
      const resizedColumn = prevColumn[columnIndex];
      const updatedColumn = { ...resizedColumn, width };
      prevColumn[columnIndex] = updatedColumn;
      return [...prevColumn];
    });
  };

  const handleColumnsReorder = (targetColumnId: Id, columnsId: Id[]) => {
    const to = columns.findIndex(
      (column) => column.columnId === targetColumnId
    );
    const columnIdxs = columnsId.map((columnId) =>
      columns.findIndex((c) => c.columnId === columnId)
    );
    setColumns((prevColumns) => reorderArray(prevColumns, columnIdxs, to));
  };

  const handleRowsReorder = (targetRowId: Id, rowIds: Id[]) => {
    const to = data.findIndex((row) => row._idx === targetRowId);
    const rowsIds = rowIds.map((id) =>
      data.findIndex((row) => row._idx === id)
    );
    setData((prevData) => reorderArray(prevData, rowsIds, to));
  };

  const handleCanReorderRows = (targetRowId: Id, rowIds: Id[]): boolean => {
    return targetRowId !== "header";
  };

  const handleFocusLocationChanging = (location: CellLocation): boolean => {
    console.log(location, "focus location changing");
    setFocusState(() => location);
    return true;
  };

  // Focus handler
  const [isFocus, setIsFocus] = useState(false);
  function handleClickOutside() {
    setIsFocus(false);
  }
  function handleClickInside() {
    setIsFocus(true);
  }
  const refFocus = useClickOutside(handleClickInside, handleClickOutside);


  // infinite scroll
  const infiniteScrollRef = useRef<HTMLDivElement>(null);
  const { isOnScreen, setIsOnScreen } = useOnScreen(infiniteScrollRef);
  const [forceFetch, setForceFetch] = useState(0);
  useEffect(() => {
    if (isOnScreen && props?.sheetOption?.scrollListener && data) {
      props?.sheetOption?.scrollListener()
    }
  }, [isOnScreen, forceFetch]);

  const getSelectedRowIds = (): Number[] => {
    const selectedRanges = refReactGrid.current?.state.selectedRanges;
    if (!selectedRanges || selectedRanges.length == 0) {
      return [];
    }
    let rowId = selectedRanges.map((el) => el.rows.map((row)=>row.rowId));
    return rowId.flat(Infinity).sort().reverse() as Number[] ;
  }
  const refReactGrid = useRef<ReactGrid>(null)
  return (
    <div
      onKeyDown={(e) => {
        const validateMap = props?.sheetOption?.validateMap || {};
        const calculateMap = props?.sheetOption?.calculateMap || {};
        // TODO: handle enterkey on cell.type=='text' still throwing error
        if (e.key === "ArrowDown") {
          const lastData = data.at(-1);
          if (lastData && focusState && lastData._idx === focusState.rowId) {
            const empty: DataRow = {
              _idx: lastData._idx + 1,
            };
            Object.keys(lastData)
              .slice(1)
              .forEach((key) => {
                empty[key] = "";
              });
            Object.keys(calculateMap).forEach((key) => {
              if (key in calculateMap) {
                empty[key] = calculateMap[key](empty, data, {
                  rowId: empty._idx as Id,
                  columnId: key,
                }).toString();
              }
            });
            empty.uuid=uuid()
            const newState = createCellState(empty);
            const newData: DataRow[] = [...data, empty];

            setCellStates((prev) => {
              return [...prev, newState];
            });
            setData((prev) => {
              return [...prev, empty];
            });

            const newValidation: Record<string, string[]> = Object.fromEntries(
              Object.entries(validateMap)
                .filter(([key, val]) => empty[key] !== undefined)
                .map(([key, val]) => {
                  const messages = val
                    .map((validate_) => {
                      return getValidationMessage(
                        validate_,
                        { rowId: empty._idx as Id, columnId: key },
                        newData
                      );
                    })
                    .filter((item) => item !== undefined) as string[];
                  return [key, messages];
                })
            );

            setValidationReport((prev) => ({
              ...prev,
              [empty._idx as Id]: newValidation,
            }));
            setCellChanges([
              ...cellChanges.slice(0, cellChangesIndex + 1),
              {} as CellChange<SpreadSheetCellTypes>[],
            ]);
            setCellChangesIndex(cellChangesIndex + 1);
            setRowChanges([...rowChanges.slice(0, cellChangesIndex + 1), {uuid: empty.uuid,
              rowId: empty._idx as number,
              data: empty,
              prevData: {},
              changeType: "add"}]);
          }
        }
        if (e.ctrlKey) {
          switch (e.key) {
            case "z":
              handleUndoChanges();
              break;
            case "y":
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
      style={props?.style && { ...props.style }}
      className={
        props?.className
          ? props.className + (isFocus ? "" : " unfocus")
          : isFocus
          ? ""
          : "unfocus"
      }
      ref={refFocus}
    >
      <ReactGrid
        rows={rows}
        columns={[...columns, ...actionColumns]}
        onColumnResized={handleColumnResize}
        onColumnsReordered={handleColumnsReorder}
        onRowsReordered={handleRowsReorder}
        enableColumnSelection
        enableRowSelection
        enableRangeSelection
        stickyTopRows={1}
        stickyLeftColumns={1}
        canReorderRows={handleCanReorderRows}
        onCellsChanged={handleChanges}
        enableFillHandle
        customCellTemplates={{
          s_header: new SpreadsheetHeaderTemplate(),
          s_creatable: new TextCreatableCellTemplate(),
          dropdown: new ModifiedDropdownCellTemplate(),
          button: new ButtonCellTemplate(),
        }}
        // set focusLocation from focusState
        // focusLocation={focusState}
        onFocusLocationChanging={handleFocusLocationChanging}
        ref={refReactGrid}
      />
      <div ref={infiniteScrollRef} style={{marginBottom:20}}></div>
    </div>
  );
});

export default SpreadSheet;
