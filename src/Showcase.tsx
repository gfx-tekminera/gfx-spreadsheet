import React, { useState, useRef, SetStateAction, Dispatch, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SketchPicker } from 'react-color';
import Select from 'react-select';
import { JSONTree } from 'react-json-tree';
import {DataRow, SpreadSheetProps, DataRowValue, CellLocation, ValidationReport} from './lib';
import { Spreadsheet } from './lib/components/Spreadsheet';

export const DATA = [
  { name: 'lele', age: 1, gender: 'm', title: '', booking: '', checkin: '', earlyCheckin: '', additional: '', },
  { name: 'yeye', age: 2, gender: 'f', title: '', booking: '', checkin: '', earlyCheckin: '', additional: '', },
  { name: 'hehe', age: 3, gender: 'm', title: '', booking: '', checkin: '', earlyCheckin: '', additional: '', },
];
export const COLUMNS = ['name', 'age', 'gender', 'title', 'booking', 'checkin', 'earlyCheckin', 'additional',];
const TITLE_REF: Record<string, string[]> = {
  'm': ['mr', 'sir',],
  'f': ['ms', 'mrs', 'ma\'am',],
};
export const OPTIONS: SpreadSheetProps['sheetOption'] = {
  includes: COLUMNS,
  columnType: {
    age: 'number',
    gender: 'dropdown',
    title: 'dropdown',
    booking: 'date',
    checkin: 'time',
    earlyCheckin: 'checkbox',
    additional: 's_creatable',
  },
  valuesMap: {
    gender: ['m', 'f',],
    title: ['mr', 'ms', 'mrs', 'sir', 'ma\'am',],
  },
  valuesFilter: {
    title: (option: DataRowValue, row: DataRow) => {
      if (!row['gender']) {
        return true;
      }
      return TITLE_REF[row['gender'].toString()].includes(option.toString());
    },
  },
  initialSheetStyle: [
    [':gender-title', {
      color: 'orange',
      background: 'green',
      paddingLeft: '0',
      // overflow: 'scroll', // will mess with 's_creatable' and 'dropdown' behavior
      // border: { left: { color: 'blue', width: '25px', }, top: { color: 'blue', width: '25px', }, bottom: { color: 'blue', width: '25px', }, right: { color: 'blue', width: '25px', }, }, // cellstyle border are broken since v4.0.4
    }],
  ],
  headerStyle: {
    color: 'violet',
    background: 'grey',
  },
  validateMap: {
    age: [
      { fn: () => true, message: 'test validation function', },
    ],
  },
  validationCellStyle: {
    color: 'orange',
    background: 'black',
  },
};

