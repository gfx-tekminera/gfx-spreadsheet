import React from 'react';
import {Cell, CellStyle, CellTemplate, Compatible, getCellProperty, isAlphaNumericKey, isNavigationKey, keyCodes, Uncertain, UncertainCompatible} from '@silevis/reactgrid';

// import './header-cell-style.css';

export interface SpreadsheetHeaderCell extends Cell {
  type: 's_header';
  text?: string;
  dataKey: string;
}

class SpreadsheetHeaderTemplate implements CellTemplate {
  _getText(uncertainCell: Uncertain<SpreadsheetHeaderCell>): string {
    return getCellProperty(uncertainCell, 'text', 'string') ||
      getCellProperty(uncertainCell, 'dataKey', 'string');
  }

  getCompatibleCell(uncertainCell: Uncertain<SpreadsheetHeaderCell>): Compatible<SpreadsheetHeaderCell> {
    const text = this._getText(uncertainCell);
    const dataKey = getCellProperty(uncertainCell, 'dataKey', 'string');
    const value = parseFloat(text);
    return { ...uncertainCell, text, dataKey, value };
  }

  isFocusable(cell: Compatible<SpreadsheetHeaderCell>): boolean {
    return true;
  }

  render(cell: Compatible<SpreadsheetHeaderCell>, isInEditMode: boolean, onCellChanged: (cell: Compatible<SpreadsheetHeaderCell>, commit: boolean) => void): React.ReactNode {
    if (!isInEditMode) {
      return (
        <div
          style={{
            overflow: 'hidden',
          }}
        >
          {cell.text}
        </div>
      )
    }

    return (
      <input
        ref={input => {
          input && input.focus();
        }}
        defaultValue={cell.text}
        onChange={(e) => onCellChanged(
          this.getCompatibleCell({...cell, text: e.currentTarget.value}),
          false,
        )}
        onCopy={e => e.stopPropagation()}
        onCut={e => e.stopPropagation()}
        onPaste={e => e.stopPropagation()}
        onPointerDown={e => e.stopPropagation()}
        onKeyDown={(e) => {
          if (isAlphaNumericKey(e.keyCode) || isNavigationKey(e.keyCode)) {
            e.stopPropagation();
          }
        }}
      />
    )
  }

  getClassName(cell: Compatible<SpreadsheetHeaderCell>, isInEditMode: boolean): string {
    return cell.className ? cell.className : '';
  }

  getStyle(cell: Compatible<SpreadsheetHeaderCell>, isInEditMode: boolean): CellStyle {
    return { background: 'rgba(158, 128, 128, 0.1)', }
  }

  // double click on cell to edit text
  handleKeyDown(
    cell: Compatible<SpreadsheetHeaderCell>,
    keyCode: number,
    ctrl: boolean,
    shift: boolean,
    alt: boolean,
  ): {cell: Compatible<SpreadsheetHeaderCell>; enableEditMode: boolean;} {
    if ( !ctrl && !alt && keyCode === keyCodes.POINTER ) {
      return { cell, enableEditMode: false, };
    }
    return {
      cell,
      enableEditMode: keyCode === keyCodes.ENTER || keyCode === keyCodes.POINTER,
    }
  }

  // called before onCellChanged callback called
  update(
    cell: Compatible<SpreadsheetHeaderCell>,
    cellToMerge: UncertainCompatible<SpreadsheetHeaderCell>
  ): Compatible<SpreadsheetHeaderCell> {
    return this.getCompatibleCell({
      ...cell, text: cellToMerge.text,
    })
  }
}

export default SpreadsheetHeaderTemplate;
