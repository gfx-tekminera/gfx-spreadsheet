/* eslint-disable testing-library/no-dom-import */
/* eslint-disable testing-library/no-node-access */
import React from 'react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import { queryHelpers, getByText } from '@testing-library/dom';

import Spreadsheet from './Spreadsheet';

export const queryAllCellByColIdx = queryHelpers.queryAllByAttribute.bind(null, 'data-cell-colidx');
export const queryAllCellByRowIdx = queryHelpers.queryAllByAttribute.bind(null, 'data-cell-rowidx');

const TEST_DATA: Record<string, any>[] = [
  { name: 'data-name1', age: 1, },
  { name: 'data-name2', age: 2, },
  { name: 'data-name3', age: 3, },
];

describe('Render data', () => {
  test("Render with default column type", () => {
    render(<Spreadsheet sheetData={TEST_DATA}/>);
    const spreadsheet = screen.getByTestId("spreadsheet")

    const columns: string[] = Object.keys(TEST_DATA[0]);
    Array.from(spreadsheet.getElementsByClassName("rg-cell rg-text-cell"))
    .filter(el => {
      const colIdx = Number(el.getAttribute('data-cell-colidx'));
      const rowIdx = Number(el.getAttribute('data-cell-rowidx'));
      return colIdx !== 0 && rowIdx !== 0
    })
    .forEach(el => {
      const colIdx = Number(el.getAttribute('data-cell-colidx'));
      const rowIdx = Number(el.getAttribute('data-cell-rowidx'));
      expect(el.innerHTML).toEqual(String(TEST_DATA[rowIdx-1][columns[colIdx-1]]))
    });
  });

  test('Render with assigning column type number', () => {
    render(<Spreadsheet
      sheetData={TEST_DATA}
      sheetOption={{
        columnType: {
          age: 'number',
        }
      }}
      />);
    const spreadsheet = screen.getByTestId("spreadsheet")

    const columns = Object.keys(TEST_DATA[0]);
    Array.from(spreadsheet.getElementsByClassName("rg-cell rg-text-cell"))
    .filter(el => {
      const colIdx = Number(el.getAttribute('data-cell-colidx'));
      const rowIdx = Number(el.getAttribute('data-cell-rowidx'));
      return colIdx !== 0 && rowIdx !== 0
    })
    .forEach(el => {
      const colIdx = Number(el.getAttribute('data-cell-colidx'));
      const rowIdx = Number(el.getAttribute('data-cell-rowidx'));
      expect(el.innerHTML).toEqual(String(TEST_DATA[rowIdx-1][columns[colIdx-1]]))
    });
  });
});
