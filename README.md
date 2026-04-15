# Class Extractor (aka: Project Snapshot Tool)

A small tool that collects an entire project or a single file and outputs it as one text suitable for AI inputs, documentation, etc.

---

## What does the tool do?

* scans a project (folder)
* ignores `node_modules`, `dist`, etc.
* reads all relevant files
* packages project structure + source code into **one file** (TXT or Markdown)

Goal:
A **complete snapshot** that can be pasted directly into ChatGPT / LLMs.

---

## Features

* Glob patterns for flexible file selection
* custom ignore list
* token limit (for AI use cases)
* Markdown or TXT export
* simple UI (Electron)

---

## Note

This project was created with the help of AI for performance optimization, bug fixes, and additional ideas.
This tool can extract your entire project including sensitive data.
Always review the output before sharing it.

---

## Usage

```bash
npm install
npm start
```

Then simply:

1. Select folder / file
2. Optionally set filters
3. Export

---

## Output Example

Markdown:

```
# PROJECT SNAPSHOT FOR AI

## 📁 PROJECT STRUCTURE
my-project/
├─ src/
│  ├─ main.js
│  └─ AnotherClass.js
├─ README.md
└─ package.json

## 📄 SOURCE CODE
// src/main.js
export default class Main {
console.log('Hello World');
};
```

---

## Tech

* Electron
* Node.js
* fast-glob

---

## Status

Done.

---

## Maybe later

* better UI
* native mobile version

Or maybe not 🤷‍♂️

---

## Closing

If you need something like this → feel free.