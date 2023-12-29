import { ReactComponent as PencilIcon } from "./icons/pencil.svg";
import { ReactComponent as FilterIcon } from "./icons/filter.svg";

type HeaderIconProps = {
  icon: string;
};

const getIcon = (myString: string) => {
  const handleFilter = () => {
    console.log("icon filter clicked");
  };
  const handlePencil = () => {
    console.log("icon pencil clicked");
  };
  switch (myString) {
    case "filter":
      return (
        <FilterIcon
          onClick={handleFilter}
          style={{ cursor: "pointer" }}
        />
      );
    case "pencil":
      return (
        <PencilIcon
          fill="black"
          onClick={handlePencil}
          style={{ cursor: "pointer" }}
        />
      );
    case "none":
      return null;
    default:
      return null;
  }
};

export const HeaderIconComponent: React.FC<HeaderIconProps> = ({ icon }) => {
  const headerIcon = getIcon(icon);

  return <div>{headerIcon}</div>;
};
