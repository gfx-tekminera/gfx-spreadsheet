import React, { FC } from 'react';

import {
  Cell,
  CellTemplate,
  Compatible,
  Uncertain,
  getCellProperty,
} from '@silevis/reactgrid';

export type ButtonComponentProps = {
  text: string;
  onClick: (e: React.MouseEvent) => any;
}

export interface ButtonCell extends Cell {
  type: 'button';
  text: string;
  onClick?(e: React.MouseEvent): any;
  component?: React.FC<ButtonComponentProps>;
}

const DefaultButtonComponent: FC<ButtonComponentProps> = ({text, onClick}) => {
  return (
    <button onClick={onClick}>{text}</button>
  );
}

class ButtonCellTemplate implements CellTemplate {
  getCompatibleCell(uncertainCell: Uncertain<ButtonCell>): Compatible<ButtonCell> {
    const text = getCellProperty(uncertainCell, 'text', 'string');
    const value = parseFloat(text);
    
    let onClick: (...args: any[]) => any;
    try {
      onClick = getCellProperty(uncertainCell, 'onClick', 'function');
    } catch {
      onClick = () => null;
    }

    let component: React.FC<ButtonComponentProps>;
    try {
      component = getCellProperty(uncertainCell, 'component', 'function');
    } catch {
      component = null as any;
    }

    return { ...uncertainCell, text, value, onClick, component };
  }
  render(cell: Compatible<ButtonCell>, isInEditMode: boolean, onCellChanged: (cell: Compatible<ButtonCell>, commit: boolean) => void): React.ReactNode {
    const Button = cell?.component || DefaultButtonComponent;
    return (
      <Button
        text={cell.text}
        onClick={(e: React.MouseEvent) => cell?.onClick && cell.onClick(e)}
      />
    );
  }
}

export default ButtonCellTemplate;
