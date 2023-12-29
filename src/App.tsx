import React, { useState, useRef } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useNavigate,
} from "react-router-dom";
import { Spreadsheet } from "./lib/components/Spreadsheet";
import { Showcase } from "./Showcase";

export const DATA = [
  {
    name: "lele",
    age: 1,
    gender: "m",
    title: "",
    booking: "",
    checkin: "",
    earlyCheckin: "",
    additional: "",
  },
  {
    name: "yeye",
    age: 2,
    gender: "f",
    title: "",
    booking: "",
    checkin: "",
    earlyCheckin: "",
    additional: "",
  },
  {
    name: "hehe",
    age: 3,
    gender: "m",
    title: "",
    booking: "",
    checkin: "",
    earlyCheckin: "",
    additional: "",
  },
];
export const COLUMNS = [
  "name",
  "age",
  "gender",
  "title",
  "booking",
  "checkin",
  "earlyCheckin",
  "additional",
];

function Basic() {
  const navigate = useNavigate();
  const ref = useRef<any>();
  const [titleRef] = useState<Record<string, string[]>>({
    m: ["mr", "sir"],
    f: ["ms", "mrs", "ma'am"],
  });
  return (
    <div>
      <Spreadsheet
        className={"spreadsheet-style"}
        style={{
          fontFamily: "monospace",
          fontWeight: "bolder",
          color: "black",
          backgroundColor: "#D9D9D9",
        }}
        ref={ref}
        sheetData={DATA}
        sheetOption={{
          includes: COLUMNS,
          columnType: {
            age: "number",
            gender: "dropdown",
            title: "dropdown",
            booking: "date",
            checkin: "time",
            earlyCheckin: "checkbox",
            additional: "s_creatable",
          },
          headerIcon: {
            gender: "pencil",
            age: "filter",
          },
          valuesMap: {
            gender: ["m", "f"],
            title: ["mr", "ms", "mrs", "sir", "ma'am"],
          },
          valuesFilter: {
            title: (option, row) => {
              if (!row["gender"]) {
                return true;
              }
              return titleRef[row["gender"].toString()].includes(
                option.toString()
              );
            },
          },
          initialSheetStyle: [
            [
              ":gender-title",
              {
                color: "black",
                background: "#D9D9D9",
                paddingLeft: "0",
                // overflow: 'scroll', // will mess with 's_creatable' and 'dropdown' behavior
                // border: { left: { color: 'blue', width: '25px', }, top: { color: 'blue', width: '25px', }, bottom: { color: 'blue', width: '25px', }, right: { color: 'blue', width: '25px', }, }, // cellstyle border are broken since v4.0.4
              },
            ],
          ],
          headerStyle: {
            color: "black",
            background: "#D2D1B3",
          },
          validateMap: {
            age: [{ fn: () => true, message: "test" }],
          },
          validationCellStyle: {
            color: "black",
            background: "#D9D9D9",
          },
        }}
      />
      <div>
        <button
          onClick={() => {
            ref &&
              ref.current &&
              console.log(ref.current.getStyleState(), "getstylestate");
          }}
        >
          StyleState
        </button>
        <button
          onClick={() => {
            ref && ref.current && ref.current.setFocusState(undefined);
          }}
        >
          Remove Focus
        </button>
        <button
          onClick={() => {
            navigate("/showcase");
          }}
        >
          To Showcases
        </button>
      </div>
    </div>
  );
}
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/showcase" element={<Showcase />} />
        <Route path="/" element={<Basic />} />
        <Route path="*" element={<Basic />} />
      </Routes>
    </Router>
  );
}

export default App;
