import { ReactComponent as FilterIcon } from "./filter.svg";
import { HeaderIconComponentProps } from "../lib/components/Spreadsheet/templates";

export const FilterIconComponent: React.FC<HeaderIconComponentProps> = ({
  onClick,
}) => {
  return (
    <div>
      <FilterIcon onClick={onClick} style={{ cursor: "pointer" }} />
    </div>
  );
};
