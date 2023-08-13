import {
  RecipeRequestInfo,
  useRecipeSessionStore,
} from "@/state/recipeSession";
import CodeMirror, { BasicSetupOptions } from "@uiw/react-codemirror";
import { useDarkMode } from "usehooks-ts";
import { useEffect, useState } from "react";

const codeMirrorSetup: BasicSetupOptions = {
  lineNumbers: true,
  highlightActiveLine: false,
  dropCursor: false,
};

enum CodeView {
  JavaScriptFetch = "Fetch - JavaScript",
  CURL = "cURL",
}
const CodeViews = Object.values(CodeView);

export function RecipeCodeView() {
  const requestInfo = useRecipeSessionStore((state) => state.requestInfo);
  const { isDarkMode } = useDarkMode();
  const [codeView, setCodeView] = useState(CodeView.CURL);
  const [output, setOutput] = useState("Make a request first!");

  useEffect(() => {
    if (!requestInfo) {
      return;
    }

    if (codeView === CodeView.JavaScriptFetch) {
      setOutput(getJavaScriptFetchCode(requestInfo));
    } else if (codeView === CodeView.CURL) {
      setOutput(getCurlCode(requestInfo));
    }
  }, [codeView, requestInfo]);

  return (
    <div className="sm:absolute inset-0 px-4 py-6 overflow-y-auto bg-gray-800 dark:bg-gray-700 text-white">
      <h1 className="text-xl font-bold mb-4">Code</h1>
      <div className="space-x-2 flex items-center mb-4">
        <select
          className="select select-bordered max-w-xs select-sm w-64 h-full"
          value={codeView}
          onChange={(event) => {
            setCodeView(event.target.value as CodeView);
          }}
        >
          {CodeViews.map((view) => {
            return <option key={view}>{view}</option>;
          })}
        </select>
        <button
          onClick={async () => {
            await navigator.clipboard.writeText(output);
            alert("Copied to clipboard");
          }}
          className="px-4 py-2 rounded-md  text-white btn btn-sm  btn-accent h-full"
        >
          Copy
        </button>
      </div>
      <CodeMirror
        className="h-full !outline-none border-none max-w-sm sm:max-w-none"
        value={output}
        basicSetup={codeMirrorSetup}
        readOnly={true}
        theme={isDarkMode ? "dark" : "light"}
        extensions={[]}
      />
    </div>
  );
}

function getJavaScriptFetchCode({
  url,
  payload,
  options: recipeOptions,
}: RecipeRequestInfo) {
  const { headers, method, body: _body } = payload;

  // TODO: Support files

  const methodString = `\tmethod: "${method}"`;
  const headersString = `headers: ${JSON.stringify(headers, null, 2)
    .split("\n")
    .join("\n    ")}`;

  let bodyString = "";
  if (_body) {
    if (typeof _body === "string") {
      bodyString = `body: "${_body}"`;
    } else {
      bodyString = `body: JSON.stringify(${JSON.stringify(_body, null, 2)
        .split("\n")
        .join("\n    ")})`;
    }
  }

  const strings = [methodString, headersString, bodyString];

  const postJsonProcess =
    headers["Content-Type"] === "application/json"
      ? `\n\t.then((res) => res.json())\n\t.then((json) => console.log(json))`
      : "";

  const templateString = `
const options = {
${strings.join(",\n\t")}
};

fetch("${url.toString()}", options)${postJsonProcess};
  `.trim();

  return templateString;
}

function getCurlCode({
  url,
  payload,
  options: recipeOptions,
}: RecipeRequestInfo) {
  const { headers, method, body } = payload;

  const lines = [`\t--url ${url.toString()}`];

  if (headers) {
    for (const [headerName, headerValue] of Object.entries(headers)) {
      lines.push(`\t-H '${headerName}: ${headerValue}'`);
    }
  }

  if (body) {
    if (typeof body === "string") {
      lines.push(`\t-d '${body}'`);
    } else {
      lines.push(
        `\t-d '${JSON.stringify(body, null, 2).split("\n").join("\n    ")}'`
      );
    }
  }

  const templateString = `
curl -X ${method} \\
${lines.join(" \\\n")}
  `.trim();

  return templateString;
}
