import React, { useEffect } from 'react';

import {
  Compatible,
  DropdownCellTemplate,
  DropdownCell,
  OptionType,
  Uncertain,
  getCellProperty,
} from '@silevis/reactgrid';

import Select, { OptionProps, MenuProps, SingleValueProps, components } from 'react-select';
import { FC } from 'react';

export type ModifiedDropdownOptionProps = OptionProps<OptionType, false>;
export type ModifiedSingleValueProps = SingleValueProps<OptionType, false>;
export type ModifiedDropdownCell = {
  componentOption?: React.FC<ModifiedDropdownOptionProps>
  componentSingleValue?: React.FC<ModifiedSingleValueProps>
} & DropdownCell;

export class ModifiedDropdownCellTemplate extends DropdownCellTemplate {
  getCompatibleCell(uncertainCell: Uncertain<ModifiedDropdownCell>): Compatible<ModifiedDropdownCell> {
    let selectedValue: string | undefined;
    try {
      selectedValue = getCellProperty(uncertainCell,  'selectedValue', 'string');
    } catch {
      selectedValue = undefined;
    }
    const values = getCellProperty(uncertainCell, 'values', 'object');
    const value = selectedValue ? parseFloat(selectedValue) : NaN;
    let isDisabled = true;
    try {
      isDisabled = getCellProperty(uncertainCell, 'isDisabled', 'boolean');
    } catch {
      isDisabled = false;
    }
    let inputValue: string | undefined;
    try {
      inputValue = getCellProperty(uncertainCell, 'inputValue', 'string');
    } catch {
      inputValue = undefined;
    }
    let isOpen: boolean;
    try {
      isOpen = getCellProperty(uncertainCell, 'isOpen', 'boolean');
    } catch {
      isOpen = false;
    }
    const text = selectedValue || '';

    let componentOption: ModifiedDropdownCell['componentOption'];
    try {
      componentOption = getCellProperty(uncertainCell, 'componentOption', 'function');
    } catch {
      componentOption = undefined;
    }

    return {
      ...uncertainCell,
      selectedValue, values, value, isDisabled, inputValue, isOpen, text,
      componentOption,
    };
  }
  render(
    cell: Compatible<ModifiedDropdownCell>,
    isInEditMode: boolean,
    onCellChanged: (cell: Compatible<ModifiedDropdownCell>, commit: boolean) => void
  ): React.ReactNode {
    return (
      <DropdownInput
        onCellChanged={(cell) => onCellChanged(this.getCompatibleCell(cell), true)}
        cell={cell}
      />
    );
  }
}

interface DIProps{
  onCellChanged: (...args: any[] ) => void;
  cell: Record<string,any>;
}

const DropdownInput: FC<DIProps> = ({onCellChanged, cell}) => {
  const selectRef = React.useRef<any>(null);
  const [inputValue, setInputValue] = React.useState<string | undefined>('');

  const handleInputValueChange = (newValue: string) => {
    setInputValue(newValue);
  }

  const handleValueChange = (newValue: OptionType) => {
    onCellChanged({
      ...cell,
      selectedValue: newValue.value,
      isOpen: false,
      inputValue: undefined,
    });
  }

  const assignValue = () => {
    const value = cell.values.find((val: any) => val.value === cell.selectedValue) || null
    return value;
  }

  useEffect(() => {
    if (cell.isOpen && selectRef.current) {
      selectRef.current.focus();
      setInputValue(cell.inputValue);
    }
  }, [cell.isOpen, cell.inputValue]);

  return <div
    style={{ width: '100%' }}
    onPointerDown={e => onCellChanged({ ...cell, isOpen: true })}
  >
    <Select
      {...(cell.inputValue && {
        inputValue,
        defaultInputValue: inputValue,
        onInputChange: handleInputValueChange,
      })}
      // isSearchable={true}
      ref={selectRef}
      {...(cell.isOpen !== undefined && { menuIsOpen: cell.isOpen })}
      onMenuClose={() => onCellChanged({ ...cell, isOpen: !cell.isOpen, inputValue: undefined })}
      onMenuOpen={() => onCellChanged({ ...cell, isOpen: true })}
      onChange={handleValueChange}
      blurInputOnSelect={true}
      defaultValue={cell.values.find((val: any) => val.value === cell.selectedValue)}
      value={assignValue()}
      isDisabled={cell.isDisabled}
      options={cell.values}
      onKeyDown={(e: KeyboardEvent) => e.stopPropagation()}
      components={{
        Option: cell?.componentOption || CustomOption,
        Menu: CustomMenu,
        SingleValue: cell?.componentSingleValue || components.SingleValue,
      }}
      styles={{
        container: (provided: Record<any, any>) => ({
          ...provided,
          width: '100%',
          height: '100%',
        }),
        control: (provided: Record<any, any>) => ({
          ...provided,
          border: 'none',
          borderColor: 'transparent',
          minHeight: '25px',
          background: 'transparent',
          boxShadow: 'none',
        }),
        indicatorsContainer: (provided: Record<any, any>) => ({
          ...provided,
          paddingTop: '0px',
        }),
        dropdownIndicator: (provided: Record<any, any>) => ({
          ...provided,
          padding: '0px 4px',
        }),
        singleValue: (provided: Record<any, any>) => ({
          ...provided,
          color: 'inherit'
        }),
        indicatorSeparator: (provided: Record<any, any>) => ({
          ...provided,
          marginTop: '4px',
          marginBottom: '4px',
        }),
        input: (provided: Record<any, any>) => ({
          ...provided,
          padding: 0,
        }),
        valueContainer: (provided: Record<any, any>) => ({
          ...provided,
          padding: '0 8px',
        }),
      }}
    />
  </div >
}

const CustomOption: React.FC<OptionProps<OptionType, false>> = ({ innerProps, label, isSelected, isFocused }) => (
  <div
    {...innerProps}
    onPointerDown={e => e.stopPropagation()}
    className={`rg-dropdown-option${isSelected ? ' selected' : ''}${isFocused ? ' focused' : ''}`}
  >
    {label}
  </div>
);

const CustomMenu: React.FC<MenuProps<OptionType, false>> = ({ innerProps, children }) => (
  <div {...innerProps} className='rg-dropdown-menu'>{children}</div>
);
