import React, {FC, useEffect, useRef, useState} from "react";
import { CellTemplate, OptionType, Cell, Compatible, Uncertain, getCellProperty, UncertainCompatible, keyCodes, isAlphaNumericKey, getCharFromKeyCode } from '@silevis/reactgrid';
import Creatable from 'react-select/creatable';
import { OptionProps, MenuListProps } from 'react-select';

export interface TextCreatableCell extends Cell {
  type: 's_creatable';
  selectedValue?: string;
  options?: OptionType[];
  isDisabled?: boolean;
  isOpen?: boolean;
  inputValue?: string;
  label?: string;
  text?: string;
}

class TextCreatableCellTemplate implements CellTemplate<TextCreatableCell> {
  getCompatibleCell(uncertainCell: Uncertain<TextCreatableCell>): Compatible<TextCreatableCell> {
    let selectedValue: string | undefined;
    try {
      selectedValue = getCellProperty(uncertainCell, 'selectedValue', 'string');
    } catch {
      selectedValue = undefined;
    }

    const options = getCellProperty(uncertainCell, 'options', 'object');
    const value = selectedValue ? parseFloat(selectedValue) : NaN;

    let isDisabled = true;
    try {
      isDisabled = getCellProperty(uncertainCell, 'isDisabled', 'boolean');
    } catch {
      isDisabled = false;
    }

    let inputValue : string | undefined;
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

    return {
      ...uncertainCell,
      selectedValue,
      options,
      value,
      isDisabled,
      inputValue,
      isOpen,
      text,
    };
  }

  update(cell: Compatible<TextCreatableCell>, cellToMerge: UncertainCompatible<TextCreatableCell>): Compatible<TextCreatableCell> {
    return this.getCompatibleCell({
      ...cell,
      isOpen: cellToMerge.isOpen,
      selectedValue: cellToMerge.selectedValue,
      options: cellToMerge.options,
      inputValue: cellToMerge.inputValue,
      text: cellToMerge.selectedValue,
    })
  }

  handleKeyDown(cell: Compatible<TextCreatableCell>, keyCode: number, ctrl: boolean, shift: boolean, alt: boolean): {cell: Compatible<TextCreatableCell>; enableEditMode: boolean;} {
    if ((keyCode === keyCodes.SPACE || keyCode === keyCodes.ENTER) && !shift) {
      return { cell: this.getCompatibleCell({...cell, isOpen: !cell.isOpen }), enableEditMode: false }
    }

    const char = getCharFromKeyCode(keyCode, shift);
    if (!ctrl && !alt && isAlphaNumericKey(keyCode)) {
      return { cell: this.getCompatibleCell({ ...cell, inputValue: shift ? char : char.toLowerCase(), isOpen: !cell.isOpen }), enableEditMode: false };
    }
    return { cell, enableEditMode: false };
  }

  render(cell: Compatible<TextCreatableCell>, isInEditMode: boolean, onCellChanged: (cell: Compatible<TextCreatableCell>, commit: boolean) => void): React.ReactNode {
    return (
      <CreatableInput 
        onCellChanged={ (cell) => onCellChanged(this.getCompatibleCell(cell), true) }
        cell={cell}
      />
    )
  }
}

interface CIProps {
  onCellChanged: (...args: any[] ) => void;
  cell: Record<string,any>;
}

const createOption = (value: string): OptionType => {
  return {
    label: value,
    value: value,
  }
}

const CreatableInput: FC<CIProps> = ({onCellChanged, cell}) => {
  const ref = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState<string|undefined>(cell.selectedValue)

  const handleInputValueChange = (newValue: string) => {
    setInputValue(newValue);
  }
  const handleValueChange = (newValue: OptionType) => {
    return onCellChanged({
      ...cell,
      selectedValue: newValue.value,
      isOpen: false,
      inputValue: undefined,
    })
  }
  const handleCreate = (value: string) => {
    const newOption = createOption(value);
    return onCellChanged({
      ...cell,
      selectedValue: value,
      isOpen: false,
      inputValue: undefined,
      options: [...cell.options, newOption],
    });
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      return onCellChanged({
        ...cell,
        isOpen: false,
      });
    }
    e.stopPropagation();
  }

  useEffect(() => {
    if (cell.isOpen && ref.current) {
      ref.current.focus();
      setInputValue(cell.inputValue);
    }
  }, [cell.isOpen, cell.inputValue]);

  return <div
    style={ {width: '100%'} }
    onPointerDown={() => {
      onCellChanged({...cell, isOpen: !cell.isOpen})
    }}
  >
    <Creatable
      {...(cell.inputValue && {
        inputValue,
        defaultInputValue: inputValue,
        onInputChange: handleInputValueChange,
      })}
      isSearchable={true}
      ref={ref}
      {...(cell.isOpen !== undefined && {menuIsOpen: cell.isOpen})}

      onMenuClose={() => {
        onCellChanged({ ...cell, isOpen: !cell.isOpen, inputValue: undefined })
      }}
      onMenuOpen={() => {
        onCellChanged({ ...cell, isOpen: true })
      }}
      onChange={handleValueChange}
      blurInputOnSelect={true}
      isDisabled={cell.isDisabled}
      options={cell.options}
      onKeyDown={handleKeyDown}
      components={{
        Option: CustomOption,
        MenuList: CustomMenuList,
      }}
      onCreateOption={handleCreate}
      defaultValue={cell.options.find((val: OptionType) => val.value === cell.selectedValue)}

      // isLoading={isLoading}
      value={cell.options.find((val: OptionType) => val.value === cell.selectedValue) || ''}
      classNamePrefix={'s'}
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
          color: 'inherit',
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
        menu: (provided: Record<any, any>) => ({
          ...provided,
          marginTop: '0px',
          marginBottom: '0px',
        }),
        menuList: (provided: Record<any, any>) => ({
          ...provided,
          paddingBottom: '0px',
          paddingTop: '0px',
        }),
      }}
    />
  </div>
}

const CustomOption: FC<OptionProps<OptionType, false>> = ({ innerProps, label, isSelected, isFocused, }) => {
  return <div
    {...innerProps}
    onPointerDown={e => e.stopPropagation()}
    onPointerUp={e => e.stopPropagation()}
    className={`s__option ${isSelected ? 's__option--is-selected' : ''} ${isFocused ? 's__option--is-focused' : ''}`}
    style={{
      cursor: 'default',
      display: 'block',
      width: '100%',
      WebkitUserSelect: 'none',
      MozUserSelect: 'none',
      msUserSelect: 'none',
      userSelect: 'none',
      WebkitTapHighlightColor: 'rgba(0, 0, 0, 0)',
      backgroundColor: isFocused ? '#2684FF' : 'inherit',
      color: isFocused ? 'hsl(0, 0%, 100%)' : 'inherit',
      padding: '8px 12px',
      boxSizing: 'border-box',
    }}
  >
    {label}
  </div>
};

const CustomMenuList: FC<MenuListProps> = ({children, innerProps, innerRef}) => {
  return <div
    onPointerDown={e => e.stopPropagation()}
    onPointerUp={e => e.stopPropagation()}
    {...innerProps}
    style={{
      overflow: 'scroll',
      maxHeight: '300px',
    }}
    ref={innerRef}
  >
    {children}
  </div>
};

export default TextCreatableCellTemplate;
