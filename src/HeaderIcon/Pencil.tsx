import React from "react";
import { ReactComponent as PencilIcon } from "./pencil.svg";
import { HeaderIconComponentProps } from "../lib/components/Spreadsheet/templates";

export const PencilIconComponent: React.FC<HeaderIconComponentProps> = ({
  onClick,
}) => {
  return (
    <div>
      <PencilIcon onClick={onClick} style={{ cursor: "pointer" }} />
    </div>
  );
};