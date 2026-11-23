# SoC Playground: drag, drop, build and verify your own SoC

Interactive pages for design verification starters. They run in the browser, with no install and no server.

| Page | What you do |
|---|---|
| `index.html` | Home |
| `missions.html` | 12 guided missions, 12 badges, and trainer challenge links with a hidden bug |
| `build.html` | Drag CPU, DMA, SRAM, Boot ROM, DDR, an AXI→APB bridge and APB peripherals onto your chip. Live checks, clock gating, a downloadable block diagram, a quiz made from your design and a guided tour |
| `run.html` | Run software tasks and watch each transfer travel the wires. Step through an interrupt, watch AXI reads return out of order, read AXI/APB waveforms with signal help |
| `verify.html` | Drag-and-drop testbench, bug injection or mystery bug, your own test sequence, coverage closure with random seeds, and an assertion builder that writes SVA |
| `regress.html` | Every bug against every test on your SoC, as a grid |
| `export.html` | Share link, register spec (print/CSV), SystemVerilog package and decoders, APB register RTL with a self-checking testbench, and a UVM register model |

To publish, upload this folder's contents to a GitHub repository and turn on GitHub Pages (Settings → Pages → Deploy from branch → main / root).

Designs, badges and progress are stored in your browser (localStorage) only.