type SheetOptionControlProps = {
  sheetOption: SpreadSheetProps['sheetOption'];
  setSheetOption: Dispatch<SetStateAction<Partial<SpreadSheetProps['sheetOption']> | undefined>>;
}
const StylingControl: React.FC<SheetOptionControlProps> = ({
  sheetOption, setSheetOption,
}) => {
  const [sheetRange] = useState([
    { label: 'gender column', value: ':gender' },
    { label: 'title column', value: ':title' },
    { label: 'row 0', value: '1:' },
    { label: 'row 1', value: '2:' },
    { label: 'row 1-2', value: '2-3:' },
    { label: 'rowcol range', value: '0-3:gender' },
  ]);
  const [rangeChoice, setRangeChoice] = useState<string>();
  const [colorChoice, setColorChoice] = useState<string>();
  const [backgroundChoice, setBackgroundChoice] = useState<string>();

  useEffect(() => {
    setSheetOption((prev) => {
      if (!rangeChoice) {
        return prev;
      }
      const newSheetOption = Object.assign(
        {...prev},
        {
          initialSheetStyle: [
            [
              rangeChoice,
              {
                color: colorChoice || '#000000',
                background: backgroundChoice || '#FFFFFF',
              },
            ],
          ],
        },
      );

      return newSheetOption;
    });
  }, [rangeChoice, colorChoice, backgroundChoice]);

  return (
    <div>
      <h2>Set styling</h2>
      <div style={{ display: 'flex', gap: '2em' }}>
        <div>
          <h3>Header style</h3>
          <div>
            <p>Background color</p>
            <SketchPicker
              color={sheetOption?.headerStyle?.background}
              onChangeComplete={(color) => {
                setSheetOption((prev) => Object.assign(
                  {...sheetOption},
                  {
                    headerStyle: {
                      ...sheetOption?.headerStyle,
                      background: color.hex,
                    }
                  }
                ))
              }}
            />
            <p>Text color</p>
            <SketchPicker
              color={sheetOption?.headerStyle?.color}
              onChangeComplete={(color) => {
                setSheetOption((prev) => Object.assign(
                  {...sheetOption},
                  {
                    headerStyle: {
                      ...sheetOption?.headerStyle,
                      color: color.hex,
                    }
                  }
                ))
              }}
            />
          </div>
        </div>
        <div>
          <h3>Validation Cell style</h3>
          <div>
            <p>Background color</p>
            <SketchPicker
              color={sheetOption?.validationCellStyle?.background}
              onChangeComplete={(color) => {
                setSheetOption((prev) => Object.assign(
                  {...prev},
                  {
                    validationCellStyle: {
                      ...sheetOption?.validationCellStyle,
                      background: color.hex,
                    }
                  }
                ))
              }}
            />
            <p>Text color</p>
            <SketchPicker
              color={sheetOption?.validationCellStyle?.color}
              onChangeComplete={(color) => {
                setSheetOption((prev) => Object.assign(
                  {...prev},
                  {
                    validationCellStyle: {
                      ...sheetOption?.validationCellStyle,
                      color: color.hex,
                    }
                  }
                ))
              }}
            />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5em' }}>
          <div>
            <h3>Sheet style</h3>
            <p>Background color</p>
            <SketchPicker
              color={backgroundChoice}
              onChangeComplete={(color) => setBackgroundChoice(color.hex)}
            />
            <p>Text color</p>
            <SketchPicker
              color={colorChoice}
              onChangeComplete={(color) => setColorChoice(color.hex)}
            />
          </div>
          <div>
            <p>Select range</p>
            <Select
              options={sheetRange}
              onChange={(newVal) => {
                if (newVal) {
                  setRangeChoice(newVal.value);
                }
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

const ValidationControl: React.FC<SheetOptionControlProps> = ({
  sheetOption, setSheetOption,
}) => {
  const markAge = () => {
    setSheetOption((prev) => Object.assign({...prev}, {
      validateMap: {
        age: [
          {
            fn: (location: CellLocation, data: DataRow[]) => {
              const rowId = Number(location.rowId);
              const colId = location.columnId;
              return Number(data[rowId][colId]) > 2;
            },
            message: 'Age more than 2',
          }
        ],
      },
    }));
  }
  const markLele = () => {
    setSheetOption((prev) => Object.assign({...prev}, {
      validateMap: {
        name: [
          {
            fn: (location: CellLocation, data: DataRow[]) => {
              const rowId = Number(location.rowId);
              const colId = location.columnId;
              return String(data[rowId][colId]) === 'lele';
            },
            message: 'Name equal to lele',
          },
        ],
      },
    }));
  }
  const markAgeMoreThanAbove = () => {
    setSheetOption((prev) => Object.assign({...prev}, {
      validateMap: {
        age: [
          {
            fn: (location: CellLocation, data: DataRow[]) => {
              const rowId = Number(location.rowId);
              const colId = location.columnId;
              const prevRowId = rowId > 0 ? rowId - 1 : 0;
              return rowId !== prevRowId &&
                Number(data[rowId][colId]) > Number(data[prevRowId][colId]);
            },
            message: 'Current row age > row above age',
          },
        ],
      },
    }));
  }
  return (
    <div>
      <h3>Set validation</h3>
      <button onClick={() => markAge()}>Mark where <b>age &#62; 2</b></button>
      <button onClick={() => markLele()}>Mark where <b>name = "lele"</b></button>
      <button onClick={() => markAgeMoreThanAbove()}>Mark where <b>current row age &#60; age on row above</b></button>
    </div>
  );
}

// columnSize
// headersLabel
// includes
const GeneralSheetControl: React.FC<SheetOptionControlProps> = ({
  sheetOption, setSheetOption,
}) => {
  const [includesToggle, setIncludesToggle] = useState<Record<string, boolean>>(Object.fromEntries(COLUMNS.map((key) => [key, true])));
  const [columnLength, setColumnLength] = useState<number>(100);
  const [headerLabel, setHeaderLabel] = useState<Record<string, string>>(Object.fromEntries(COLUMNS.map((item) => [item, item])));
  const updateIncludesToggle = (key: string, newVal: boolean) => {
    setIncludesToggle((prev) => {
      return {
        ...prev,
        [key]: newVal,
      }
    });
  }

  const updateHeaderLabel = (key: string, newVal: string) => {
    setHeaderLabel((prev) => {
      return {
        ...prev,
        [key]: newVal,
      };
    });
  }

  const includesList = Object.entries(includesToggle)
    .filter(([key, val]) => val === true).map(([key, val]) => key);

  const newIncludes = () => {
    let includes_: string[] = COLUMNS;
    includes_ = includes_.filter(item => includesList.includes(item))
    return includes_;
  }
  const updateSheetOption = () => {
    setSheetOption({
      ...sheetOption,
      includes: newIncludes(),
      columnSize: [columnLength],
      headersLabel: headerLabel,
    });
  }

  useEffect(() => {
    updateSheetOption();
  }, [includesToggle, columnLength, headerLabel]);

  return (
    <div>
      <div style={{ marginBottom: '0.5em' }}>
        <label htmlFor="number1011">First column length</label>
        <input
          id="number1011"
          type="number"
          value={columnLength}
          onChange={e => setColumnLength(Number(e.target.value))}
        />
      </div>
      <div style={{ marginBottom: '0.5em' }}>
        <h5>Header label</h5>
        {
          Object.entries(headerLabel)
            .map(([key, value]) => {
              return <div key={key}>
                <label htmlFor={key+"1012"}> {key} </label>
                <input
                  id={key+"1012"}
                  type="text"
                  value={value}
                  onChange={e => updateHeaderLabel(key, e.target.value)}
                />
              </div>
            })
        }
      </div>
      <div style={{ marginBottom: '0.5em' }}>
        <h5>Include/hide column</h5>
        {
          Object.entries(includesToggle)
          .map(([key, val]) => {
            return (
              <div key={key}>
                <input
                  type="checkbox"
                  checked={val}
                  onClick={() => updateIncludesToggle(key, !val)}
                  onChange={() => undefined}
                  id={key+'1010'}
                />
                <label htmlFor={key+'1010'}>{key}</label>
              </div>
            );
          })
        }
        <div>{includesList.join(', ')}</div>
      </div>
    </div>
  );
}

export const Showcase = () => {
  const navigate = useNavigate();
  const ref = useRef(null);
  const [showcase, setShowcase] = useState<Record<string, boolean>>({
    general: true,
    styling: true,
    validation: true,
  });
  const [sheetOption, setSheetOption] = useState<SpreadSheetProps['sheetOption']>(OPTIONS);
  const [validationReport, setValidationReport] = useState<ValidationReport>();
  const getSheetValidation = () => {
    if (ref.current) {
      return (ref.current as any).getValidationReport() as ValidationReport;
    }
    return {};
  }
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        overflow: 'auto',
        flexDirection: 'column',
        height: '100vh',
      }}
    >
      <h1>Showcase</h1>
      <h3>v0.1.4-rc.2</h3>
      <button
        onClick={() => navigate('/')}
      >To Home</button>
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          gap: '0.5em',
          overflow: 'auto',
        }}
      >
        <div
          style={{
            width: '50%',
            padding: '2em 0',
            border: '1px solid black',
            overflow: 'scroll',
          }}
        >
          <Spreadsheet
            ref={ref}
            sheetData={DATA}
            sheetOption={sheetOption}
          />
        </div>
        <div
          style={{
            width: '50%',
            padding: '2em 0',
            border: '1px solid black',
            overflow: 'scroll',
          }}
        >
          <div style={{ marginBottom: '0.5em' }}>
            {
              Object.entries(showcase)
              .map(([key, val]) => {
                return <span key={key}>
                  <input
                    type='checkbox'
                    checked={val}
                    onChange={() => undefined}
                    onClick={() => {
                      setShowcase((prev) => Object.assign({...prev}, { [key]: !val }));
                    }}
                    id={key+"1"}
                  />
                  <label htmlFor={key+"1"}> {key.toUpperCase()} </label>
                </span>
              })
            }
          </div>
          {showcase.general &&
          <GeneralSheetControl
            sheetOption={sheetOption}
            setSheetOption={setSheetOption}
          />}
          {showcase.styling &&
          <StylingControl
            sheetOption={sheetOption}
            setSheetOption={setSheetOption}
          />}
          {showcase.validation &&
            <>
              <ValidationControl
                sheetOption={sheetOption}
                setSheetOption={setSheetOption}
              />
              <div>
                <button onClick={() => setValidationReport(getSheetValidation())}>Reload validation report</button>
                <JSONTree data={validationReport} />
              </div>
            </>}
        </div>
      </div>
    </div>
  );
};
