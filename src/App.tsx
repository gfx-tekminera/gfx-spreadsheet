import React, { useState, useRef } from 'react';
import { Spreadsheet } from './lib/components/Spreadsheet';

export const DATA = [
  { name: 'lele', age: 1, gender: 'm', title: '', },
  { name: 'yeye', age: 2, gender: 'f', title: '', },
  { name: 'hehe', age: 3, gender: 'm', title: '', },
];
export const COLUMNS = ['name', 'age', 'gender', 'title',];

function App() {
  const ref = useRef<any>();
  const [ titleRef ] = useState<Record<string, string[]>>({
    'm': ['mr', 'sir',],
    'f': ['ms', 'mrs', 'ma\'am',],
  });
  return (
    <div>
      <Spreadsheet
        className={'spreadsheet-style'}
        style={{
          fontFamily: 'monospace',
          fontWeight: 'bolder',
          color: 'greenyellow',
          backgroundColor: 'beige',
        }}
        ref={ref}
        sheetData={DATA}
        sheetOption={{
          includes: COLUMNS,
          columnType: {
            age: 'number',
            gender: 'dropdown',
            title: 'dropdown',
          },
          valuesMap: {
            gender: ['m', 'f',],
            title: ['mr', 'ms', 'mrs', 'sir', 'ma\'am',],
          },
          valuesFilter: {
            title: (option, row) => {
              if (!row['gender']) {
                return true;
              }
              return titleRef[row['gender'].toString()].includes(option.toString());
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
              { fn: () => true, message: 'test', },
            ],
          },
          validationCellStyle: {
            color: 'orange',
            background: 'black',
          },
        }}
      />
      <div>
        <button
          onClick={() => {
            ref &&
              ref.current &&
              console.log(ref.current.getStyleState(), 'getstylestate');
          }}
        >StyleState</button>
        <button
          onClick={() => {
            ref &&
              ref.current &&
              ref.current.setFocusState(undefined);
          }}
        >Remove Focus</button>
      </div>
    </div>
  );
}

export default App;
