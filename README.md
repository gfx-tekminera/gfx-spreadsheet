# Gfx Spreadsheet Component

React datagrid that is more focused on data.
Made from extending [ReactGrid](https://reactgrid.com/) to render dynamic cell properties based on input properties.

## Usage
```ts
const View = () => {
  const sheetRef = useRef(null);
  const data = [
    { name: 'lele', check: false, gender: 'male', },
    { name: 'yeye', check: false, gender: 'female', },
  ]
  const option = {
    includes: [ 'name', 'gender', ],
    columnType: { gender: 'dropdown', },
    valuesMap: { gender: ['male', 'female', ], },
  }

  const getSheetData = () => {
    ref.current && ref.current.getData();
  }
  return (
  <Spreadsheet
    ref={sheetRef}
    sheetData={data}
    sheetOption={option}
  />
  )
}
```

## Properties
Typings for props used by `Spreadsheet`
```ts
export type SpreadSheetProps = {
  sheetData?: DataRow[];
  sheetOption?: {
    // cell type columnType[key] for DataRow[key]
    columnType?: SpreadSheetColumnOption;
    // list of enum values for DataRow[key]
    valuesMap?: Record<keyof DataRow, any[]>;
    // if provided, only show column included in list
    includes?: (keyof DataRow)[];
    // column size started from first non 'header' column
    columnSize?: number[];
    // additional column, each component will be rendered as button cell
    rowActions?: Record<string, RowAction>,

    // custom option component for 'dropdown'
    // map column key to custom option that will be rendered
    customOption?: Record<keyof DataRow, React.FC<any>>;

    // custom value component for 'dropdown'
    // map custom key to value component that will be rendered
    customSingleValue?: Record<keyof DataRow, React.FC<any>>;

    // custom header label
    headersLabel?: Record<keyof DataRow, string>;

    // Intl format options
    // for 'date' cell type
    dateFormatOptions?: Intl.DateTimeFormatOptions;
    // for 'time' cell type
    timeFormatOptions?: Intl.DateTimeFormatOptions;
    sheetLocale?: string;

    // map column name to be readOnly
    readOnly?: Record<keyof DataRow, boolean>;
    // dynamically set readonly column with callback
    calculateMap?: Record<keyof DataRow, (row: DataRow) => DataRowValue>;

    // dynamically set validation function and error function
    validateMap?: Record<keyof DataRow, CompositeCellValidation[]>;

    // map column to function (optionItem, row) => callback
    // function will be used as callback in Array(valuesMap[dataKey]).filter(callback)
    valuesFilter?: Record<keyof DataRow, ValuesFilter>;
  };
};
```

- `sheetData`
  `sheetData` are array of object. We use typings `DataRow[]`.  
  `_idx` are reserved for row index and generated automatically on Spreadsheet render  
  Each key, excluding `_idx`, in DataRow will be used as column name and are assumed uniform in each row.  
  ```ts
  type DataRow = {
    [key: string]: string|boolean|number|Date|null
  } & {_idx?: number};
  ```

- `sheetOption`
  As default `sheetData` will be rendered as text cell with stringified value.
  Controlling spreadsheet are mostly assigning properties related to key values in `DataRow`
  - `columnType`, mapping column name to cell types
    Cell types from ReactGrid: `'header', 'text', 'number', 'date', 'time', 'checkbox', 'dropdown'`  
    Extended cell types: `'s_header', 's_creatable'`  
    - 's_header', kinda "read-only" cell, edit mode enabled with extra steps
    - 's_creatable', based on 'dropdown', using [ReactSelect Creatable](https://react-select.com/creatable) to provide adding new option.
      For this column type, new value added in one cell will be provided on others.
    ```ts
    const columnType = {
      // columnName: 'columnType',
      name: 'text',
      age: 'number',
      gender: 'dropdown',
    };
    ```

  - `valuesMap`, list of options value for cell type `dropdown` and `s_creatable`.
    ```ts
    const columnType = {
      gender: ['male', 'female', 'apache helicopter', ],
    };
    ```

  - `includes`, list of rendered column, use case for changing certain column value
    ```ts
    const includes = ['name', 'gender', ];
    ```

  - `columnSize`, assigning column width started from first non header column.
    Length of `columnSize` doesn't have to match with rendered column counts.
    ```ts
    const columnSize = [300, 70];
    ```

  - `rowActions`, mapping of action that will be executed exclusively on row
    ```tsx
    export type ButtonComponentProps = {
      text: string;
      onClick: (e: React.MouseEvent) => any;
    }
    type ButtonAction = (e: React.MouseEvent, row: DataRow) => any;
    type RowAction = {
      text: string;
      action?: ButtonAction;
      component?: React.FC<ButtonComponentProps>;
    }
    ```
    currently, ButtonAction are non-mutating method. example for this use case are navigation button, where delete row or other method that change spreadsheet state are not developed yet.
    Example
    ```tsx
    <Spreadsheet
      ref={ref}
      sheetData={data}
      sheetOption={{
        rowActions: {
          goto: {
            text: 'Goto',
            action: (e, row) => gotoPage(row.id),
          },
        }
      }}
    />
    ```

  - `headersLabel`, mapping of custom column header label
    ```ts
    const headersLabel = {
      gender: 'Person Gender',
    }
    ```

  - `readOnly`, mapping of read-only column
    ```ts
    const readOnly = {
      gender: true,
    }
    ```

  - for `date` and `time` cell type in the spreadsheet, general formating using `Intl`
    pass `dateFormatOptions`, `timeFormatOptions`, and `sheetLocale` to `sheetOption`
    ```ts
    const dateFormatOptions = {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    };
    const timeFormatOptions = {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      };
    const sheetLocale = 'en-ID';
    ```

  - `calculateMap`, where column are set as read-only,
    callback function can be set to dynamically set cell value
    ```ts
    const calculateMap = {
      distance: (row) => {
        return Number(row.endPoint) - Number(row.startPoint);
      },
    }
    ```

  - `validateMap`, mapping of each column to validation functions
    validations functions are list of object.
    each object has callback where `message` are sent back `fn` returns `true`
    ```ts
    const validateMap = {
      distance: [
        {
          fn: (location, data) => data[Number(location.rowId)][location.columnId] === undefined,
          message: 'Cannot be null',
        },
      ]
    }
    ```

  - `valuesFilter`, mapping column to function with `optionItem` and `row` as parameters returning boolean value
    `optionItem` are item of `valuesMap[columnId]`
    each function can be used as callback to filter valuesMap based on current row value
    implemented as example `Array.from(valuesMap[columnId]).filter(valuesFilter[columnId])`
    ```ts
    const titleReference = {
      "mr": {
        gender: 'male',
      },
      "sir": {
        gender: 'male',
      },
      "mrs": {
        gender: 'female',
      },
      "ms": {
        gender: 'female',
      },
      "madam": {
        gender: 'female',
      },
    };

    const valuesMap = {
      gender: ['male', 'female', 'apache helicopter', ],
      title: Object.keys(titleReference),
    };

    const valuesFilter = {
      title: (optionItem, row) => {
        if (!row[gender]) {
          return true;
        }
        return titleReference[optionItem].gender === row['gender'];
      },
    }
    ```


## Accessing spreadsheet state
If reference is provided, spreadsheet state can be accessed with these exposed methods.
- `ref.current.getData()`
  returns current spreadsheet values in cell types.
- `ref.current.getSheetOption()`
  returns current spreadsheet options `sheetOption`.
- `ref.current.getColumns()`
  returns list of spreadsheet column properties
- `ref.current.getHeaderMap()`
  returns list of current spreadsheet header labels
- `ref.current.getRows()`
  returns rendered spreadsheet entity (?)
- `ref.current.getValuesMap()`
  returns `sheetOption.valuesMap` shorter of `getSheetOption().valuesMap`.
- `ref.current.getColumnSize()`
  returns `sheetOption.columnSize` shorter of `getSheetOption().columnSize`.


## Dependencies
```json
  "react": "18.2.0",
  "react-select": "5.7.0",
  "@silevis/reactgrid": "4.0.4",
```
