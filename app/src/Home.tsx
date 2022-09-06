import { useSearchDesserts } from "@/api";
import Button from "@opetushallitus/virkailija-ui-components/Button";
import { useState } from "react";
import { FormattedMessage } from "react-intl";
import reactLogo from "./assets/react.svg";

export function Search() {
  console.log(useSearchDesserts({ query: "" }));
  return null;
}

export function Home() {
  const [count, setCount] = useState(0);

  return (
    <>
      <div className="App">
        <div>
          <a href="https://vitejs.dev" target="_blank" rel="noreferrer">
            <img src="/vite.svg" className="logo" alt="Vite logo" />
          </a>
          <a href="https://reactjs.org" target="_blank" rel="noreferrer">
            <img src={reactLogo} className="logo react" alt="React logo" />
          </a>
        </div>
        <h1>
          <FormattedMessage
            defaultMessage="Vite + React"
            description="otsikko"
          />
        </h1>
        <div className="card">
          <Button onClick={() => setCount((count) => count + 1)}>
            count is {count}
          </Button>
          <p>
            Edit <code>src/App.tsx</code> and save to test HMR
          </p>
        </div>
        <p className="read-the-docs">
          Click on the Vite and React logos to learn more
        </p>
      </div>
      <Search />
    </>
  );
}
