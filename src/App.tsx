import React, { useState } from 'react';
import { Spreadsheet } from './lib/components/Spreadsheet';
import './styles.css';

function App() {
  const [ titleRef ] = useState<Record<string, string[]>>({
    'm': ['mr', 'sir',],
    'f': ['ms', 'mrs', 'ma\'am',],
  });
  return (
    <div>
      <Spreadsheet
        sheetData={[
          { name: 'lele', age: 1, gender: 'm', title: '', },
          { name: 'yeye', age: 2, gender: 'f', title: '', },
          { name: 'hehe', age: 3, gender: 'm', title: '', },
        ]}
        sheetOption={{
          includes: ['name', 'age', 'gender', 'title',],
          columnType: {
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
              console.log(row);
              return titleRef[row['gender'].toString()].includes(option.toString());
            },
          },
        }}
      />
    </div>
  );
}

export default App;
