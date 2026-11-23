# SoC Playground: build your SoC, verify your SoC

Interactive pages for VLSI engineers. They run in the browser, with no install and no server.
By Anil Reddy Tatigotla.

| Page | What you do |
|---|---|
| `index.html` | Home |
| `missions.html` | 12 guided missions, 12 badges, and trainer challenge links with a hidden bug |
| `build.html` | Drag and drop CPU, DMA, memories, an AXI→APB bridge and APB peripherals onto your chip, with live checks and a block diagram |
| `run.html` | Run software tasks and watch every transfer; interrupt flow and out-of-order AXI reads |
| `verify.html` | Drag-and-drop testbench, bug injection, your own test sequences, coverage closure and an assertion builder |
| `regress.html` | Every bug against every test on your SoC |
| `export.html` | Share link, register spec, SystemVerilog RTL and testbench, and a UVM register model |

All files sit in one folder, with no subfolders, so you can upload them straight from GitHub's "Add file → Upload files" page.
Then turn on GitHub Pages (Settings → Pages → Deploy from branch → main / root).

Logo files: `soc-playground-logo.svg` / `.png` (full logo) and `soc-playground-icon.svg` / `.png` (icon).

Designs, badges and progress are stored in your browser only.
