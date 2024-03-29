import React from "react";
import {
  Cell,
  CellStyle,
  CellTemplate,
  Compatible,
  getCellProperty,
  isAlphaNumericKey,
  isNavigationKey,
  keyCodes,
  Uncertain,
  UncertainCompatible,
} from "@silevis/reactgrid";
import TooltipText from "../../../TooltipText/TooltipText";
// import './header-cell-style.css';
export type HeaderIconComponentProps = {
  onClick: (e: React.MouseEvent) => any;
};

export interface SpreadsheetHeaderCell extends Cell {
  type: "s_header";
  text?: string;
  dataKey: string;
  icon: React.FC;
  headerTooltipText: string;
  headerTooltipStyle: React.CSSProperties;
}

class SpreadsheetHeaderTemplate implements CellTemplate {
  _getText(uncertainCell: Uncertain<SpreadsheetHeaderCell>): string {
    return (
      getCellProperty(uncertainCell, "text", "string") ||
      getCellProperty(uncertainCell, "dataKey", "string")
    );
  }

  getCompatibleCell(
    uncertainCell: Uncertain<SpreadsheetHeaderCell>
  ): Compatible<SpreadsheetHeaderCell> {
    const text = this._getText(uncertainCell);
    const dataKey = getCellProperty(uncertainCell, "dataKey", "string");
    const icon = getCellProperty(uncertainCell, "icon", "function");
    const value = parseFloat(text);
    const headerTooltipText = getCellProperty(uncertainCell, "headerTooltipText", "string");
    const headerTooltipStyle = getCellProperty(uncertainCell, "headerTooltipStyle", "object");
    return { ...uncertainCell, text, icon, dataKey, value, headerTooltipText, headerTooltipStyle };
  }

  isFocusable(cell: Compatible<SpreadsheetHeaderCell>): boolean {
    return true;
  }

  render(
    cell: Compatible<SpreadsheetHeaderCell>,
    isInEditMode: boolean,
    onCellChanged: (
      cell: Compatible<SpreadsheetHeaderCell>,
      commit: boolean
    ) => void
  ): React.ReactNode {
    if (!isInEditMode) {
      const headerCell = (
        <div className="header-container" style={{ display: "flex", justifyContent: "space-between", width:"100%", alignItems: 'center' }}>
          <div
            style={{
              flexGrow:1,
              overflow: "hidden",
            }}
          >
            {cell.text}
          </div>
          {/* passing props for onclick header icon */}
          {cell.icon(cell.text)}
        </div>
      )
      return (
        <TooltipText text={cell.headerTooltipText} style={cell.headerTooltipStyle}>
          {headerCell}
        </TooltipText>
      );
    }

    return (
      <input
        ref={(input) => {
          input && input.focus();
        }}
        defaultValue={cell.text}
        onChange={(e) =>
          onCellChanged(
            this.getCompatibleCell({ ...cell, text: e.currentTarget.value }),
            false
          )
        }
        onCopy={(e) => e.stopPropagation()}
        onCut={(e) => e.stopPropagation()}
        onPaste={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (isAlphaNumericKey(e.keyCode) || isNavigationKey(e.keyCode)) {
            e.stopPropagation();
          }
        }}
      />
    );
  }

  getClassName(
    cell: Compatible<SpreadsheetHeaderCell>,
    isInEditMode: boolean
  ): string {
    return cell.className ? cell.className : "";
  }

  getStyle(
    cell: Compatible<SpreadsheetHeaderCell>,
    isInEditMode: boolean
  ): CellStyle {
    return { background: "rgba(158, 128, 128, 0.1)" };
  }

  // double click on cell to edit text
  handleKeyDown(
    cell: Compatible<SpreadsheetHeaderCell>,
    keyCode: number,
    ctrl: boolean,
    shift: boolean,
    alt: boolean
  ): { cell: Compatible<SpreadsheetHeaderCell>; enableEditMode: boolean } {
    if (!ctrl && !alt && keyCode === keyCodes.POINTER) {
      return { cell, enableEditMode: false };
    }
    return {
      cell,
      enableEditMode:
        keyCode === keyCodes.ENTER || keyCode === keyCodes.POINTER,
    };
  }

  // called before onCellChanged callback called
  update(
    cell: Compatible<SpreadsheetHeaderCell>,
    cellToMerge: UncertainCompatible<SpreadsheetHeaderCell>
  ): Compatible<SpreadsheetHeaderCell> {
    return this.getCompatibleCell({
      ...cell,
      text: cellToMerge.text,
    });
  }
}

export default SpreadsheetHeaderTemplate;
